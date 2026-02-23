export const STATUS_COLORS = {
  normal: "#4caf6e",
  warning: "#e8a020",
  alert: "#e84040",
};

export const STATUS_LABELS = {
  normal: "NOMINAL",
  warning: "WARNING",
  alert: "BREACH",
};

export function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.normal;
}

export function formatTemp(val) {
  return val !== undefined ? `${val.toFixed(1)}°C` : "--";
}

export function formatHR(val) {
  return val !== undefined ? `${val} bpm` : "--";
}

export function formatCoords(lat, lng) {
  if (lat === undefined || lng === undefined) return "--";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function timeSince(isoString) {
  if (!isoString) return "--";
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}
