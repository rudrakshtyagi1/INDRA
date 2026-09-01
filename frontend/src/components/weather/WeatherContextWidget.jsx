import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, Wind, Thermometer, Droplets, RefreshCw } from 'lucide-react';

/**
 * Open-Meteo Current Weather Context Widget for Tehri Dam (30.378°N, 78.481°E)
 * Free public API without key. Provides contextual real-time basin meteorological conditions.
 */
export default function WeatherContextWidget({ className = '', compact = false }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=30.378&longitude=78.481&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=Asia%2FKolkata'
      );
      if (!res.ok) throw new Error('Weather API unavailable');
      const data = await res.json();
      setWeather(data.current);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  return (
    <div className={`p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold font-mono tracking-wider text-slate-300 uppercase">
            CURRENT WEATHER CONTEXT
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-500">
          Tehri Garhwal (Open-Meteo)
        </span>
      </div>

      <div className="py-2">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
            <span>Fetching basin telemetry...</span>
          </div>
        ) : error || !weather ? (
          <div className="text-[11px] text-slate-500 font-mono">
            Weather telemetry unavailable (offline fallback)
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Temperature</span>
              <span className="text-xs font-bold text-slate-200">{weather.temperature_2m}°C</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Precipitation</span>
              <span className="text-xs font-bold text-cyan-400">{weather.precipitation} mm</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Humidity / Wind</span>
              <span className="text-xs font-bold text-slate-300">{weather.relative_humidity_2m}% / {weather.wind_speed_10m} km/h</span>
            </div>
          </div>
        )}
      </div>

      <div className="text-[9px] font-mono text-slate-500 border-t border-slate-800/60 pt-1.5 flex items-center justify-between">
        <span>*Contextual observation — does not modify precomputed hydrodynamics</span>
        <button onClick={fetchWeather} className="text-slate-400 hover:text-cyan-400" title="Refresh weather">
          <RefreshCw className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}
