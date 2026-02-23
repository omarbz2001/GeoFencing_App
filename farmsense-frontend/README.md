# FarmSense Frontend 🗺️

React dashboard for real-time livestock monitoring.
Connects to the FarmSense backend via Socket.IO.

## Stack

- **React 18** — UI framework
- **Leaflet + react-leaflet** — Interactive map with geofence overlay
- **Recharts** — Dual vitals charts (temperature + heart rate)
- **Socket.IO client** — Real-time data stream from backend
- **Google Fonts** — Rajdhani + Share Tech Mono + Barlow Condensed

## Getting Started

```bash
# Make sure the backend is running on port 3001 first!
cd farmsense-frontend
npm install
npm start
```

Opens at **http://localhost:3000**

## Project Structure

```
farmsense-frontend/
├── public/
│   └── index.html
└── src/
    ├── App.jsx                         # Root layout + global styles
    ├── index.js                        # React entry point
    ├── hooks/
    │   ├── useSocket.js                # Socket.IO connection + state
    │   └── useHistory.js               # Rolling vitals history buffer
    ├── utils/
    │   └── helpers.js                  # Colors, formatters, status labels
    └── components/
        ├── Layout/Header.jsx           # Top bar with status chips + clock
        ├── AnimalList/AnimalList.jsx   # Sidebar with animal cards
        ├── Map/FarmMap.jsx             # Leaflet map with live markers
        ├── Charts/VitalsChart.jsx      # Dual temp + HR line charts
        └── Alerts/AlertToasts.jsx      # Slide-in geofence breach alerts
```

## Features

- **Live map** — Animal positions update every 3s with color-coded status pins
- **Geofence overlay** — Farm boundary shown as dashed polygon on the map
- **Animal sidebar** — Click any card to select an animal; vitals update live
- **Dual charts** — Temperature and heart rate shown side-by-side when an animal is selected
- **Alert toasts** — Slide in from top-right when an animal leaves the geofence
- **Status system** — 🟢 Normal · 🟡 Warning (vitals out of range) · 🔴 Breach (outside geofence)

## Connecting to Real Hardware (Later)

No frontend changes needed. When the backend switches from the simulator
to real LoRa sensor data, the dashboard will automatically display real readings
since the Socket.IO event schema stays the same.

## Changing the Geofence Location

Update the `GEOFENCE_POLYGON` array in `src/components/Map/FarmMap.jsx`
to match your actual farm coordinates. Make sure it matches the polygon
in the backend's `src/geofence/geofence.js`.
