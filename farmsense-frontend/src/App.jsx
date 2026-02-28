import React, { useState } from "react";
import Header from "./components/Layout/Header";
import AnimalList from "./components/AnimalList/AnimalList";
import FarmMap from "./components/Map/FarmMap";
import VitalsChart from "./components/Charts/VitalsChart";
import AlertToasts from "./components/Alerts/AlertToasts";
import { useSocket } from "./hooks/useSocket";
import { useHistory } from "./hooks/useHistory";

// Inject global styles + Google Fonts
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body, #root {
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: #080c08;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #0a0f0a; }
  ::-webkit-scrollbar-thumb { background: #1e3a1e; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #2a5a2a; }

  /* Scanline overlay effect */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.03) 2px,
      rgba(0,0,0,0.03) 4px
    );
    pointer-events: none;
    z-index: 9998;
  }
`;

const styleEl = document.createElement("style");
styleEl.textContent = globalCSS;
document.head.appendChild(styleEl);

export default function App() {
  const { animals, alerts, connected, lastTick, socket } = useSocket();
  const history = useHistory(animals);
  const [selectedId, setSelectedId] = useState(null);

  const animalList = Object.values(animals);
  const alertCount = animalList.filter((a) => a.status === "alert").length;
  const warnCount  = animalList.filter((a) => a.status === "warning").length;

  return (
    <div style={styles.root}>
      <Header
        connected={connected}
        animalCount={animalList.length}
        alertCount={alertCount}
        warnCount={warnCount}
        lastTick={lastTick}
      />

      <div style={styles.body}>
        <AnimalList
          animals={animals}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <div style={styles.rightCol}>
          <div style={styles.mapArea}>
            <FarmMap
              animals={animals}
              selectedId={selectedId}
              onSelectAnimal={setSelectedId}
              socket={socket}
            />
          </div>
          <VitalsChart
            history={history}
            selectedId={selectedId}
            animals={animals}
          />
        </div>
      </div>

      <AlertToasts alerts={alerts} />
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    background: "#080c08",
    fontFamily: "'Share Tech Mono', monospace",
  },
  body: {
    display: "flex",
    flex: 1,
    minHeight: 0,
  },
  rightCol: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
  },
  mapArea: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
};
