import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { getStatusColor } from "../../utils/helpers";

// Fix Leaflet default marker icon paths (broken by webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl:       require("leaflet/dist/images/marker-icon.png"),
  shadowUrl:     require("leaflet/dist/images/marker-shadow.png"),
});

const BACKEND_URL     = "http://localhost:3001";
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
  const html = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">',
    '<defs><filter id="g' + animal.id + '">',
    '<feGaussianBlur stdDeviation="1.5" result="b"/>',
    '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>',
    '</filter></defs>',
    '<path d="M18 2C9.2 2 2 9.2 2 18c0 10 16 24 16 24s16-14 16-24C34 9.2 26.8 2 18 2z"',
    ' fill="#0d160d" stroke="' + color + '" stroke-width="1.5" filter="url(#g' + animal.id + ')"/>',
    '<circle cx="18" cy="18" r="6" fill="' + color + '" opacity="0.9"/>',
    '<text x="18" y="22" text-anchor="middle" font-size="10">' + animal.emoji + '</text>',
    '</svg>',
  ].join("");
  return L.divIcon({
    html, className: "",
    iconSize: [36, 44], iconAnchor: [18, 42], popupAnchor: [0, -44],
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function FarmMap({ animals, selectedId, onSelectAnimal, socket }) {
  const mapRef        = useRef(null);
  const mapInstance   = useRef(null);
  const editableLayer = useRef(null);   // L.FeatureGroup — contains the geofence polygon
  const drawControl   = useRef(null);   // L.Control.Draw instance
  const animalMarkers = useRef({});
  const savedPolygon  = useRef(null);   // last successfully saved polygon
  const isEditing     = useRef(false);
  const pannedForId   = useRef(null);    // tracks which selectedId we already panned to

  const [editMode,  setEditMode]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState(null);
  const [loadError, setLoadError] = useState(false);

  // ---------------------------------------------------------------------------
  // applyPolygon — clears the FeatureGroup and draws a fresh polygon
  // ---------------------------------------------------------------------------
  const applyPolygon = useCallback((pts) => {
    if (!editableLayer.current) return;
    editableLayer.current.clearLayers();
    const poly = L.polygon(pts, {
      color: "#4caf6e", weight: 2, opacity: 0.85,
      fillColor: "#4caf6e", fillOpacity: 0.08, dashArray: "6 4",
    });
    poly.bindTooltip("MAIN FARM", {
      permanent: true, direction: "center", className: "geofence-label",
    });
    editableLayer.current.addLayer(poly);
  }, []);

  // ---------------------------------------------------------------------------
  // getLatLngsFlat — read current polygon coords from the FeatureGroup
  // ---------------------------------------------------------------------------
  const getLatLngsFlat = useCallback(() => {
    const layers = editableLayer.current?.getLayers();
    if (!layers?.length) return null;
    const lls  = layers[0].getLatLngs();
    const ring = Array.isArray(lls[0]) ? lls[0] : lls;
    return ring.map(ll => [ll.lat, ll.lng]);
  }, []);

  // ---------------------------------------------------------------------------
  // STEP 1 — Load polygon via HTTP GET on mount (deterministic, no socket race)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    fetch(BACKEND_URL + "/api/geofence")
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const pts = (data?.geofence?.polygon?.length >= 3)
          ? data.geofence.polygon
          : DEFAULT_POLYGON;
        savedPolygon.current = pts.map(p => [...p]);
        applyPolygon(pts);
      })
      .catch(() => {
        if (cancelled) return;
        savedPolygon.current = DEFAULT_POLYGON.map(p => [...p]);
        applyPolygon(DEFAULT_POLYGON);
        setLoadError(true);
      });
    return () => { cancelled = true; };
  }, [applyPolygon]);

  // ---------------------------------------------------------------------------
  // STEP 2 — Map + Leaflet.draw initialization (runs once)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mapInstance.current) return;

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

    // FeatureGroup that Leaflet.draw manages
    const fGroup = new L.FeatureGroup().addTo(map);
    editableLayer.current = fGroup;

    // Draw placeholder polygon — HTTP load will replace it shortly
    applyPolygon(DEFAULT_POLYGON);

    // Leaflet.draw control — edit only, no new shape drawing, no delete
    const dc = new L.Control.Draw({
      position: "topright",
      draw: false,
      edit: { featureGroup: fGroup, remove: false },
    });
    drawControl.current = dc;

    mapInstance.current = map;

    // Style overrides
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-container { background:#0a0c0e; font-family:'Share Tech Mono',monospace; }
      .geofence-label {
        background:transparent!important; border:none!important;
        box-shadow:none!important; color:#2a4a2a;
        font-family:'Share Tech Mono',monospace; font-size:10px; letter-spacing:.2em;
      }
      .leaflet-popup-content-wrapper {
        background:#0d160d; border:1px solid #1e2a1e; border-radius:3px; color:#c8d4c0;
        font-family:'Share Tech Mono',monospace; font-size:11px;
        box-shadow:0 0 20px rgba(76,175,110,.15);
      }
      .leaflet-popup-tip { background:#0d160d; }
      .leaflet-control-zoom a {
        background:#0d160d!important; color:#4caf6e!important; border:1px solid #1e2a1e!important;
      }
      .leaflet-control-zoom a:hover { background:#1a2a1a!important; }
      .leaflet-draw.leaflet-control { display:none!important; }
      .leaflet-editing-icon {
        border-radius:50%!important;
        background:#080c08!important;
        border:2px solid #4caf6e!important;
        box-shadow:0 0 8px rgba(76,175,110,0.6)!important;
        width:10px!important; height:10px!important;
        margin-left:-5px!important; margin-top:-5px!important;
      }
      .leaflet-editing-icon:hover {
        background:#1a3a1a!important;
        border-color:#6adf9e!important;
        box-shadow:0 0 14px rgba(106,223,158,0.8)!important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [applyPolygon]);

  // ---------------------------------------------------------------------------
  // STEP 3 — Toggle Leaflet.draw edit mode when editMode state changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapInstance.current || !drawControl.current) return;

    if (editMode) {
      isEditing.current = true;
      editableLayer.current?.eachLayer(layer => {
        layer.editing?.enable();
        layer.setStyle?.({ color:"#6adf9e", weight:2.5, dashArray:"4 3", fillOpacity:0.12 });
      });
    } else {
      editableLayer.current?.eachLayer(layer => {
        layer.editing?.disable();
        layer.setStyle?.({ color:"#4caf6e", weight:2, dashArray:"6 4", fillOpacity:0.08 });
      });
      isEditing.current = false;
    }
  }, [editMode]);

  // ---------------------------------------------------------------------------
  // STEP 4 — Socket: only apply updates from OTHER clients, not our own saves
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (!data?.polygon || isEditing.current) return;
      savedPolygon.current = data.polygon.map(p => [...p]);
      applyPolygon(data.polygon);
    };
    socket.on("geofence:updated", handler);
    return () => socket.off("geofence:updated", handler);
  }, [socket, applyPolygon]);

  // ---------------------------------------------------------------------------
  // Save — read from Leaflet.draw, POST, apply confirmed HTTP response directly
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    const pts = getLatLngsFlat();
    if (!pts) { setSaveMsg("ERROR"); return; }
    setSaving(true);
    setSaveMsg(null);
    try {
      const res  = await fetch(BACKEND_URL + "/api/geofence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ polygon: pts }),
      });
      const data = await res.json();
      if (data.success) {
        const confirmed = data.geofence.polygon;
        savedPolygon.current = confirmed.map(p => [...p]);
        setEditMode(false);
        setTimeout(() => applyPolygon(confirmed), 20);
        setSaveMsg("SAVED");
      } else {
        setSaveMsg("ERROR");
      }
    } catch (_) {
      setSaveMsg("ERROR");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  // Cancel — restore from last saved polygon, no server call
  const handleCancel = useCallback(() => {
    if (savedPolygon.current) applyPolygon(savedPolygon.current);
    setEditMode(false);
  }, [applyPolygon]);

  // ---------------------------------------------------------------------------
  // Animal markers
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !Object.keys(animals).length) return;
    Object.values(animals).forEach((animal) => {
      const existing = animalMarkers.current[animal.id];
      if (existing) {
        existing.setLatLng([animal.lat, animal.lng]);
        existing.setIcon(createAnimalIcon(animal));
        existing.setPopupContent(buildPopupHTML(animal));
      } else {
        const m = L.marker([animal.lat, animal.lng], { icon: createAnimalIcon(animal) })
          .addTo(map)
          .bindPopup(buildPopupHTML(animal), { maxWidth: 220 });
        m.on("click", () => onSelectAnimal(animal.id));
        animalMarkers.current[animal.id] = m;
      }
    });
  }, [animals, onSelectAnimal]);

  useEffect(() => {
    const map = mapInstance.current;
    // Only pan when selectedId itself changes, not when animal positions update.
    // pannedForId ref ensures we pan exactly once per selection, not on every
    // socket tick that updates the animals object.
    if (!selectedId) {
      // Deselection — close any open popup and reset
      map?.closePopup();
      pannedForId.current = null;
      return;
    }
    if (pannedForId.current === selectedId) return; // already panned for this selection
    if (!map || !animals[selectedId]) return;
    pannedForId.current = selectedId;
    const { lat, lng } = animals[selectedId];
    map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true, duration: 0.5 });
    animalMarkers.current[selectedId]?.openPopup();
  }, [selectedId, animals]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={S.wrapper}>
      <div ref={mapRef} style={S.map} />
      <div style={S.uiOverlay}>

        {editMode ? (
          <div style={S.editBar}>
            <div style={S.editBarLeft}>
              <span style={S.editBadge}>✎ EDIT MODE</span>
              <span style={S.editHint}>Drag the green handles on the zone boundary</span>
            </div>
            <div style={S.editBarRight}>
              <button style={S.btnCancel} onClick={handleCancel}>CANCEL</button>
              <button style={{ ...S.btnSave, opacity: saving ? 0.5 : 1 }}
                onClick={handleSave} disabled={saving}>
                {saving ? "SAVING..." : "SAVE ZONE"}
              </button>
            </div>
          </div>
        ) : (
          <button style={S.editBtn} onClick={() => setEditMode(true)}>✎ EDIT ZONE</button>
        )}

        {saveMsg && (
          <div style={{
            ...S.saveToast,
            borderColor: saveMsg === "SAVED" ? "#4caf6e" : "#e84040",
            color:       saveMsg === "SAVED" ? "#4caf6e" : "#e84040",
          }}>
            {saveMsg === "SAVED" ? "✓ ZONE SAVED TO DISK" : "✗ SAVE FAILED"}
          </div>
        )}

        {loadError && (
          <div style={S.loadError}>⚠ USING DEFAULT ZONE — BACKEND UNREACHABLE</div>
        )}

        <div style={S.watermark}>TERRAIN VIEW · LIVE TRACKING</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popup HTML
// ---------------------------------------------------------------------------
function buildPopupHTML(a) {
  const c = getStatusColor(a.status);
  return [
    '<div style="padding:4px 0;min-width:180px;">',
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">',
    '<span style="font-size:14px;">' + a.emoji + ' <strong>' + a.name.toUpperCase() + '</strong></span>',
    '<span style="color:' + c + ';font-size:9px;border:1px solid ' + c + ';padding:1px 4px;">' + a.status.toUpperCase() + '</span>',
    '</div>',
    '<div style="color:#3a5a3a;margin-bottom:4px;font-size:9px;">' + a.type + ' · ' + a.id + '</div>',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px;">',
    '<div><div style="color:#3a5a3a;font-size:8px;">TEMP</div><div>' + (a.temperature ? a.temperature.toFixed(1) : "--") + "°C</div></div>",
    '<div><div style="color:#3a5a3a;font-size:8px;">HEART RATE</div><div>' + (a.heartRate || "--") + " bpm</div></div>",
    '<div style="grid-column:span 2"><div style="color:#3a5a3a;font-size:8px;">POSITION</div>',
    "<div>" + (a.lat ? a.lat.toFixed(5) : "--") + ", " + (a.lng ? a.lng.toFixed(5) : "--") + "</div></div>",
    "</div></div>",
  ].join("");
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const S = {
  wrapper:   { position:"relative", flex:1, height:"100%" },
  map:       { width:"100%", height:"100%" },
  uiOverlay: { position:"absolute", inset:0, zIndex:1000, pointerEvents:"none" },
  editBtn: {
    position:"absolute", top:"12px", right:"12px", pointerEvents:"auto",
    background:"#080c08", border:"1px solid #2a5a3a", color:"#4caf6e",
    fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", letterSpacing:"0.12em",
    padding:"7px 16px", cursor:"pointer", borderRadius:"2px",
    boxShadow:"0 0 12px rgba(76,175,110,.2)",
  },
  editBar: {
    position:"absolute", top:0, left:0, right:0, pointerEvents:"auto",
    background:"rgba(8,12,8,0.93)", borderBottom:"1px solid #2a5a3a",
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"8px 14px", backdropFilter:"blur(4px)",
  },
  editBarLeft:  { display:"flex", alignItems:"center", gap:"14px" },
  editBarRight: { display:"flex", gap:"8px" },
  editBadge: {
    fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#6adf9e",
    letterSpacing:"0.12em", background:"rgba(76,175,110,.12)",
    border:"1px solid #2a5a3a", padding:"3px 8px", borderRadius:"2px",
  },
  editHint: {
    fontFamily:"'Share Tech Mono',monospace", fontSize:"9px",
    color:"#3a5a3a", letterSpacing:"0.08em",
  },
  btnCancel: {
    fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", letterSpacing:"0.1em",
    background:"transparent", border:"1px solid #2a3a2a", color:"#4a6a4a",
    padding:"5px 14px", cursor:"pointer", borderRadius:"2px",
  },
  btnSave: {
    fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", letterSpacing:"0.1em",
    background:"#0d2a1a", border:"1px solid #4caf6e", color:"#4caf6e",
    padding:"5px 16px", cursor:"pointer", borderRadius:"2px",
    boxShadow:"0 0 10px rgba(76,175,110,.2)",
  },
  saveToast: {
    position:"absolute", top:"56px", right:"12px", pointerEvents:"none",
    fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", letterSpacing:"0.12em",
    background:"#080c08", border:"1px solid", padding:"6px 14px", borderRadius:"2px",
  },
  loadError: {
    position:"absolute", bottom:"50px", left:"50%", transform:"translateX(-50%)",
    pointerEvents:"none", fontFamily:"'Share Tech Mono',monospace", fontSize:"8px",
    color:"#e8a020", letterSpacing:"0.1em", background:"rgba(8,8,0,0.8)",
    border:"1px solid #3a3000", padding:"4px 10px", borderRadius:"2px",
  },
  watermark: {
    position:"absolute", bottom:"10px", left:"10px", pointerEvents:"none",
    fontFamily:"'Share Tech Mono',monospace", fontSize:"8px",
    color:"#2a4a2a", letterSpacing:"0.15em",
  },
};
