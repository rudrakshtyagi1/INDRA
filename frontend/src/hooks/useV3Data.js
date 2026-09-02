import { useState, useEffect } from 'react';

export function useV3Data() {
  const [v3Summary, setV3Summary] = useState(null);
  const [v3Hazard, setV3Hazard] = useState(null);
  const [v3Exposure, setV3Exposure] = useState(null);
  const [v3Roads, setV3Roads] = useState(null);
  const [v3Routes, setV3Routes] = useState(null);
  const [v3NormalRoute, setV3NormalRoute] = useState(null);
  const [v3HazardAwareRoute, setV3HazardAwareRoute] = useState(null);
  const [v3Context, setV3Context] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const fetchJson = async (url) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error('MODEL OUTPUT UNAVAILABLE');
          return await res.json();
        };

        const [
          summary, hazard, exposure, routes, normalR, hazardR, roads,
          settlements, healthcare, bridges, power
        ] = await Promise.all([
          fetchJson('/api/scenarios/v3/summary').catch(() => null),
          fetchJson('/api/scenarios/v3/hazard').catch(() => null),
          fetchJson('/api/scenarios/v3/exposure').catch(() => null),
          fetchJson('/api/scenarios/v3/hadr/routes').catch(() => null),
          fetchJson('/api/scenarios/v3/hadr/route/normal').catch(() => null),
          fetchJson('/api/scenarios/v3/hadr/route/hazard_aware').catch(() => null),
          fetchJson('/api/scenarios/v3/exposure/roads').catch(() => null),
          fetchJson('/api/scenarios/v3/context/settlements').catch(() => null),
          fetchJson('/api/scenarios/v3/context/healthcare').catch(() => null),
          fetchJson('/api/scenarios/v3/context/bridges').catch(() => null),
          fetchJson('/api/scenarios/v3/context/power_infrastructure').catch(() => null)
        ]);

        setV3Summary(summary);
        setV3Hazard(hazard);
        setV3Exposure(exposure);
        setV3Routes(routes);
        setV3NormalRoute(normalR);
        setV3HazardAwareRoute(hazardR);
        setV3Roads(roads);
        setV3Context({ settlements, healthcare, bridges, power });
      } catch (err) {
        console.error(err);
        setError('MODEL OUTPUT UNAVAILABLE');
      }
    }
    fetchData();
  }, []);

  return { v3Summary, v3Hazard, v3Exposure, v3Roads, v3Routes, v3NormalRoute, v3HazardAwareRoute, v3Context, error };
}
