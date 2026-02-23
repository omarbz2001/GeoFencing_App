const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { startSimulator, getAnimalsState, getHistory } = require("./simulator/simulator");
const animalRoutes = require("./routes/animals");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend URL
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// REST routes
app.use("/api/animals", animalRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send current state immediately on connect
  socket.emit("animals:snapshot", getAnimalsState());

  // Client can request history for a specific animal
  socket.on("animal:history", ({ animalId, limit }) => {
    const history = getHistory(animalId, limit || 50);
    socket.emit("animal:history", { animalId, history });
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start the mock data simulator — it will emit events to all connected clients
startSimulator(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🐄 FarmSense backend running on http://localhost:${PORT}`);
  console.log(`   REST API : http://localhost:${PORT}/api/animals`);
  console.log(`   Socket.IO: ws://localhost:${PORT}\n`);
});
