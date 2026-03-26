/**
 * Mock Data Simulator — with 2-hour pre-seeded history
 */

const { isInsideGeofence, getGeofence } = require("../geofence/geofence");

const UPDATE_INTERVAL = 3000;
const MAX_HISTORY     = 2400;   // 2400 × 3s = 2 hours
const PRESEED_POINTS  = 2400;

const ANIMALS = [
  { id: "A001", name: "Bessie",  type: "Cow",   emoji: "🐄" },
  { id: "A002", name: "Daisy",   type: "Cow",   emoji: "🐄" },
  { id: "A003", name: "Rufus",   type: "Goat",  emoji: "🐐" },
  { id: "A004", name: "Clover",  type: "Sheep", emoji: "🐑" },
  { id: "A005", name: "Bruno",   type: "Bull",  emoji: "🐂" },
];

const VITALS_CONFIG = {
  Cow:   { tempMin: 38.0, tempMax: 39.5, hrMin: 48, hrMax: 84  },
  Goat:  { tempMin: 38.5, tempMax: 40.0, hrMin: 70, hrMax: 135 },
  Sheep: { tempMin: 38.5, tempMax: 40.0, hrMin: 60, hrMax: 120 },
  Bull:  { tempMin: 38.0, tempMax: 39.5, hrMin: 40, hrMax: 80  },
};

let animalsState = {};
let history      = {};

// ---------------------------------------------------------------------------
// Init — builds current state + 2 hours of pre-seeded history
// ---------------------------------------------------------------------------
function initAnimals() {
  const geofence  = getGeofence();
  const centerLat = average(geofence.polygon.map(([lat]) => lat));
  const centerLng = average(geofence.polygon.map(([, lng]) => lng));
  const nowMs     = Date.now();

  ANIMALS.forEach((animal, index) => {
    const config    = VITALS_CONFIG[animal.type];
    const offsetLat = (index - 2) * 0.0005;
    const offsetLng = (index - 2) * 0.0005;

    let simLat  = centerLat + offsetLat;
    let simLng  = centerLng + offsetLng;
    let simTemp = randomInRange(config.tempMin, config.tempMax);
    let simHR   = randomIntInRange(config.hrMin, config.hrMax);

    history[animal.id] = [];

    // Walk from oldest point to newest, building history chronologically
    for (let i = PRESEED_POINTS - 1; i >= 0; i--) {
      const pointMs = nowMs - i * UPDATE_INTERVAL;

      simLat  = clamp(simLat + randomInRange(-0.0002, 0.0002), centerLat - 0.006, centerLat + 0.006);
      simLng  = clamp(simLng + randomInRange(-0.0002, 0.0002), centerLng - 0.006, centerLng + 0.006);

      if (Math.random() < 0.02) simTemp += randomInRange(0.3, 1.0); // occasional spike
      simTemp += randomInRange(-0.04, 0.04);
      simTemp  = clamp(simTemp, config.tempMin - 0.5, config.tempMax + 2.0);

      simHR   += randomIntInRange(-2, 2);
      simHR    = clamp(simHR, config.hrMin - 5, config.hrMax + 20);

      const inside   = isInsideGeofence(simLat, simLng);
      const tempHigh = simTemp > config.tempMax + 0.5;
      const hrHigh   = simHR   > config.hrMax   + 10;
      let   status   = "normal";
      if (!inside)                 status = "alert";
      else if (tempHigh || hrHigh) status = "warning";

      history[animal.id].push({
        timestamp:      new Date(pointMs).toISOString(),
        lat:            parseFloat(simLat.toFixed(6)),
        lng:            parseFloat(simLng.toFixed(6)),
        temperature:    parseFloat(simTemp.toFixed(2)),
        heartRate:      Math.round(simHR),
        insideGeofence: inside,
        status,
      });
    }

    // Current live state continues from last seeded values
    animalsState[animal.id] = {
      ...animal,
      lat:            parseFloat(simLat.toFixed(6)),
      lng:            parseFloat(simLng.toFixed(6)),
      temperature:    parseFloat(simTemp.toFixed(2)),
      heartRate:      Math.round(simHR),
      insideGeofence: isInsideGeofence(simLat, simLng),
      status:         "normal",
      lastUpdate:     new Date().toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Live update
// ---------------------------------------------------------------------------
function updateAnimal(animal) {
  const current = animalsState[animal.id];
  const config  = VITALS_CONFIG[animal.type];

  const shouldEscape = Math.random() < 0.03;
  let newLat = shouldEscape
    ? current.lat + randomInRange(0.004, 0.007) * (Math.random() > 0.5 ? 1 : -1)
    : current.lat + randomInRange(-0.0003, 0.0003);
  let newLng = shouldEscape
    ? current.lng + randomInRange(0.004, 0.007) * (Math.random() > 0.5 ? 1 : -1)
    : current.lng + randomInRange(-0.0003, 0.0003);

  let newTemp = current.temperature + randomInRange(-0.05, 0.05);
  if (Math.random() < 0.02) newTemp += randomInRange(0.5, 1.5);
  newTemp = clamp(newTemp, config.tempMin - 0.5, config.tempMax + 2.0);

  let newHR = clamp(current.heartRate + randomIntInRange(-3, 3), config.hrMin - 5, config.hrMax + 20);

  const inside   = isInsideGeofence(newLat, newLng);
  const tempHigh = newTemp > config.tempMax + 0.5;
  const hrHigh   = newHR   > config.hrMax   + 10;
  let   status   = "normal";
  if (!inside)                 status = "alert";
  else if (tempHigh || hrHigh) status = "warning";

  const updated = {
    ...current,
    lat:            parseFloat(newLat.toFixed(6)),
    lng:            parseFloat(newLng.toFixed(6)),
    temperature:    parseFloat(newTemp.toFixed(2)),
    heartRate:      Math.round(newHR),
    insideGeofence: inside,
    status,
    lastUpdate:     new Date().toISOString(),
  };

  animalsState[animal.id] = updated;

  history[animal.id].push({
    timestamp:      updated.lastUpdate,
    lat:            updated.lat,
    lng:            updated.lng,
    temperature:    updated.temperature,
    heartRate:      updated.heartRate,
    insideGeofence: updated.insideGeofence,
    status:         updated.status,
  });
  if (history[animal.id].length > MAX_HISTORY) history[animal.id].shift();

  return updated;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function startSimulator(io) {
  initAnimals();
  console.log(`[Simulator] Started — ${ANIMALS.length} animals, ${PRESEED_POINTS} history points pre-seeded per animal`);

  setInterval(() => {
    const updates = {};
    const alerts  = [];

    ANIMALS.forEach((animal) => {
      const prev    = animalsState[animal.id];
      const updated = updateAnimal(animal);
      updates[animal.id] = updated;

      if (prev.insideGeofence && !updated.insideGeofence) {
        alerts.push({
          type:       "geofence_breach",
          animalId:   animal.id,
          animalName: animal.name,
          timestamp:  updated.lastUpdate,
          message:    `⚠️ ${animal.name} has left the farm boundaries!`,
        });
      }
    });

    io.emit("animals:update", updates);
    alerts.forEach((alert) => io.emit("animal:alert", alert));
  }, UPDATE_INTERVAL);
}

function getAnimalsState() { return animalsState; }

function getHistory(animalId, limit = 120) {
  if (animalId) return (history[animalId] || []).slice(-limit);
  const result = {};
  Object.keys(history).forEach((id) => { result[id] = history[id].slice(-limit); });
  return result;
}

function randomInRange(min, max)    { return Math.random() * (max - min) + min; }
function randomIntInRange(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(value, min, max)     { return Math.min(Math.max(value, min), max); }
function average(arr)               { return arr.reduce((a, b) => a + b, 0) / arr.length; }

module.exports = { startSimulator, getAnimalsState, getHistory };
