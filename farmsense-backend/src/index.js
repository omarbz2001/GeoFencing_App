const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");
const cors   = require("cors");

const { startSimulator, getAnimalsState, getHistory } = require("./simulator/simulator");
const animalRoutes   = require("./routes/animals");
const geofenceRoutes = require("./routes/geofence");

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

// Attach io instance to every request so routes can broadcast
app.use((req, _res, next) => { req.io = io; next(); });

app.use("/api/animals",  animalRoutes);
app.use("/api/geofence", geofenceRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send initial animals snapshot — geofence is loaded via HTTP GET, not socket
  socket.emit("animals:snapshot", getAnimalsState());

  socket.on("animal:history", ({ animalId, limit }) => {
    const history = getHistory(animalId, limit || 50);
    socket.emit("animal:history", { animalId, history });
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

startSimulator(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🐄 FarmSense backend running on http://localhost:${PORT}`);
  console.log(`   REST API : http://localhost:${PORT}/api/animals`);
  console.log(`   Socket.IO: ws://localhost:${PORT}\n`);
});
