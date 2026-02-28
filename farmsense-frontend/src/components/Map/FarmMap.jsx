import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { getStatusColor } from "../../utils/helpers";

// ---------------------------------------------------------------------------
// Leaflet default icon fix
// ---------------------------------------------------------------------------
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BACKEND_URL = "http://localhost:3001";
const DEFAULT_POLYGON = [
  [36.8200, 10.1800],
  [36.8200, 10.1870],
  [36.8150, 10.1870],
  [36.8150, 10.1800],
];

// ---------------------------------------------------------------------------
// Animal marker icon
// ---------------------------------------------------------------------------
function createAnimalIcon(animal) {
  const color = getStatusColor(animal.status);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <defs>
        <filter id="glow-${animal.id}">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M18 2 C9.2 2 2 9.2 2 18 C2 28 18 42 18 42 C18 42 34 28 34 18 C34 9.2 26.8 2 18 2Z"
            fill="#0d160d" stroke="${color}" stroke-width="1.5" filter="url(#glow-${animal.id})"/>
      <circle cx="18" cy="18" r="6" fill="${color}" opacity="0.9"/>
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

// ---------------------------------------------------------------------------
// Draggable corner handle icon
// ---------------------------------------------------------------------------
function createHandleIcon(index, isActive) {
  const size = isActive ? 18 : 14;
  const html = `
    <div style="
      width:${size}px; height:${size}px;
      border-radius: 50%;
      background: #080c08;
      border: 2px solid ${isActive ? "#fff" : "#4caf6e"};
      box-shadow: 0 0 ${isActive ? "10px" : "6px"} ${isActive ? "#ffffff88" : "#4caf6e88"};
      cursor: grab;
      transition: all 0.15s;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Share Tech Mono', monospace;
      font-size: 7px;
      color: ${isActive ? "#fff" : "#4caf6e"};
    ">${index + 1}</div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function FarmMap({ animals, selectedId, onSelectAnimal, socket }) {
  const mapRef           = useRef(null);
  const mapInstanceRef   = useRef(null);
  const markersRef       = useRef({});
  const geofenceRef      = useRef(null);  // L.polygon for the zone
  const handleMarkersRef = useRef([]);    // draggable corner handles
  const polygonRef       = useRef(DEFAULT_POLYGON.map(p => [...p])); // live editable copy

  const [editMode, setEditMode]         = useState(false);
  const [polygon, setPolygon]           = useState(DEFAULT_POLYGON);
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState(null); // "SAVED" | "ERROR"
  const [activeHandle, setActiveHandle] = useState(null);

  // -------------------------------------------------------------------
  // Map initialization
  // -------------------------------------------------------------------
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [36.8175, 10.1835],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Draw initial geofence polygon
    const geoLayer = L.polygon(polygonRef.current, {
      color: "#4caf6e",
      weight: 1.5,
      opacity: 0.8,
      fillColor: "#4caf6e",
      fillOpacity: 0.06,
      dashArray: "6 4",
    }).addTo(map);

    geoLayer.bindTooltip("MAIN FARM", {
      permanent: true,
      direction: "center",
      className: "geofence-label",
    });

    geofenceRef.current = geoLayer;
    mapInstanceRef.current = map;

    // Leaflet custom styles
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-container { background: #0a0c0e; font-family: 'Share Tech Mono', monospace; }
      .geofence-label {
        background: transparent !important; border: none !important;
        box-shadow: none !important; color: #2a4a2a;
        font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 0.2em;
      }
      .geofence-label.edit-mode { color: #6aaf8e !important; }
      .leaflet-popup-content-wrapper {
        background: #0d160d; border: 1px solid #1e2a1e; border-radius: 3px;
        color: #c8d4c0; font-family: 'Share Tech Mono', monospace; font-size: 11px;
        box-shadow: 0 0 20px rgba(76,175,110,0.15);
      }
      .leaflet-popup-tip { background: #0d160d; }
      .leaflet-control-zoom a {
        background: #0d160d !important; color: #4caf6e !important;
        border: 1px solid #1e2a1e !important;
      }
      .leaflet-control-zoom a:hover { background: #1a2a1a !important; }
    `;
    document.head.appendChild(style);

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // -------------------------------------------------------------------
  // Sync geofence from socket ("geofence:updated" from backend)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data?.polygon) {
        polygonRef.current = data.polygon.map(p => [...p]);
        setPolygon(data.polygon.map(p => [...p]));
        geofenceRef.current?.setLatLngs(data.polygon);
      }
    };
    socket.on("geofence:updated", handler);
    return () => socket.off("geofence:updated", handler);
  }, [socket]);

  // -------------------------------------------------------------------
  // Edit mode — add / remove draggable handles
  // -------------------------------------------------------------------
  const buildHandles = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old handles
    handleMarkersRef.current.forEach(m => m.remove());
    handleMarkersRef.current = [];

    polygonRef.current.forEach((point, index) => {
      const handle = L.marker([point[0], point[1]], {
        icon: createHandleIcon(index, false),
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(map);

      handle.on("dragstart", () => {
        setActiveHandle(index);
        handle.setIcon(createHandleIcon(index, true));
        // Disable map drag while handle is being dragged
        map.dragging.disable();
      });

      handle.on("drag", (e) => {
        const { lat, lng } = e.target.getLatLng();
        polygonRef.current[index] = [lat, lng];
        geofenceRef.current?.setLatLngs(polygonRef.current);
        setPolygon(polygonRef.current.map(p => [...p]));
      });

      handle.on("dragend", () => {
        setActiveHandle(null);
        handle.setIcon(createHandleIcon(index, false));
        map.dragging.enable();
      });

      handleMarkersRef.current.push(handle);
    });
  }, []);

  const removeHandles = useCallback(() => {
    handleMarkersRef.current.forEach(m => m.remove());
    handleMarkersRef.current = [];
    setActiveHandle(null);
  }, []);

  useEffect(() => {
    const layer = geofenceRef.current;
    if (!layer) return;

    if (editMode) {
      // Pulse the polygon border to signal edit mode
      layer.setStyle({
        color: "#6adf9e",
        weight: 2,
        dashArray: "4 3",
        fillOpacity: 0.1,
      });
      layer.getTooltip()?.getElement()?.classList.add("edit-mode");
      buildHandles();
    } else {
      layer.setStyle({
        color: "#4caf6e",
        weight: 1.5,
        dashArray: "6 4",
        fillOpacity: 0.06,
      });
      layer.getTooltip()?.getElement()?.classList.remove("edit-mode");
      removeHandles();
    }
  }, [editMode, buildHandles, removeHandles]);

  // -------------------------------------------------------------------
  // Save geofence to backend
  // -------------------------------------------------------------------
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/geofence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ polygon: polygonRef.current }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg("SAVED");
        setEditMode(false);
      } else {
        setSaveMsg("ERROR");
      }
    } catch {
      setSaveMsg("ERROR");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  // -------------------------------------------------------------------
  // Cancel edit — restore last saved polygon
  // -------------------------------------------------------------------
  const handleCancel = () => {
    polygonRef.current = polygon.map(p => [...p]);
    geofenceRef.current?.setLatLngs(polygonRef.current);
    setEditMode(false);
  };

  // -------------------------------------------------------------------
  // Animal markers
  // -------------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || Object.keys(animals).length === 0) return;

    Object.values(animals).forEach((animal) => {
      const existing = markersRef.current[animal.id];
      if (existing) {
        existing.setLatLng([animal.lat, animal.lng]);
        existing.setIcon(createAnimalIcon(animal));
        existing.setPopupContent(buildPopupHTML(animal));
      } else {
        const marker = L.marker([animal.lat, animal.lng], { icon: createAnimalIcon(animal) })
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
      animate: true, duration: 0.5,
    });
    markersRef.current[selectedId]?.openPopup();
  }, [selectedId, animals]);

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <div style={styles.wrapper}>
      <div ref={mapRef} style={styles.map} />

      {/* ── Edit-mode toolbar ── */}
      {editMode ? (
        <div style={styles.editBar}>
          <div style={styles.editBarLeft}>
            <span style={styles.editBadge}>✎ EDIT MODE</span>
            <span style={styles.editHint}>Drag corner handles to reshape the zone</span>
          </div>
          <div style={styles.editBarRight}>
            <button style={styles.btnCancel} onClick={handleCancel}>CANCEL</button>
            <button
              style={{ ...styles.btnSave, opacity: saving ? 0.6 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "SAVING..." : "SAVE ZONE"}
            </button>
          </div>
        </div>
      ) : (
        <button style={styles.editBtn} onClick={() => setEditMode(true)}>
          ✎ EDIT ZONE
        </button>
      )}

      {/* ── Coordinates readout during editing ── */}
      {editMode && (
        <div style={styles.coordPanel}>
          <div style={styles.coordTitle}>POLYGON VERTICES</div>
          {polygon.map((pt, i) => (
            <div key={i} style={{
              ...styles.coordRow,
              color: activeHandle === i ? "#6adf9e" : "#3a6a4a",
            }}>
              <span style={styles.coordIdx}>{i + 1}</span>
              <span>{pt[0].toFixed(5)}</span>
              <span style={styles.coordSep}>,</span>
              <span>{pt[1].toFixed(5)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Save feedback toast ── */}
      {saveMsg && (
        <div style={{
          ...styles.saveToast,
          borderColor: saveMsg === "SAVED" ? "#4caf6e" : "#e84040",
          color:       saveMsg === "SAVED" ? "#4caf6e" : "#e84040",
        }}>
          {saveMsg === "SAVED" ? "✓ ZONE UPDATED" : "✗ SAVE FAILED"}
        </div>
      )}

      {/* ── Bottom-left watermark ── */}
      <div style={styles.watermark}>
        <span style={styles.watermarkText}>TERRAIN VIEW · LIVE TRACKING</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popup HTML
// ---------------------------------------------------------------------------
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
    </div>`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
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
  // Edit zone button (view mode)
  editBtn: {
    position: "absolute",
    top: "12px",
    right: "12px",
    zIndex: 1000,
    background: "#080c08",
    border: "1px solid #2a5a3a",
    color: "#4caf6e",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.12em",
    padding: "6px 14px",
    cursor: "pointer",
    borderRadius: "2px",
    transition: "all 0.2s",
    boxShadow: "0 0 12px rgba(76,175,110,0.15)",
  },
  // Toolbar shown in edit mode
  editBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    background: "rgba(8,12,8,0.92)",
    borderBottom: "1px solid #2a5a3a",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px",
    backdropFilter: "blur(4px)",
  },
  editBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  editBadge: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "10px",
    color: "#6adf9e",
    letterSpacing: "0.12em",
    background: "rgba(76,175,110,0.12)",
    border: "1px solid #2a5a3a",
    padding: "3px 8px",
    borderRadius: "2px",
  },
  editHint: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    color: "#3a5a3a",
    letterSpacing: "0.08em",
  },
  editBarRight: {
    display: "flex",
    gap: "8px",
  },
  btnCancel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.1em",
    background: "transparent",
    border: "1px solid #2a3a2a",
    color: "#4a6a4a",
    padding: "5px 14px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  btnSave: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.1em",
    background: "#0d2a1a",
    border: "1px solid #4caf6e",
    color: "#4caf6e",
    padding: "5px 16px",
    cursor: "pointer",
    borderRadius: "2px",
    boxShadow: "0 0 10px rgba(76,175,110,0.2)",
  },
  // Coordinate readout panel
  coordPanel: {
    position: "absolute",
    bottom: "30px",
    left: "12px",
    zIndex: 1000,
    background: "rgba(8,12,8,0.88)",
    border: "1px solid #1e3a1e",
    padding: "8px 12px",
    borderRadius: "2px",
    backdropFilter: "blur(4px)",
    minWidth: "200px",
  },
  coordTitle: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "7px",
    color: "#2a5a2a",
    letterSpacing: "0.15em",
    marginBottom: "6px",
  },
  coordRow: {
    display: "flex",
    gap: "4px",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    lineHeight: 1.7,
    transition: "color 0.2s",
  },
  coordIdx: {
    color: "#2a5a2a",
    width: "12px",
  },
  coordSep: {
    color: "#1a3a1a",
  },
  // Save feedback
  saveToast: {
    position: "absolute",
    top: "60px",
    right: "12px",
    zIndex: 1002,
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.12em",
    background: "#080c08",
    border: "1px solid",
    padding: "6px 14px",
    borderRadius: "2px",
    animation: "fadeInOut 3s ease forwards",
  },
  watermark: {
    position: "absolute",
    bottom: "10px",
    left: "10px",
    zIndex: 1000,
    pointerEvents: "none",
  },
  watermarkText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "8px",
    color: "#2a4a2a",
    letterSpacing: "0.15em",
  },
};
