import React, { useState } from 'react';
import {
  AlertTriangle,
  Info,
  Layers,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { useRun } from '../context/RunContext';

const DEFAULT_VULNERABILITY_CURVES = {
  paved_roads: {
    name: 'Paved Roadway Infrastructure',
    depthThresholds: [0.3, 1.0, 2.5, 5.0],
    damageRatios: [0.10, 0.35, 0.70, 1.0],
    description: 'Mountain highway corridors subject to pavement scouring, sub-base liquefaction, and rockfall.',
    provenance: 'ASSUMED / CWC EMBANKMENT GUIDELINES',
  },
  residential_masonry: {
    name: 'Residential Masonry Structures',
    depthThresholds: [0.5, 1.5, 3.0, 5.0],
    damageRatios: [0.15, 0.45, 0.75, 1.0],
    description: 'Unreinforced stone/brick masonry with cement/mud mortar characteristic of upper valley settlements.',
    provenance: 'ASSUMED / NDMA FLOOD GUIDELINES',
  },
  rcc_structures: {
    name: 'Reinforced Concrete (RCC) Buildings',
    depthThresholds: [1.0, 2.5, 5.0, 8.0],
    damageRatios: [0.05, 0.25, 0.60, 0.90],
    description: 'Engineered multi-story framed municipal structures and public administrative buildings.',
    provenance: 'ASSUMED / INDIAN STANDARD 1893 CONTEXT',
  },
  agricultural_land: {
    name: 'Agricultural Terrace Floodplain',
    depthThresholds: [0.2, 0.8, 2.0, 4.0],
    damageRatios: [0.20, 0.60, 0.90, 1.0],
    description: 'Terraced arable fields, siltation deposits, and seasonal standing crop destruction.',
    provenance: 'USER PROVIDED',
  },
};

export default function DamageAssessment() {
  const { currentRun } = useRun();
  const [selectedAssetClass, setSelectedAssetClass] = useState('paved_roads');
  const [simulatedWaterDepth, setSimulatedWaterDepth] = useState(3.5);

  const curve = DEFAULT_VULNERABILITY_CURVES[selectedAssetClass];

  const calculateDamageRatio = (depth, thresholds, ratios) => {
    if (depth <= 0) return 0.0;
    if (depth < thresholds[0]) return (depth / thresholds[0]) * ratios[0];
    for (let i = 0; i < thresholds.length - 1; i++) {
      if (depth >= thresholds[i] && depth < thresholds[i + 1]) {
        const fraction = (depth - thresholds[i]) / (thresholds[i + 1] - thresholds[i]);
        return ratios[i] + fraction * (ratios[i + 1] - ratios[i]);
      }
    }
    return ratios[ratios.length - 1];
  };

  const currentDamageRatio = calculateDamageRatio(
    simulatedWaterDepth,
    curve.depthThresholds,
    curve.damageRatios
  );

  return (
    <div className="h-full flex flex-col bg-[#0B0F19] text-slate-100 overflow-y-auto select-none">
      {/* Top Header */}
      <div className="bg-[#0F172A] border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-sky-600 rounded flex items-center justify-center font-bold text-white">
            DMG
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wider uppercase font-sans">
              Physical Damage &amp; Vulnerability Assessment Console
            </h1>
            <p className="text-[10px] text-slate-400">
              Hazard &times; Asset Exposure &times; Vulnerability &rarr; Physical Damage Ratio
            </p>
          </div>
        </div>
        <span className="status-tag status-tag--data">
          ACTIVE: {currentRun.shortName}
        </span>
      </div>

      {/* Warning Notice */}
      <div className="bg-amber-950/40 border-b border-amber-900/60 px-6 py-2 flex items-start gap-2.5 text-[11px] text-amber-300 shrink-0 font-mono">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase text-amber-400">SCIENTIFIC ECONOMIC LOSS POLICY: </span>
          <span>
            Verified local replacement valuation schedules are absent from current datasets.{' '}
            <strong>NO synthetic INR loss figures are fabricated.</strong> The platform computes physical damage ratios $D_r \in [0.0, 1.0]$ and reports{' '}
            <strong>ECONOMIC LOSS: ASSET VALUE DATA REQUIRED</strong>.
          </span>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6 flex-1 text-xs">
        {/* Top Summary Telemetry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
          <div className="border border-slate-800 rounded bg-[#111827] p-4 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Road Exposure Wetted
            </div>
            <div className="text-2xl font-bold text-orange-400">
              {currentRun.road_exposed_km} km
            </div>
            <div className="text-[10px] text-slate-400">
              {currentRun.road_segments_intersected} segments within modelled flood extent
            </div>
          </div>

          <div className="border border-slate-800 rounded bg-[#111827] p-4 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Settlements Structural Impact
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              0 Intersections
            </div>
            <div className="text-[10px] text-slate-400">
              Within current modelled reach ({currentRun.domain_km} km)
            </div>
          </div>

          <div className="border border-slate-800 rounded bg-[#111827] p-4 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Velocity Vector Damage
            </div>
            <div className="text-lg font-bold text-slate-500">
              NOT AVAILABLE
            </div>
            <div className="text-[10px] text-slate-400">
              LISFLOOD-FP ACC depth-averaged solver (scalar water elevations)
            </div>
          </div>
        </div>

        {/* Depth-Damage Response Sandbox */}
        <div className="border border-slate-800 rounded bg-[#111827] p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                Vulnerability Depth-Damage Response Curve Sandbox
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Calculate physical structural damage ratio $D_r$ under variable flood water columns.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-400 text-xs">ASSET CLASS:</span>
              <select
                value={selectedAssetClass}
                onChange={(e) => setSelectedAssetClass(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
              >
                {Object.entries(DEFAULT_VULNERABILITY_CURVES).map(([key, c]) => (
                  <option key={key} value={key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1 text-xs font-mono">
                  <span className="text-slate-300">Simulated Water Column Depth:</span>
                  <span className="font-bold text-sky-400 text-sm">
                    {simulatedWaterDepth.toFixed(1)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="10.0"
                  step="0.1"
                  value={simulatedWaterDepth}
                  onChange={(e) => setSimulatedWaterDepth(parseFloat(e.target.value))}
                  className="control-slider w-full cursor-pointer accent-sky-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>0.0 m (Dry)</span>
                  <span>2.5 m (Floor level)</span>
                  <span>5.0 m (Submerged)</span>
                  <span>10.0 m (Extreme gorge)</span>
                </div>
              </div>

              <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded space-y-1">
                <div className="font-bold text-slate-300 text-[11px] font-mono">Asset Classification Rationale:</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{curve.description}</p>
                <div className="text-[10px] text-sky-400/90 font-mono pt-1">
                  Provenance: {curve.provenance}
                </div>
              </div>
            </div>

            {/* Calculated Damage Ratio Card */}
            <div className="border border-slate-800 rounded bg-[#0B0F19] p-5 space-y-4 font-mono">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Physical Damage Ratio
                </div>
                <div className="text-4xl font-bold text-white">
                  {(currentDamageRatio * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Estimated structural loss percentage ($D_r = {currentDamageRatio.toFixed(2)}$)
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Monetary Loss Valuation</div>
                <div className="px-2 py-1 rounded bg-amber-950/60 border border-amber-800 text-[11px] font-bold text-amber-400">
                  ECONOMIC LOSS: ASSET VALUE DATA REQUIRED
                </div>
                <p className="text-[9px] text-slate-500 leading-snug">
                  Requires local district PWD and revenue asset registries before currency values can be established.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step Thresholds Table */}
        <div className="border border-slate-800 rounded bg-[#111827] p-5 space-y-3 font-mono">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Himalayan Valley Depth-Damage Step Thresholds
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0F19] border-b border-slate-800 text-slate-400 text-[10px]">
                <tr>
                  <th className="p-2">ASSET CLASS</th>
                  <th className="p-2">LIGHT DAMAGE</th>
                  <th className="p-2">MODERATE</th>
                  <th className="p-2">SEVERE</th>
                  <th className="p-2">DESTRUCTION</th>
                  <th className="p-2">PROVENANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px]">
                {Object.entries(DEFAULT_VULNERABILITY_CURVES).map(([key, c]) => (
                  <tr key={key} className="hover:bg-slate-900/40">
                    <td className="p-2 font-bold text-slate-200">{c.name}</td>
                    <td className="p-2 text-slate-300">
                      {c.depthThresholds[0]}m &rarr; {c.damageRatios[0] * 100}%
                    </td>
                    <td className="p-2 text-slate-300">
                      {c.depthThresholds[1]}m &rarr; {c.damageRatios[1] * 100}%
                    </td>
                    <td className="p-2 text-slate-300">
                      {c.depthThresholds[2]}m &rarr; {c.damageRatios[2] * 100}%
                    </td>
                    <td className="p-2 text-slate-300">
                      {c.depthThresholds[3]}m &rarr; {c.damageRatios[3] * 100}%
                    </td>
                    <td className="p-2">
                      <span className="status-tag status-tag--data">
                        {c.provenance.includes('ASSUMED') ? 'ASSUMED' : 'USER PROVIDED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
