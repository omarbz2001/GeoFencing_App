const express = require("express");
const router = express.Router();
const { getGeofence, updateGeofence } = require("../geofence/geofence");

/**
 * GET /api/geofence
 * Returns the current geofence polygon
 */
router.get("/", (req, res) => {
  res.json({ success: true, geofence: getGeofence() });
});

/**
 * POST /api/geofence
 * Updates the geofence polygon.
 *
 * Body: { polygon: [[lat, lng], ...], name?: string }
 *
 * After updating, the server emits "geofence:updated" via Socket.IO
 * so all connected dashboards sync immediately.
 */
router.post("/", (req, res) => {
  const { polygon, name } = req.body;

  // Validation
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({
      success: false,
      message: "polygon must be an array of at least 3 [lat, lng] points",
    });
  }

  for (const point of polygon) {
    if (
      !Array.isArray(point) || point.length !== 2 ||
      typeof point[0] !== "number" || typeof point[1] !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message: "Each point must be [lat: number, lng: number]",
      });
    }
  }

  updateGeofence(polygon, name);
  const updated = getGeofence();

  // Emit to all connected Socket.IO clients — attached in index.js
  if (req.io) {
    req.io.emit("geofence:updated", updated);
  }

  console.log(`[Geofence] Updated — ${polygon.length} points`);
  res.json({ success: true, geofence: updated });
});

module.exports = router;
