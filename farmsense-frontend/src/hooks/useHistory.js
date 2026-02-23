import { useState, useEffect, useRef } from "react";

/**
 * Accumulates a rolling history of animal readings locally in the browser.
 * We build this from live socket updates so we don't need to call the REST API.
 * Keeps the last MAX_POINTS readings per animal.
 */
const MAX_POINTS = 60;

export function useHistory(animals) {
  const [history, setHistory] = useState({});
  const prevAnimals = useRef({});

  useEffect(() => {
    if (!animals || Object.keys(animals).length === 0) return;

    setHistory((prev) => {
      const next = { ...prev };
      Object.values(animals).forEach((animal) => {
        const prevAnimal = prevAnimals.current[animal.id];
        // Only add if something actually changed
        if (prevAnimal && prevAnimal.lastUpdate === animal.lastUpdate) return;

        const existing = next[animal.id] || [];
        const point = {
          time: new Date(animal.lastUpdate).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          temperature: animal.temperature,
          heartRate: animal.heartRate,
          timestamp: animal.lastUpdate,
        };
        next[animal.id] = [...existing, point].slice(-MAX_POINTS);
      });
      prevAnimals.current = animals;
      return next;
    });
  }, [animals]);

  return history;
}
