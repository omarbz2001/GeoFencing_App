const fs   = require("fs");
const path = require("path");

const PERSIST_FILE = path.join(__dirname, "geofence.json");

const DEFAULT_POLYGON = [
  [36.8200, 10.1800],
  [36.8200, 10.1870],
  [36.8150, 10.1870],
  [36.8150, 10.1800],
];

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

function saveToDisk(geofence) {
  try {
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(geofence, null, 2), "utf8");
  } catch (err) {
    console.error("[Geofence] Failed to persist to disk:", err.message);
    throw err;
  }
}

let _geofence = loadFromDisk();

function getGeofence() {
  return {
    name:    _geofence.name,
    polygon: _geofence.polygon.map(p => [...p]),
  };
}

function updateGeofence(newPolygon, name) {
  _geofence = { name: name || _geofence.name, polygon: newPolygon };
  saveToDisk(_geofence);
}

// ---------------------------------------------------------------------------
// Ray casting — point-in-polygon
//
// Polygon points are stored as [lat, lng].
// We treat lat as Y axis and lng as X axis.
//
// FIX: the previous version had axes swapped:
//   - it destructured [yi, xi] = polygon[i]  (lat=y, lng=x — correct)
//   - but then checked (yi > lng)             (comparing lat to lng — WRONG)
//   - should be       (xi > lng)              (comparing lng to lng — correct)
// This caused every animal to be reported as outside the geofence.
// ---------------------------------------------------------------------------
function isInsideGeofence(lat, lng) {
  const polygon = _geofence.polygon;
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [latI, lngI] = polygon[i];   // lat = Y, lng = X
    const [latJ, lngJ] = polygon[j];

    // Check if the horizontal ray from (lat, lng) crosses this edge
    const intersect =
      (lngI > lng) !== (lngJ > lng) &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;

    if (intersect) inside = !inside;
  }
  return inside;
}

module.exports = { getGeofence, updateGeofence, isInsideGeofence };
