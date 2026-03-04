const express = require("express");
const router  = express.Router();
const { getGeofence, updateGeofence } = require("../geofence/geofence");

/**
 * GET /api/geofence
 * Returns the current geofence.
 * Frontend calls this on mount — no socket dependency.
 */
router.get("/", (req, res) => {
  res.json({ success: true, geofence: getGeofence() });
});

/**
 * POST /api/geofence
 * Validates, persists, then broadcasts to ALL OTHER clients via socket.
 * The saving client applies the change immediately from the HTTP response —
 * it does NOT wait for the socket echo. This makes save fully deterministic.
 *
 * Body: { polygon: [[lat, lng], ...], name?: string }
 */
router.post("/", (req, res) => {
  const { polygon, name } = req.body;

  // --- Validation ---
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({
      success: false,
      message: "polygon must be an array of at least 3 [lat, lng] points",
    });
  }
  for (const pt of polygon) {
    if (!Array.isArray(pt) || pt.length !== 2 ||
        typeof pt[0] !== "number" || typeof pt[1] !== "number") {
      return res.status(400).json({
        success: false,
        message: "Each point must be [lat: number, lng: number]",
      });
    }
  }

  // --- Persist ---
  try {
    updateGeofence(polygon, name);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to persist geofence" });
  }

  const updated = getGeofence();

  // Broadcast to all OTHER connected clients (not the one that saved)
  // so their maps update in real time.
  if (req.io && req.socketId) {
    req.socket.broadcast.emit("geofence:updated", updated);
  } else if (req.io) {
    // Fallback: broadcast to everyone (saving client will ignore it — see frontend)
    req.io.emit("geofence:updated", updated);
  }

  console.log(`[Geofence] Saved — ${polygon.length} points`);

  // Return the clean saved geofence — frontend applies this directly,
  // no socket round-trip needed.
  res.json({ success: true, geofence: updated });
});

module.exports = router;
