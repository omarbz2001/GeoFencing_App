import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";

const CHARTS = [
  {
    key: "temperature",
    label: "TEMPERATURE",
    unit: "°C",
    color: "#e8a020",
    refMin: 38.0,
    refMax: 39.5,
    decimals: 1,
    icon: "🌡",
  },
  {
    key: "heartRate",
    label: "HEART RATE",
    unit: " bpm",
    color: "#e84040",
    refMin: 40,
    refMax: 84,
    decimals: 0,
    icon: "♥",
  },
];

export default function VitalsChart({ history, selectedId, animals }) {
  let displayData = [];
  let animalLabel = "SELECT A UNIT TO INSPECT";
  let animal = null;

  if (selectedId && history[selectedId]) {
    displayData = history[selectedId];
    animal = animals[selectedId];
    animalLabel = animal
      ? `${animal.emoji}  ${animal.name.toUpperCase()}  ·  ${animal.type}  ·  ${animal.id}`
      : selectedId;
  }

  const latest = displayData.length > 0 ? displayData[displayData.length - 1] : null;

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>VITALS MONITOR</span>
          <span style={styles.subtitle}>{animalLabel}</span>
        </div>
        <div style={styles.headerRight}>
          {CHARTS.map((c) => {
            const val = latest?.[c.key];
            const isWarn = val !== undefined && val > c.refMax;
            return (
              <div key={c.key} style={styles.currentCard}>
                <span style={styles.currentLabel}>{c.label}</span>
                <span style={{ ...styles.currentVal, color: isWarn ? "#e84040" : c.color }}>
                  {val !== undefined
                    ? `${typeof val === "number" ? val.toFixed(c.decimals) : "--"}${c.unit}`
                    : "---"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dual chart area */}
      <div style={styles.chartsRow}>
        {CHARTS.map((chart) => (
          <div key={chart.key} style={styles.chartWrapper}>
            <div style={{ ...styles.chartLabel, color: chart.color }}>
              {chart.icon} {chart.label}
            </div>

            {displayData.length === 0 ? (
              <div style={styles.noData}>
                <span style={styles.noDataText}>NO DATA</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={displayData}
                  margin={{ top: 6, right: 12, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="#0f1a0f"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 7, fill: "#2a4a2a" }}
                    axisLine={{ stroke: "#1a2a1a" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 7, fill: "#2a4a2a" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={<CustomTooltip unit={chart.unit} color={chart.color} decimals={chart.decimals} />} />
                  <ReferenceLine
                    y={chart.refMax}
                    stroke={chart.color}
                    strokeDasharray="3 3"
                    strokeOpacity={0.35}
                  />
                  <ReferenceLine
                    y={chart.refMin}
                    stroke={chart.color}
                    strokeDasharray="3 3"
                    strokeOpacity={0.35}
                  />
                  <Line
                    type="monotone"
                    dataKey={chart.key}
                    stroke={chart.color}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: chart.color, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>

      {/* Footer legend */}
      <div style={styles.footer}>
        <span style={styles.legendText}>
          ── MEASURED &nbsp;&nbsp; - - NORMAL RANGE
        </span>
        <span style={styles.legendText}>
          LAST {Math.min(displayData.length, 60)} DATA POINTS
        </span>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, unit, color, decimals }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: "#0a0f0a",
      border: `1px solid ${color}33`,
      padding: "6px 10px",
      borderRadius: "2px",
      fontFamily: "'Share Tech Mono', monospace",
      boxShadow: `0 0 12px ${color}22`,
    }}>
      <div style={{ color: "#3a5a3a", fontSize: "7px", marginBottom: "2px" }}>
        {payload[0]?.payload?.time}
      </div>
      <div style={{ color, fontSize: "16px", fontWeight: 600, lineHeight: 1 }}>
        {typeof d.value === "number" ? d.value.toFixed(decimals) : "--"}{unit}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    display: "flex",
    flexDirection: "column",
    background: "#0a0f0a",
    borderTop: "1px solid #1a2a1a",
    height: "210px",
    flexShrink: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 16px 6px",
    borderBottom: "1px solid #0f1a0f",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  },
  title: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    color: "#3a5a3a",
    letterSpacing: "0.15em",
  },
  subtitle: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: "13px",
    fontWeight: 600,
    color: "#5a7a5a",
    letterSpacing: "0.08em",
  },
  headerRight: {
    display: "flex",
    gap: "12px",
  },
  currentCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "1px",
  },
  currentLabel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "7px",
    color: "#3a5a3a",
    letterSpacing: "0.12em",
  },
  currentVal: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "20px",
    fontWeight: 700,
    lineHeight: 1,
  },
  chartsRow: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    gap: "0",
  },
  chartWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "4px 8px 0",
    borderRight: "1px solid #0f1a0f",
    minWidth: 0,
    position: "relative",
  },
  chartLabel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "7px",
    letterSpacing: "0.12em",
    flexShrink: 0,
    marginBottom: "2px",
  },
  noData: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  noDataText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    color: "#1e3a1e",
    letterSpacing: "0.15em",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    padding: "3px 16px 4px",
    borderTop: "1px solid #0f1a0f",
    flexShrink: 0,
  },
  legendText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "7px",
    color: "#2a3a2a",
    letterSpacing: "0.08em",
  },
};
