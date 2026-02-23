# FarmSense Backend 🐄

Real-time animal monitoring backend built with Node.js, Express, and Socket.IO.

## Project Structure

```
farmsense-backend/
├── src/
│   ├── index.js                  # Entry point — Express + Socket.IO server
│   ├── routes/
│   │   └── animals.js            # REST API endpoints
│   ├── simulator/
│   │   └── simulator.js          # Mock sensor data generator
│   └── geofence/
│       └── geofence.js           # Geofence polygon + breach detection
├── package.json
└── .env.example
```

## Getting Started

```bash
npm install
npm run dev       # development (auto-restart with nodemon)
npm start         # production
```

Server runs on **http://localhost:3001** by default.

---

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/animals` | All animals current state |
| GET | `/api/animals/:id` | Single animal state |
| GET | `/api/animals/:id/history?limit=50` | Time-series history |
| GET | `/api/animals/geofence/info` | Geofence polygon definition |

---

## Socket.IO Events

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `animals:snapshot` | `{ [id]: AnimalState }` | Sent once on connection |
| `animals:update` | `{ [id]: AnimalState }` | Sent every 3 seconds |
| `animal:alert` | `AlertObject` | Fired on geofence breach |

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `animal:history` | `{ animalId, limit }` | Request history for an animal |

---

## Animal State Object

```json
{
  "id": "A001",
  "name": "Bessie",
  "type": "Cow",
  "emoji": "🐄",
  "lat": 36.8175,
  "lng": 10.1835,
  "temperature": 38.7,
  "heartRate": 62,
  "insideGeofence": true,
  "status": "normal",
  "lastUpdate": "2024-01-15T10:30:00.000Z"
}
```

**Status values:** `"normal"` | `"warning"` (vitals out of range) | `"alert"` (outside geofence)

---

## Simulated Behaviors

- **GPS drift**: Animals move naturally every 3s with a ~3% chance of leaving the geofence
- **Temperature**: Slowly drifts within normal range; ~2% chance of a fever spike per tick
- **Heart rate**: Fluctuates ±3 bpm per tick
- **History**: Last 100 readings are kept in memory per animal

---

## Connecting the Real Hardware (Later)

When the hardware team is ready, replace the simulator with a LoRa gateway integration:
1. Set up **ChirpStack** (open source LoRa Network Server)
2. Forward decoded payloads via MQTT or HTTP to this backend
3. Replace `startSimulator()` calls with MQTT subscriber or webhook handler
