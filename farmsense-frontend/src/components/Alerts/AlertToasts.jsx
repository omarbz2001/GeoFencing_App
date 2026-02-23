import React from "react";

export default function AlertToasts({ alerts }) {
  if (alerts.length === 0) return null;

  return (
    <div style={styles.container}>
      {alerts.map((alert) => (
        <div key={alert._id} style={styles.toast}>
          <div style={styles.toastStripe} />
          <div style={styles.toastContent}>
            <div style={styles.toastHeader}>
              <span style={styles.toastType}>⚠ GEOFENCE BREACH</span>
              <span style={styles.toastTime}>
                {new Date(alert.timestamp).toLocaleTimeString("en-GB")}
              </span>
            </div>
            <div style={styles.toastMsg}>{alert.animalName.toUpperCase()} HAS LEFT THE FARM BOUNDARY</div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(110%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: "66px",
    right: "12px",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxWidth: "300px",
  },
  toast: {
    display: "flex",
    background: "#150a0a",
    border: "1px solid #e84040",
    borderRadius: "3px",
    overflow: "hidden",
    animation: "slideIn 0.3s ease-out",
    boxShadow: "0 0 24px rgba(232, 64, 64, 0.2)",
  },
  toastStripe: {
    width: "3px",
    background: "#e84040",
    flexShrink: 0,
  },
  toastContent: {
    padding: "8px 12px",
    flex: 1,
  },
  toastHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "3px",
  },
  toastType: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "9px",
    color: "#e84040",
    letterSpacing: "0.1em",
  },
  toastTime: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "8px",
    color: "#5a3a3a",
  },
  toastMsg: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: "12px",
    fontWeight: 500,
    color: "#c8a0a0",
    letterSpacing: "0.03em",
  },
};
