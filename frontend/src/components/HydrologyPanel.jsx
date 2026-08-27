import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function HydrologyPanel({ onApplyInflowToSimulation }) {
  const [params, setParams] = useState({
    catchment_area_km2: 7500,
    curve_number_cn: 78,
    rainfall_24h_mm: 180,
    time_of_concentration_hrs: 6.5,
    initial_reservoir_level_m: 825.0,
    frl_m: 830.0,
    max_spillway_capacity_m3s: 15500,
  });

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const res = await api.calculateHydrology(params);
      setResult(res);
    } catch (err) {
      console.error('Hydrology calculation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleCalculate();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              SCS-CN Catchment Runoff Engine
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium px-2 py-0.5 rounded-full">
              OBSERVED / MODEL ESTIMATE
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-2">
            Bhagirathi Catchment Hydrology & Reservoir Routing
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Converts catchment precipitation into direct runoff (SCS-CN method) and routes Q_in(t) inflow into Tehri Reservoir before breach/release modeling.
          </p>
        </div>
        <button
          onClick={handleCalculate}
          disabled={isLoading}
          className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg transition flex items-center gap-2 disabled:opacity-50 text-xs"
        >
          {isLoading ? 'Computing...' : '⚡ Run Hydrological Model'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Parameters Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-2">
            🌧️ Catchment & Rainfall Inputs
          </h2>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              24-Hour Design / Observed Rainfall Depth (mm)
            </label>
            <input
              type="number"
              value={params.rainfall_24h_mm}
              onChange={(e) => setParams({ ...params, rainfall_24h_mm: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-sky-400 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              SCS Curve Number (CN) — Land Cover / Soil (40–98)
            </label>
            <input
              type="number"
              value={params.curve_number_cn}
              onChange={(e) => setParams({ ...params, curve_number_cn: parseFloat(e.target.value) || 78 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono focus:outline-none focus:border-sky-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              CN 78: Forested Himalayan steep rocky terrain with gravel soil
            </span>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Upper Bhagirathi Catchment Area (km²)
            </label>
            <input
              type="number"
              value={params.catchment_area_km2}
              onChange={(e) => setParams({ ...params, catchment_area_km2: parseFloat(e.target.value) || 7500 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Catchment Time of Concentration Tc (hours)
            </label>
            <input
              type="number"
              step="0.5"
              value={params.time_of_concentration_hrs}
              onChange={(e) => setParams({ ...params, time_of_concentration_hrs: parseFloat(e.target.value) || 6.5 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Initial Tehri Reservoir Water Surface Level (m MSL)
            </label>
            <input
              type="number"
              step="0.5"
              value={params.initial_reservoir_level_m}
              onChange={(e) => setParams({ ...params, initial_reservoir_level_m: parseFloat(e.target.value) || 825.0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-indigo-400 font-mono focus:outline-none focus:border-sky-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              FRL: 830.0 m | Dam Crest: 839.5 m MSL
            </span>
          </div>

          {result && (
            <button
              onClick={() => onApplyInflowToSimulation && onApplyInflowToSimulation(result)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg shadow-lg transition text-xs flex items-center justify-center gap-1.5"
            >
              🌊 Apply Q_in(t) to Breach Scenario
            </button>
          )}
        </div>

        {/* Results Summary & Metrics */}
        {result ? (
          <div className="lg:col-span-2 space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block">Direct Runoff Depth (Pe)</span>
                <span className="text-xl font-bold text-sky-400 font-mono mt-1 block">
                  {result.total_runoff_depth_pe_mm} mm
                </span>
                <span className="text-[11px] text-slate-500">
                  from {result.summary.rainfall_24h_mm} mm rainfall
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block">Total Runoff Volume</span>
                <span className="text-xl font-bold text-indigo-400 font-mono mt-1 block">
                  {(result.total_runoff_volume_m3 / 1e6).toFixed(1)} Mm³
                </span>
                <span className="text-[11px] text-slate-500">
                  {(result.total_runoff_volume_m3 / 1e9).toFixed(3)} Billion m³
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block">Peak Inflow Discharge</span>
                <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                  {result.peak_inflow_discharge_m3s.toLocaleString()} m³/s
                </span>
                <span className="text-[11px] text-slate-500">
                  at t = {result.time_to_peak_hrs} hrs
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block">Max Reservoir Elevation</span>
                <span className={`text-xl font-bold font-mono mt-1 block ${result.summary.overtopping_risk ? 'text-red-400' : 'text-amber-400'}`}>
                  {result.summary.max_reservoir_level_reached_m} m
                </span>
                <span className="text-[11px] text-slate-500">
                  {result.summary.overtopping_risk ? '🚨 FRL Exceeded' : 'Normal Operating Range'}
                </span>
              </div>
            </div>

            {/* Inflow Hydrograph Visualizer */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
                <span>📈 Catchment Inflow Hydrograph Q_in(t)</span>
                <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  Peak: {result.peak_inflow_discharge_m3s} m³/s
                </span>
              </h2>

              <div className="h-64 flex items-end gap-1 border-b border-slate-800 pb-2">
                {result.inflow_hydrograph_m3s.map((flow, i) => {
                  const maxFlow = Math.max(...result.inflow_hydrograph_m3s, 100);
                  const heightPct = Math.max((flow / maxFlow) * 100, 4);
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-sky-600 to-emerald-400 rounded-t hover:brightness-125 transition group relative"
                      style={{ height: `${heightPct}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 text-sky-400 text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none">
                        t: {result.time_series_hrs[i]}h | {flow} m³/s
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-2">
                <span>0 hrs</span>
                <span>12 hrs (Peak Rain)</span>
                <span>24 hrs</span>
                <span>36 hrs</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
            Calculating hydrological catchment runoff...
          </div>
        )}
      </div>
    </div>
  );
}
