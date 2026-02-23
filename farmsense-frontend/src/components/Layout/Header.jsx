import React, { useState, useEffect } from "react";

export default function Header({ connected, animalCount, alertCount, warnCount, lastTick }) {
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = clock.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const dateStr = clock.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).toUpperCase();

  return (
    <header style={styles.header}>
      {/* Left — branding */}
      <div style={styles.brand}>
        <span style={styles.brandIcon}>⬡</span>
        <div>
          <div style={styles.brandName}>FARMSENSE</div>
          <div style={styles.brandSub}>LIVESTOCK MONITORING SYSTEM v1.0</div>
        </div>
      </div>

      {/* Center — status chips */}
      <div style={styles.statusRow}>
        <Chip
          label="LINK"
          value={connected ? "ONLINE" : "OFFLINE"}
          color={connected ? "#4caf6e" : "#e84040"}
          pulse={connected}
        />
        <Chip label="UNITS" value={`${animalCount} ACTIVE`} color="#4caf6e" />
        <Chip
          label="WARNINGS"
          value={warnCount}
          color={warnCount > 0 ? "#e8a020" : "#3a5a3a"}
          pulse={false}
        />
        <Chip
          label="BREACHES"
          value={alertCount}
          color={alertCount > 0 ? "#e84040" : "#3a5a3a"}
          pulse={alertCount > 0}
        />
      </div>

      {/* Right — clock */}
      <div style={styles.clock}>
        <div style={styles.clockTime}>{timeStr}</div>
        <div style={styles.clockDate}>{dateStr}</div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        .pulse-dot { animation: pulse-ring 1.4s ease-in-out infinite; }
      `}</style>
    </header>
  );
}

function Chip({ label, value, color, pulse }) {
  return (
    <div style={{ ...styles.chip }}>
      <div style={{ ...styles.chipDot, background: color }}
           className={pulse ? "pulse-dot" : ""} />
      <span style={styles.chipLabel}>{label}</span>
      <span style={{ ...styles.chipValue, color }}>{value}</span>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: "56px",
    background: "#0d1012",
    borderBottom: "1px solid #1e2a1e",
    flexShrink: 0,
    gap: "16px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  brandIcon: {
    fontSize: "22px",
    color: "#4caf6e",
    lineHeight: 1,
  },
  brandName: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: "20px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#c8d4c0",
  },
  brandSub: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "8px",
    color: "#3a5a3a",
    letterSpacing: "0.15em",
  },
  statusRow: {
    display: "flex",
    gap: "8px",
  },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    border: "1px solid #1e2a1e",
    borderRadius: "2px",
    background: "#0a0f0a",
  },
  chipDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  chipLabel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    color: "#3a5a3a",
    letterSpacing: "0.1em",
  },
  chipValue: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.05em",
  },
  clock: {
    textAlign: "right",
  },
  clockTime: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "18px",
    color: "#4caf6e",
    letterSpacing: "0.08em",
  },
  clockDate: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "8px",
    color: "#3a5a3a",
    letterSpacing: "0.1em",
  },
};
