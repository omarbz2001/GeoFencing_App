/**
 * Geofence module
 *
 * Polygon is persisted to geofence.json next to this file so it survives
 * server restarts. Falls back to the hardcoded default on first run.
 *
 * Breach detection uses the Ray Casting algorithm.
 */

const fs   = require("fs");
const path = require("path");

const PERSIST_FILE = path.join(__dirname, "geofence.json");

const DEFAULT_POLYGON = [
  [36.8200, 10.1800],
  [36.8200, 10.1870],
  [36.8150, 10.1870],
  [36.8150, 10.1800],
];

// ---------------------------------------------------------------------------
// Load from disk (or use default on first run)
// ---------------------------------------------------------------------------
function loadFromDisk() {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const raw  = fs.readFileSync(PERSIST_FILE, "utf8");
      const data = JSON.parse(raw);
      if (data?.polygon?.length >= 3) {
        console.log("[Geofence] Loaded from disk:", PERSIST_FILE);
        return data;
      }
    }
  } catch (err) {
    console.warn("[Geofence] Could not read persist file, using default:", err.message);
  }
  return { name: "Main Farm", polygon: DEFAULT_POLYGON };
}

// ---------------------------------------------------------------------------
// Save to disk (synchronous — only called on explicit user save, not hot path)
// ---------------------------------------------------------------------------
function saveToDisk(geofence) {
  try {
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(geofence, null, 2), "utf8");
  } catch (err) {
    console.error("[Geofence] Failed to persist to disk:", err.message);
    throw err; // bubble up so the HTTP route can return a 500
  }
}

// ---------------------------------------------------------------------------
// In-memory state — initialized from disk
// ---------------------------------------------------------------------------
let _geofence = loadFromDisk();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns a deep copy of the current geofence (safe to send over HTTP/socket) */
function getGeofence() {
  return {
    name:    _geofence.name,
    polygon: _geofence.polygon.map(p => [...p]),
  };
}

/**
 * Update the geofence polygon and persist it to disk.
 * Throws if the disk write fails.
 */
function updateGeofence(newPolygon, name) {
  _geofence = {
    name:    name || _geofence.name,
    polygon: newPolygon,
  };
  saveToDisk(_geofence);
}

// ---------------------------------------------------------------------------
// Ray casting — point-in-polygon
// ---------------------------------------------------------------------------
function isInsideGeofence(lat, lng) {
  // Always read _geofence.polygon directly so we use the latest saved shape
  const polygon = _geofence.polygon;
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect =
      (yi > lng) !== (yj > lng) &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

module.exports = { getGeofence, updateGeofence, isInsideGeofence };
