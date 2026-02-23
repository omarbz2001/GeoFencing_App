import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001";

export function useSocket() {
  const [animals, setAnimals] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastTick, setLastTick] = useState(null);
  const socketRef = useRef(null);
  const alertIdRef = useRef(0);

  const requestHistory = useCallback((animalId, limit = 60) => {
    socketRef.current?.emit("animal:history", { animalId, limit });
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("animals:snapshot", (data) => {
      setAnimals(data);
      setLastTick(Date.now());
    });

    socket.on("animals:update", (data) => {
      setAnimals(data);
      setLastTick(Date.now());
    });

    socket.on("animal:alert", (alert) => {
      const id = ++alertIdRef.current;
      setAlerts((prev) => [{ ...alert, _id: id }, ...prev].slice(0, 20));
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a._id !== id));
      }, 8000);
    });

    return () => socket.disconnect();
  }, []);

  return { animals, alerts, connected, lastTick, requestHistory };
}
