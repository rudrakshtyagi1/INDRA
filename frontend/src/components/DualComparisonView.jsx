import React, { useState } from 'react';
import {
  SplitSquareVertical,
  CheckCircle2,
  AlertCircle,
  Layers,
  Activity,
  TrendingUp,
  HelpCircle,
  FileQuestion,
} from 'lucide-react';
import { getDifferenceColor } from '../utils/colorScales';
import { formatFinite } from '../utils/units';

export default function DualComparisonView({ simulationResult, selectedPreset }) {
  const comp = simulationResult?.comparison_result;
  const isAvailable = comp && comp.is_valid !== false && comp.status !== 'COMPARISON_UNAVAILABLE';

  const metrics = comp?.overall_metrics || {
    critical_success_index_csi: 0.0,
    probability_of_detection_pod: 0.0,
    false_alarm_ratio_far: 0.0,
    mean_absolute_error_depth_m: 0.0,
    target_csi_met: false,
    benchmark_status: 'COMPARISON_UNAVAILABLE',
  };

  const summaryComp = comp?.summary_comparison || {
    sph: { peak_surge_velocity_ms: 0.0, max_inundated_area_km2: 0.0, solver_type: 'Lagrangian SPH' },
    delft3d: { peak_surge_velocity_ms: 0.0, max_inundated_area_km2: 0.0, solver_type: 'Eulerian Delft3D FM' },
    key_findings: [
      'Run coupled or dual simulation to generate quantitative SPH vs Delft3D co-registration metrics.',
    ],
  };

  const gaugeComp = comp?.gauge_comparisons || {};
  const frameComps = comp?.frame_comparisons || [];
  const [selectedFrameIdx, setSelectedFrameIdx] = useState(0);

  const activeDiffFrame = frameComps[selectedFrameIdx] || frameComps[0];

  if (!simulationResult || !isAvailable) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mx-auto">
            <FileQuestion className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">
            Model Comparison Status: {comp?.benchmark_status || 'NOT RUN'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {comp?.summary_comparison?.key_findings?.[0] ||
              `No dual solver simulation has been executed for ${selectedPreset?.name || 'this scenario'}. Execute a Dual/Coupled simulation in Scenario Builder to generate spatial CSI/POD/FAR metrics.`}
          </p>
          <div className="pt-2">
            <span className="inline-block text-[11px] font-mono bg-slate-950 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-800">
              PROVENANCE: {comp?.provenance || 'DERIVED (Model Comparison)'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const passed = Boolean(metrics.target_csi_met);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <SplitSquareVertical className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-slate-100">
                Hydrodynamic Solver Verification & Co-Registration
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                  passed
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                    : 'bg-amber-950 text-amber-400 border-amber-800/60'
                }`}
              >
                {passed ? 'Target CSI ≥ 0.70 Passed' : 'Below Target (Goal ≥ 0.70)'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Quantitative spatial comparison between Weakly Compressible SPH (Particle) and Delft3D Flexible Mesh (2D SWE).
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Overall Skill Score</span>
            <span className={`text-2xl font-black tracking-tight ${passed ? 'text-cyan-400' : 'text-amber-400'}`}>
              CSI {formatFinite(metrics.critical_success_index_csi, 3)}
            </span>
          </div>
        </div>
      </div>

      {/* Core Skill Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Critical Success Index (CSI)</span>
            {passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="text-xl font-bold text-slate-100">
            {formatFinite(metrics.critical_success_index_csi, 3)}
          </div>
          <p className={`text-[10px] mt-1 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
            {passed ? 'Goal ≥ 0.70 (Passed)' : 'Goal ≥ 0.70 (Below Target)'}
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Probability of Detection (POD)</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">
            {formatFinite((metrics.probability_of_detection_pod || 0) * 100, 1)}%
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Inundation Hit Rate (TP / (TP+FN))</p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>False Alarm Ratio (FAR)</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">
            {formatFinite((metrics.false_alarm_ratio_far || 0) * 100, 1)}%
          </div>
          <p className="text-[10px] text-slate-400 mt-1">False Positives (FP / (TP+FP))</p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Mean Absolute Depth Error</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">
            {formatFinite(metrics.mean_absolute_error_depth_m, 2)} m
          </div>
          <p className="text-[10px] text-slate-400 mt-1">SPH vs Delft3D Δh MAE</p>
        </div>
      </div>

      {/* Side-by-Side Model Comparison Cards & Difference Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Model Capabilities Breakdown */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Physics Solvers Comparison</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-lg border border-cyan-950">
              <span className="text-[11px] font-bold text-cyan-400 block mb-1">SPH Solver (Near-Field)</span>
              <div className="space-y-1.5 text-xs text-slate-300">
                <p>Type: <strong className="text-slate-100">Lagrangian Mesh-Free</strong></p>
                <p>Peak Surge: <strong className="text-cyan-400">{formatFinite(summaryComp.sph?.peak_surge_velocity_ms, 1)} m/s</strong></p>
                <p>Max Inundation: <strong className="text-slate-100">{formatFinite(summaryComp.sph?.max_inundated_area_km2, 1)} km²</strong></p>
                <p className="text-[11px] text-slate-400 pt-1">
                  Resolves 3D violent dam breach front and fluid momentum.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-lg border border-blue-950">
              <span className="text-[11px] font-bold text-blue-400 block mb-1">Delft3D FM (Far-Field)</span>
              <div className="space-y-1.5 text-xs text-slate-300">
                <p>Type: <strong className="text-slate-100">Eulerian 2D SWE</strong></p>
                <p>Peak Surge: <strong className="text-blue-400">{formatFinite(summaryComp.delft3d?.peak_surge_velocity_ms, 1)} m/s</strong></p>
                <p>Max Inundation: <strong className="text-slate-100">{formatFinite(summaryComp.delft3d?.max_inundated_area_km2, 1)} km²</strong></p>
                <p className="text-[11px] text-slate-400 pt-1">
                  Downstream river propagation and floodplain diffusion.
                </p>
              </div>
            </div>
          </div>

          {/* Key Findings List */}
          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Key Analytical Insights</span>
            </h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              {(summaryComp.key_findings || []).map((f, idx) => (
                <li key={idx} className="leading-relaxed">{f}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Difference Heatmap Grid Matrix */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Spatial Difference Heatmap (SPH − Delft3D)</span>
            </h3>
            {frameComps.length > 1 && (
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">Timestep:</span>
                <select
                  value={selectedFrameIdx}
                  onChange={(e) => setSelectedFrameIdx(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-xs text-cyan-400 rounded px-2 py-1 focus:outline-none"
                >
                  {frameComps.map((fc, idx) => (
                    <option key={idx} value={idx}>
                      T = {fc.time_minutes} min (CSI: {fc.csi})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {activeDiffFrame?.diff_grid && activeDiffFrame.diff_grid.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                <div
                  className="grid gap-0.5 bg-slate-900 p-1.5 rounded-lg border border-slate-800"
                  style={{
                    gridTemplateColumns: `repeat(${activeDiffFrame.diff_grid[0]?.length || 20}, minmax(0, 1fr))`,
                  }}
                >
                  {activeDiffFrame.diff_grid.map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs transition-colors cursor-pointer hover:ring-1 hover:ring-white"
                        style={{ backgroundColor: getDifferenceColor(val) }}
                        title={`Pos: [${rIdx},${cIdx}], Δh: ${val}m`}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Color Scale Legend */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-xs bg-blue-600" />
                  <span>Delft3D &gt; SPH (−3m)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-xs bg-slate-700" />
                  <span>Aligned (0m)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-xs bg-red-600" />
                  <span>SPH &gt; Delft3D (+3m)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
              Coarse difference grid unavailable for this timestep.
            </div>
          )}
        </div>
      </div>

      {/* Cross-Section / Gauge Comparison Table */}
      {Object.keys(gaugeComp).length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">
            Station Peak Depth & Wave Arrival Co-Registration
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2 px-3">Gauge Station</th>
                  <th className="py-2 px-3">Chainage</th>
                  <th className="py-2 px-3">SPH Peak Depth</th>
                  <th className="py-2 px-3">Delft3D Peak Depth</th>
                  <th className="py-2 px-3">Δh (Peak Error)</th>
                  <th className="py-2 px-3">Arrival Lag (Δt)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {Object.entries(gaugeComp).map(([gKey, gVal]) => (
                  <tr key={gKey} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-200 font-sans font-medium">{gKey}</td>
                    <td className="py-2 px-3">{gVal.location_km} km</td>
                    <td className="py-2 px-3 text-cyan-400">{formatFinite(gVal.sph_peak_depth_m, 1)} m</td>
                    <td className="py-2 px-3 text-blue-400">{formatFinite(gVal.delft_peak_depth_m, 1)} m</td>
                    <td className="py-2 px-3">{formatFinite(gVal.depth_difference_m, 2)} m</td>
                    <td className="py-2 px-3">{formatFinite(gVal.arrival_delay_min, 1)} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
