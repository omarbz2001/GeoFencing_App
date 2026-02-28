import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001";

export function useSocket() {
  const [animals, setAnimals]   = useState({});
  const [alerts, setAlerts]     = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastTick, setLastTick] = useState(null);
  const [socket, setSocket]     = useState(null);
  const socketRef  = useRef(null);
  const alertIdRef = useRef(0);

  const requestHistory = useCallback((animalId, limit = 60) => {
    socketRef.current?.emit("animal:history", { animalId, limit });
  }, []);

  useEffect(() => {
    const sock = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = sock;
    setSocket(sock);

    sock.on("connect",    () => setConnected(true));
    sock.on("disconnect", () => setConnected(false));

    sock.on("animals:snapshot", (data) => {
      setAnimals(data);
      setLastTick(Date.now());
    });

    sock.on("animals:update", (data) => {
      setAnimals(data);
      setLastTick(Date.now());
    });

    sock.on("animal:alert", (alert) => {
      const id = ++alertIdRef.current;
      setAlerts((prev) => [{ ...alert, _id: id }, ...prev].slice(0, 20));
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a._id !== id));
      }, 8000);
    });

    return () => sock.disconnect();
  }, []);

  return { animals, alerts, connected, lastTick, requestHistory, socket };
}
