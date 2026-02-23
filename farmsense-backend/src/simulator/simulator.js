/**
 * Mock Data Simulator
 *
 * Simulates 5 farm animals with:
 *  - GPS position that drifts realistically within the farm area
 *  - Temperature readings (normal cattle range: 38.0°C – 39.5°C)
 *  - Heart rate readings (normal cattle range: 40 – 80 bpm)
 *  - Occasional geofence breaches for testing alerts
 *
 * Every UPDATE_INTERVAL ms, new readings are generated and emitted
 * via Socket.IO to all connected frontend clients.
 */

const { isInsideGeofence, GEOFENCE } = require("../geofence/geofence");

const UPDATE_INTERVAL = 3000; // ms between sensor updates

// ---------------------------------------------------------------------------
// Animal definitions
// ---------------------------------------------------------------------------
const ANIMALS = [
  { id: "A001", name: "Bessie",  type: "Cow",   emoji: "🐄" },
  { id: "A002", name: "Daisy",   type: "Cow",   emoji: "🐄" },
  { id: "A003", name: "Rufus",   type: "Goat",  emoji: "🐐" },
  { id: "A004", name: "Clover",  type: "Sheep", emoji: "🐑" },
  { id: "A005", name: "Bruno",   type: "Bull",  emoji: "🐂" },
];

// Normal vital ranges per animal type
const VITALS_CONFIG = {
  Cow:   { tempMin: 38.0, tempMax: 39.5, hrMin: 48, hrMax: 84 },
  Goat:  { tempMin: 38.5, tempMax: 40.0, hrMin: 70, hrMax: 135 },
  Sheep: { tempMin: 38.5, tempMax: 40.0, hrMin: 60, hrMax: 120 },
  Bull:  { tempMin: 38.0, tempMax: 39.5, hrMin: 40, hrMax: 80  },
};

// Internal state
let animalsState = {};  // current reading for each animal
let history = {};       // circular buffer of last 100 readings per animal

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
function initAnimals() {
  // Center of the geofence polygon
  const centerLat = average(GEOFENCE.polygon.map(([lat]) => lat));
  const centerLng = average(GEOFENCE.polygon.map(([, lng]) => lng));

  ANIMALS.forEach((animal, index) => {
    // Spread animals out a little from the center
    const offsetLat = (index - 2) * 0.0005;
    const offsetLng = (index - 2) * 0.0005;

    animalsState[animal.id] = {
      ...animal,
      lat: centerLat + offsetLat,
      lng: centerLng + offsetLng,
      temperature: randomInRange(
        VITALS_CONFIG[animal.type].tempMin,
        VITALS_CONFIG[animal.type].tempMax
      ),
      heartRate: randomIntInRange(
        VITALS_CONFIG[animal.type].hrMin,
        VITALS_CONFIG[animal.type].hrMax
      ),
      insideGeofence: true,
      status: "normal",   // "normal" | "warning" | "alert"
      lastUpdate: new Date().toISOString(),
    };

    history[animal.id] = [];
  });
}

// ---------------------------------------------------------------------------
// Update logic (called every UPDATE_INTERVAL)
// ---------------------------------------------------------------------------
function updateAnimal(animal) {
  const current = animalsState[animal.id];
  const config = VITALS_CONFIG[animal.type];

  // --- GPS drift ---
  // Most of the time animals move slightly. Occasionally one "escapes".
  const shouldEscape = Math.random() < 0.03; // 3% chance per tick
  let newLat, newLng;

  if (shouldEscape) {
    // Move outside geofence boundaries
    newLat = current.lat + randomInRange(0.004, 0.007) * (Math.random() > 0.5 ? 1 : -1);
    newLng = current.lng + randomInRange(0.004, 0.007) * (Math.random() > 0.5 ? 1 : -1);
  } else {
    // Normal drift — small steps
    newLat = current.lat + randomInRange(-0.0003, 0.0003);
    newLng = current.lng + randomInRange(-0.0003, 0.0003);
  }

  // --- Temperature ---
  // Slowly drifts up or down, occasionally spikes (fever simulation)
  const feverSpike = Math.random() < 0.02;
  let newTemp = current.temperature + randomInRange(-0.05, 0.05);
  if (feverSpike) newTemp += randomInRange(0.5, 1.5);
  newTemp = clamp(newTemp, config.tempMin - 0.5, config.tempMax + 2.0);

  // --- Heart rate ---
  let newHR = current.heartRate + randomIntInRange(-3, 3);
  newHR = clamp(newHR, config.hrMin - 5, config.hrMax + 20);

  // --- Geofence check ---
  const inside = isInsideGeofence(newLat, newLng);

  // --- Status computation ---
  const tempHigh = newTemp > config.tempMax + 0.5;
  const hrHigh = newHR > config.hrMax + 10;
  let status = "normal";
  if (!inside) status = "alert";
  else if (tempHigh || hrHigh) status = "warning";

  const updatedAnimal = {
    ...current,
    lat: parseFloat(newLat.toFixed(6)),
    lng: parseFloat(newLng.toFixed(6)),
    temperature: parseFloat(newTemp.toFixed(2)),
    heartRate: Math.round(newHR),
    insideGeofence: inside,
    status,
    lastUpdate: new Date().toISOString(),
  };

  // Store in state
  animalsState[animal.id] = updatedAnimal;

  // Append to history (keep last 100 readings)
  history[animal.id].push({
    timestamp: updatedAnimal.lastUpdate,
    lat: updatedAnimal.lat,
    lng: updatedAnimal.lng,
    temperature: updatedAnimal.temperature,
    heartRate: updatedAnimal.heartRate,
    insideGeofence: updatedAnimal.insideGeofence,
    status: updatedAnimal.status,
  });
  if (history[animal.id].length > 100) history[animal.id].shift();

  return updatedAnimal;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start the simulator loop. Emits Socket.IO events:
 *  - "animals:update"  — full state of all animals (every tick)
 *  - "animal:alert"    — fired when an animal leaves the geofence
 */
function startSimulator(io) {
  initAnimals();
  console.log(`[Simulator] Started — updating ${ANIMALS.length} animals every ${UPDATE_INTERVAL}ms`);

  setInterval(() => {
    const updates = {};
    const alerts = [];

    ANIMALS.forEach((animal) => {
      const prev = animalsState[animal.id];
      const updated = updateAnimal(animal);
      updates[animal.id] = updated;

      // Detect geofence breach transition (was inside, now outside)
      if (prev.insideGeofence && !updated.insideGeofence) {
        alerts.push({
          type: "geofence_breach",
          animalId: animal.id,
          animalName: animal.name,
          timestamp: updated.lastUpdate,
          message: `⚠️ ${animal.name} has left the farm boundaries!`,
        });
      }
    });

    // Emit current state to all clients
    io.emit("animals:update", updates);

    // Emit any alerts separately so the frontend can show notifications
    alerts.forEach((alert) => {
      io.emit("animal:alert", alert);
    });
  }, UPDATE_INTERVAL);
}

/** Returns the current snapshot of all animals */
function getAnimalsState() {
  return animalsState;
}

/** Returns history for one animal (or all if no id given) */
function getHistory(animalId, limit = 50) {
  if (animalId) {
    return (history[animalId] || []).slice(-limit);
  }
  // Return history for all animals
  const result = {};
  Object.keys(history).forEach((id) => {
    result[id] = history[id].slice(-limit);
  });
  return result;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomIntInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

module.exports = { startSimulator, getAnimalsState, getHistory };
