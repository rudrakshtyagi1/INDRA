import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatFinite } from '../utils/units';

export default function UncertaintyPanel({ selectedPreset }) {
  const [params, setParams] = useState({
    preset_id: selectedPreset?.id || 'tehri_dam_bhagirathi',
    ensemble_size: 20,
    variation_breach_width_pct: 25,
    variation_formation_time_pct: 30,
    variation_reservoir_level_m: 5,
    variation_manning_n_pct: 20,
  });

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedPreset?.id) {
      setParams((prev) => ({
        ...prev,
        preset_id: selectedPreset.id,
      }));
      setResult(null);
    }
  }, [selectedPreset]);

  const handleRunEnsemble = async () => {
    setIsLoading(true);
    try {
      const res = await api.runUncertaintyEnsemble(params);
      setResult(res);
    } catch (err) {
      console.error('Ensemble run failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleRunEnsemble();
  }, [selectedPreset?.id]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Monte Carlo Ensemble Engine
            </span>
            <span className="bg-purple-950 text-purple-300 border border-purple-800/60 text-xs font-mono px-2.5 py-0.5 rounded-full">
              PROVENANCE: MODELLED
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-2">
            Uncertainty &amp; Sensitivity Ensemble Analysis
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quantifies flood arrival-time and depth uncertainty intervals by sampling parameter variations in breach geometry, formation time, reservoir level, and Manning's roughness.
          </p>
        </div>
        <button
          onClick={handleRunEnsemble}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg transition flex items-center gap-2 disabled:opacity-50 text-xs"
        >
          {isLoading ? 'Sampling Ensemble...' : '🎲 Run Monte Carlo Ensemble'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-2">
            ⚙️ Ensemble Perturbation Controls
          </h2>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Ensemble Size (N simulations)
            </label>
            <input
              type="number"
              min="5"
              max="50"
              value={params.ensemble_size}
              onChange={(e) => setParams({ ...params, ensemble_size: parseInt(e.target.value) || 20 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-purple-400 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Breach Width Variation (±%)
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={params.variation_breach_width_pct}
              onChange={(e) => setParams({ ...params, variation_breach_width_pct: parseFloat(e.target.value) })}
              className="w-full accent-purple-500"
            />
            <span className="text-xs text-purple-400 font-mono block text-right mt-1">
              ±{params.variation_breach_width_pct}%
            </span>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Formation Time Variation (±%)
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={params.variation_formation_time_pct}
              onChange={(e) => setParams({ ...params, variation_formation_time_pct: parseFloat(e.target.value) })}
              className="w-full accent-purple-500"
            />
            <span className="text-xs text-purple-400 font-mono block text-right mt-1">
              ±{params.variation_formation_time_pct}%
            </span>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Reservoir Water Head Uncertainty (± meters)
            </label>
            <input
              type="range"
              min="1"
              max="15"
              value={params.variation_reservoir_level_m}
              onChange={(e) => setParams({ ...params, variation_reservoir_level_m: parseFloat(e.target.value) })}
              className="w-full accent-purple-500"
            />
            <span className="text-xs text-purple-400 font-mono block text-right mt-1">
              ±{params.variation_reservoir_level_m} m
            </span>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Manning Friction Roughness Variation (±%)
            </label>
            <input
              type="range"
              min="5"
              max="40"
              value={params.variation_manning_n_pct}
              onChange={(e) => setParams({ ...params, variation_manning_n_pct: parseFloat(e.target.value) })}
              className="w-full accent-purple-500"
            />
            <span className="text-xs text-purple-400 font-mono block text-right mt-1">
              ±{params.variation_manning_n_pct}%
            </span>
          </div>
        </div>

        {/* Results View */}
        {result ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Arrival Time Uncertainty Windows Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center justify-between">
                <span>⏱️ Station Arrival-Time Uncertainty Intervals (N={result.ensemble_size})</span>
                <span className="text-xs font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                  80% Range (P10–P90) / 90% Range (P5–P95)
                </span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Station Name</th>
                      <th className="p-2.5">Chainage</th>
                      <th className="p-2.5 text-purple-300">P5 (90% Min)</th>
                      <th className="p-2.5 text-emerald-400">P10 (80% Min)</th>
                      <th className="p-2.5 text-sky-400">P50 (Median)</th>
                      <th className="p-2.5 text-amber-400">P90 (80% Max)</th>
                      <th className="p-2.5 text-purple-300">P95 (90% Max)</th>
                      <th className="p-2.5 text-purple-400">Depth Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {(result.station_uncertainties || []).map((st) => (
                      <tr key={st.station_id || st.station_name} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-sans font-medium text-slate-200">{st.station_name}</td>
                        <td className="p-2.5 text-slate-400">{st.chainage_km} km</td>
                        <td className="p-2.5 text-purple-300">{formatFinite(st.arrival_time_p5_min, 1)} min</td>
                        <td className="p-2.5 text-emerald-400 font-bold">{formatFinite(st.arrival_time_p10_min, 1)} min</td>
                        <td className="p-2.5 text-sky-400 font-bold">{formatFinite(st.arrival_time_p50_min, 1)} min</td>
                        <td className="p-2.5 text-amber-400 font-bold">{formatFinite(st.arrival_time_p90_min, 1)} min</td>
                        <td className="p-2.5 text-purple-300">{formatFinite(st.arrival_time_p95_min, 1)} min</td>
                        <td className="p-2.5 text-purple-300">
                          {formatFinite(st.max_depth_min_m, 1)} – {formatFinite(st.max_depth_max_m, 1)} m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sensitivity Rankings */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">
                📊 Parameter Sensitivity Ranking (Impact on Peak Outflow)
              </h2>

              <div className="space-y-3">
                {(result.sensitivity_rankings || []).map((item) => (
                  <div key={item.parameter} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-300">
                      <span>#{item.sensitivity_rank || item.rank || 1} — {item.parameter}</span>
                      <span className="font-mono text-purple-400">
                        Correlation: {formatFinite(item.correlation_coefficient || item.correlation, 3)} ({item.impact_level || item.impact || 'HIGH'})
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full ${(item.impact_level || item.impact) === 'HIGH' ? 'bg-purple-500' : 'bg-sky-500'}`}
                        style={{ width: `${Math.abs((item.correlation_coefficient || item.correlation || 0.5) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
            {isLoading ? 'Sampling Monte Carlo ensemble...' : 'Click "Run Monte Carlo Ensemble" to evaluate uncertainty intervals.'}
          </div>
        )}
      </div>
    </div>
  );
}
