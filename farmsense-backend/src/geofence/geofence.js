/**
 * Geofence module
 *
 * Defines the farm boundary as a polygon (lat/lng coordinates)
 * and provides a function to check if a point is inside it.
 *
 * The algorithm used is the Ray Casting method — standard for
 * point-in-polygon checks on geographic coordinates.
 */

// Live geofence state — mutable so the UI can update it at runtime
let _geofence = {
  name: "Main Farm",
  // Each point is [latitude, longitude]
  polygon: [
    [36.8200, 10.1800],
    [36.8200, 10.1870],
    [36.8150, 10.1870],
    [36.8150, 10.1800],
  ],
};

// Getter always returns the current live state
const GEOFENCE = new Proxy({}, {
  get(_, key) { return _geofence[key]; },
});

/**
 * Update the geofence polygon at runtime.
 * @param {Array} newPolygon - array of [lat, lng] pairs
 * @param {string} [name] - optional new name
 */
function updateGeofence(newPolygon, name) {
  _geofence = {
    name: name || _geofence.name,
    polygon: newPolygon,
  };
}

function getGeofence() {
  return { ..._geofence };
}

/**
 * Ray casting algorithm to check if a point is inside a polygon.
 * @param {number} lat
 * @param {number} lng
 * @param {Array} polygon - array of [lat, lng] pairs
 * @returns {boolean}
 */
function isInsideGeofence(lat, lng, polygon = GEOFENCE.polygon) {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

module.exports = { GEOFENCE, isInsideGeofence, updateGeofence, getGeofence };
