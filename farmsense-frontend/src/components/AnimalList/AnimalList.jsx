import React from "react";
import { getStatusColor, STATUS_LABELS, formatTemp, formatHR, timeSince } from "../../utils/helpers";

export default function AnimalList({ animals, selectedId, onSelect }) {
  const list = Object.values(animals);

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>FIELD UNITS</span>
        <span style={styles.panelCount}>{list.length}</span>
      </div>

      <div style={styles.list}>
        {list.length === 0 && (
          <div style={styles.empty}>
            <span style={styles.emptyText}>AWAITING SIGNAL...</span>
          </div>
        )}
        {list.map((animal) => (
          <AnimalCard
            key={animal.id}
            animal={animal}
            selected={animal.id === selectedId}
            onClick={() => onSelect(animal.id === selectedId ? null : animal.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AnimalCard({ animal, selected, onClick }) {
  const statusColor = getStatusColor(animal.status);
  const statusLabel = STATUS_LABELS[animal.status] || "NOMINAL";

  return (
    <div style={{
      ...styles.card,
      borderColor: selected ? statusColor : "#1a2a1a",
      background: selected ? "#0d160d" : "#0a0f0a",
      cursor: "pointer",
    }}
      onClick={onClick}
    >
      {/* Status stripe */}
      <div style={{ ...styles.stripe, background: statusColor }} />

      <div style={styles.cardInner}>
        {/* Top row */}
        <div style={styles.cardTop}>
          <div style={styles.animalInfo}>
            <span style={styles.emoji}>{animal.emoji}</span>
            <div>
              <div style={styles.animalName}>{animal.name.toUpperCase()}</div>
              <div style={styles.animalMeta}>{animal.type} · {animal.id}</div>
            </div>
          </div>
          <div style={{ ...styles.statusBadge, color: statusColor, borderColor: statusColor }}>
            {statusLabel}
          </div>
        </div>

        {/* Vitals row */}
        <div style={styles.vitalsRow}>
          <Vital icon="🌡" label="TEMP" value={formatTemp(animal.temperature)}
            warn={animal.temperature > 39.5} />
          <Vital icon="♥" label="HR" value={formatHR(animal.heartRate)}
            warn={animal.heartRate > 84} />
          <Vital icon="📡" label="GPS"
            value={animal.insideGeofence ? "IN ZONE" : "OUT"}
            warn={!animal.insideGeofence} />
        </div>

        {/* Timestamp */}
        <div style={styles.timestamp}>
          LAST UPDATE · {timeSince(animal.lastUpdate)}
        </div>
      </div>
    </div>
  );
}

function Vital({ icon, label, value, warn }) {
  return (
    <div style={styles.vital}>
      <span style={styles.vitalLabel}>{label}</span>
      <span style={{ ...styles.vitalValue, color: warn ? "#e84040" : "#c8d4c0" }}>
        {value}
      </span>
    </div>
  );
}

const styles = {
  panel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#0a0f0a",
    borderRight: "1px solid #1e2a1e",
    width: "270px",
    flexShrink: 0,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderBottom: "1px solid #1e2a1e",
    flexShrink: 0,
  },
  panelTitle: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    color: "#3a5a3a",
    letterSpacing: "0.15em",
  },
  panelCount: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    color: "#4caf6e",
  },
  list: {
    overflowY: "auto",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    padding: "8px",
  },
  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100px",
  },
  emptyText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    color: "#2a3a2a",
    letterSpacing: "0.15em",
  },
  card: {
    display: "flex",
    border: "1px solid #1a2a1a",
    borderRadius: "3px",
    overflow: "hidden",
    transition: "border-color 0.2s, background 0.2s",
  },
  stripe: {
    width: "3px",
    flexShrink: 0,
  },
  cardInner: {
    flex: 1,
    padding: "10px 10px 8px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  animalInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  emoji: {
    fontSize: "20px",
    lineHeight: 1,
  },
  animalName: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    color: "#c8d4c0",
  },
  animalMeta: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "8px",
    color: "#3a5a3a",
    letterSpacing: "0.1em",
  },
  statusBadge: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "8px",
    letterSpacing: "0.1em",
    border: "1px solid",
    padding: "2px 5px",
    borderRadius: "1px",
  },
  vitalsRow: {
    display: "flex",
    gap: "8px",
  },
  vital: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    background: "#0d160d",
    padding: "4px 6px",
    borderRadius: "2px",
  },
  vitalLabel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "7px",
    color: "#3a5a3a",
    letterSpacing: "0.1em",
  },
  vitalValue: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "10px",
    fontWeight: 600,
  },
  timestamp: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "7px",
    color: "#2a3a2a",
    letterSpacing: "0.1em",
  },
};
