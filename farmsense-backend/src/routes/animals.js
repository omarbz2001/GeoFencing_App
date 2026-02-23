const express = require("express");
const router = express.Router();
const { getAnimalsState, getHistory } = require("../simulator/simulator");
const { GEOFENCE } = require("../geofence/geofence");

/**
 * GET /api/animals
 * Returns current state of all animals
 */
router.get("/", (req, res) => {
  const state = getAnimalsState();
  res.json({
    success: true,
    count: Object.keys(state).length,
    animals: Object.values(state),
  });
});

/**
 * GET /api/animals/:id
 * Returns current state of a single animal
 */
router.get("/:id", (req, res) => {
  const state = getAnimalsState();
  const animal = state[req.params.id];
  if (!animal) {
    return res.status(404).json({ success: false, message: "Animal not found" });
  }
  res.json({ success: true, animal });
});

/**
 * GET /api/animals/:id/history?limit=50
 * Returns time-series history for an animal
 */
router.get("/:id/history", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const history = getHistory(req.params.id, limit);
  if (!history) {
    return res.status(404).json({ success: false, message: "Animal not found" });
  }
  res.json({ success: true, animalId: req.params.id, count: history.length, history });
});

/**
 * GET /api/animals/geofence/info
 * Returns the geofence polygon definition
 */
router.get("/geofence/info", (req, res) => {
  res.json({ success: true, geofence: GEOFENCE });
});

module.exports = router;
