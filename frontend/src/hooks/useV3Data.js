import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000'; // or relative if proxied

export function useV3Data() {
  const [v3Summary, setV3Summary] = useState(null);
  const [v3Hazard, setV3Hazard] = useState(null);
  const [v3Exposure, setV3Exposure] = useState(null);
  const [v3Roads, setV3Roads] = useState(null);
  const [v3Routes, setV3Routes] = useState(null);
  const [v3NormalRoute, setV3NormalRoute] = useState(null);
  const [v3HazardAwareRoute, setV3HazardAwareRoute] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const fetchJson = async (url) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error('MODEL OUTPUT UNAVAILABLE');
          return await res.json();
        };

        const [summary, hazard, exposure, routes, normalR, hazardR, roads] = await Promise.all([
          fetchJson('/api/scenarios/v3/summary'),
          fetchJson('/api/scenarios/v3/hazard'),
          fetchJson('/api/scenarios/v3/exposure'),
          fetchJson('/api/scenarios/v3/hadr/routes'),
          fetchJson('/api/scenarios/v3/hadr/route/normal'),
          fetchJson('/api/scenarios/v3/hadr/route/hazard_aware'),
          fetchJson('/api/scenarios/v3/exposure/roads')
        ]);

        setV3Summary(summary);
        setV3Hazard(hazard);
        setV3Exposure(exposure);
        setV3Routes(routes);
        setV3NormalRoute(normalR);
        setV3HazardAwareRoute(hazardR);
        setV3Roads(roads);
      } catch (err) {
        console.error(err);
        setError('MODEL OUTPUT UNAVAILABLE');
      }
    }
    fetchData();
  }, []);

  return { v3Summary, v3Hazard, v3Exposure, v3Roads, v3Routes, v3NormalRoute, v3HazardAwareRoute, error };
}
