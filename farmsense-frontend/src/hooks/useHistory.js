import { useState, useEffect, useRef } from "react";

/**
 * useHistory — provides a rich time-series buffer per animal.
 *
 * Strategy:
 *  1. On mount, fetch the last 120 readings for every animal from the REST
 *     API so the Vitals Monitor chart is populated immediately.
 *  2. After seeding, continue appending every live socket update (deduped
 *     by timestamp) so the chart scrolls forward in real time.
 *
 * Keeps the last MAX_POINTS readings per animal.
 */

const MAX_POINTS   = 120;                         // shown in chart (~6 min at 3s)
const API_LIMIT    = 120;                         // how many points to fetch
const API_BASE     = "http://localhost:3001";

/** Convert a raw backend history entry to the shape Recharts expects */
function toPoint(entry) {
  const d = new Date(entry.timestamp);
  return {
    time:        d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    temperature: entry.temperature,
    heartRate:   entry.heartRate,
    timestamp:   entry.timestamp,
  };
}

export function useHistory(animals) {
  const [history, setHistory] = useState({});
  const seeded      = useRef(false);       // have we fetched the initial API data?
  const prevAnimals = useRef({});

  // ── Step 1: Seed from API once when the first animal data arrives ────────
  useEffect(() => {
    if (seeded.current) return;
    const ids = Object.keys(animals);
    if (ids.length === 0) return;

    seeded.current = true;

    Promise.all(
      ids.map((id) =>
        fetch(`${API_BASE}/api/animals/${id}/history?limit=${API_LIMIT}`)
          .then((r) => r.json())
          .then((data) => ({ id, points: (data.history || []).map(toPoint) }))
          .catch(() => ({ id, points: [] }))
      )
    ).then((results) => {
      setHistory((prev) => {
        const next = { ...prev };
        results.forEach(({ id, points }) => {
          // Merge: API data first, then any live points already accumulated
          const live    = next[id] || [];
          const merged  = [...points, ...live];
          // Deduplicate by timestamp, keep last MAX_POINTS
          const seen    = new Set();
          const deduped = merged.filter((p) => {
            if (seen.has(p.timestamp)) return false;
            seen.add(p.timestamp);
            return true;
          });
          next[id] = deduped.slice(-MAX_POINTS);
        });
        return next;
      });
    });
  }, [animals]);

  // ── Step 2: Append each live socket update ───────────────────────────────
  useEffect(() => {
    if (!animals || Object.keys(animals).length === 0) return;

    setHistory((prev) => {
      const next = { ...prev };
      let changed = false;

      Object.values(animals).forEach((animal) => {
        const prevAnimal = prevAnimals.current[animal.id];
        // Skip if timestamp unchanged (no new data)
        if (prevAnimal && prevAnimal.lastUpdate === animal.lastUpdate) return;

        const point = {
          time:        new Date(animal.lastUpdate).toLocaleTimeString("en-GB", {
                         hour: "2-digit", minute: "2-digit",
                       }),
          temperature: animal.temperature,
          heartRate:   animal.heartRate,
          timestamp:   animal.lastUpdate,
        };

        const existing = next[animal.id] || [];
        // Avoid duplicate if API seed already included this timestamp
        if (existing.length > 0 && existing[existing.length - 1].timestamp === point.timestamp) return;

        next[animal.id] = [...existing, point].slice(-MAX_POINTS);
        changed = true;
      });

      prevAnimals.current = animals;
      return changed ? next : prev;
    });
  }, [animals]);

  return history;
}
