import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { getStatusColor } from "../../utils/helpers";

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Geofence polygon coordinates (must match backend)
const GEOFENCE_POLYGON = [
  [36.8200, 10.1800],
  [36.8200, 10.1870],
  [36.8150, 10.1870],
  [36.8150, 10.1800],
];

function createAnimalIcon(animal) {
  const color = getStatusColor(animal.status);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <!-- Pin body -->
      <path d="M18 2 C9.2 2 2 9.2 2 18 C2 28 18 42 18 42 C18 42 34 28 34 18 C34 9.2 26.8 2 18 2Z"
            fill="#0d160d" stroke="${color}" stroke-width="1.5" filter="url(#glow)"/>
      <!-- Center dot -->
      <circle cx="18" cy="18" r="6" fill="${color}" opacity="0.9"/>
      <!-- Emoji -->
      <text x="18" y="22" text-anchor="middle" font-size="10">${animal.emoji}</text>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    popupAnchor: [0, -44],
  });
}

export default function FarmMap({ animals, selectedId, onSelectAnimal }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const geofenceLayerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const center = [36.8175, 10.1835];
    const map = L.map(mapRef.current, {
      center,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile layer (CartoDB Dark Matter)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Zoom control — bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Geofence polygon
    const geofence = L.polygon(GEOFENCE_POLYGON, {
      color: "#4caf6e",
      weight: 1.5,
      opacity: 0.7,
      fillColor: "#4caf6e",
      fillOpacity: 0.06,
      dashArray: "6 4",
    }).addTo(map);

    // Label on geofence
    geofence.bindTooltip("MAIN FARM", {
      permanent: true,
      direction: "center",
      className: "geofence-label",
    });

    geofenceLayerRef.current = geofence;
    mapInstanceRef.current = map;

    // Custom CSS for Leaflet elements
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-container { background: #0a0c0e; font-family: 'Share Tech Mono', monospace; }
      .geofence-label {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        color: #2a4a2a;
        font-family: 'Share Tech Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.2em;
      }
      .leaflet-popup-content-wrapper {
        background: #0d160d;
        border: 1px solid #1e2a1e;
        border-radius: 3px;
        color: #c8d4c0;
        font-family: 'Share Tech Mono', monospace;
        font-size: 11px;
        box-shadow: 0 0 20px rgba(76, 175, 110, 0.15);
      }
      .leaflet-popup-tip { background: #0d160d; }
      .leaflet-control-zoom a {
        background: #0d160d !important;
        color: #4caf6e !important;
        border: 1px solid #1e2a1e !important;
      }
      .leaflet-control-zoom a:hover { background: #1a2a1a !important; }
    `;
    document.head.appendChild(style);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when animals change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || Object.keys(animals).length === 0) return;

    Object.values(animals).forEach((animal) => {
      const { lat, lng } = animal;
      const existing = markersRef.current[animal.id];

      if (existing) {
        // Update position and icon
        existing.setLatLng([lat, lng]);
        existing.setIcon(createAnimalIcon(animal));
        existing.setPopupContent(buildPopupHTML(animal));
      } else {
        // Create new marker
        const marker = L.marker([lat, lng], { icon: createAnimalIcon(animal) })
          .addTo(map)
          .bindPopup(buildPopupHTML(animal), { maxWidth: 220 });

        marker.on("click", () => onSelectAnimal(animal.id));
        markersRef.current[animal.id] = marker;
      }
    });
  }, [animals, onSelectAnimal]);

  // Pan to selected animal
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedId) return;
    const animal = animals[selectedId];
    if (!animal) return;
    map.setView([animal.lat, animal.lng], Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 0.5,
    });
    markersRef.current[selectedId]?.openPopup();
  }, [selectedId, animals]);

  return (
    <div style={styles.wrapper}>
      <div ref={mapRef} style={styles.map} />
      {/* Corner overlay */}
      <div style={styles.overlay}>
        <span style={styles.overlayText}>TERRAIN VIEW · LIVE TRACKING</span>
      </div>
    </div>
  );
}

function buildPopupHTML(animal) {
  const color = getStatusColor(animal.status);
  return `
    <div style="padding:4px 0; min-width:180px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:14px;">${animal.emoji} <strong>${animal.name.toUpperCase()}</strong></span>
        <span style="color:${color};font-size:9px;border:1px solid ${color};padding:1px 4px;">
          ${animal.status.toUpperCase()}
        </span>
      </div>
      <div style="color:#3a5a3a;margin-bottom:4px;font-size:9px;">${animal.type} · ${animal.id}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px;">
        <div><div style="color:#3a5a3a;font-size:8px;">TEMP</div><div>${animal.temperature?.toFixed(1)}°C</div></div>
        <div><div style="color:#3a5a3a;font-size:8px;">HEART RATE</div><div>${animal.heartRate} bpm</div></div>
        <div style="grid-column:span 2"><div style="color:#3a5a3a;font-size:8px;">POSITION</div>
          <div>${animal.lat?.toFixed(5)}, ${animal.lng?.toFixed(5)}</div></div>
      </div>
    </div>
  `;
}

const styles = {
  wrapper: {
    position: "relative",
    flex: 1,
    height: "100%",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    bottom: "10px",
    left: "10px",
    zIndex: 1000,
    pointerEvents: "none",
  },
  overlayText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "8px",
    color: "#2a4a2a",
    letterSpacing: "0.15em",
  },
};
