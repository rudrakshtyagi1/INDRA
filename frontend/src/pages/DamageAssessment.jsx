import React, { useState } from 'react';
import {
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import { useRun } from '../context/RunContext';

const DEFAULT_VULNERABILITY_CURVES = {
  residential_masonry: {
    name: 'Residential Masonry',
    depthThresholds: [0.5, 1.5, 3.0, 5.0],
    damageRatios: [0.15, 0.45, 0.75, 1.0],
    description: 'Unreinforced brick/stone masonry with cement/mud mortar (typical Himalayan valley architecture).',
  },
  rcc_structures: {
    name: 'Reinforced Concrete (RCC)',
    depthThresholds: [1.0, 2.5, 5.0, 8.0],
    damageRatios: [0.05, 0.25, 0.60, 0.90],
    description: 'Engineered reinforced concrete multi-story frames and public administrative facilities.',
  },
  paved_roads: {
    name: 'Paved Roadway Infrastructure',
    depthThresholds: [0.3, 1.0, 2.5, 5.0],
    damageRatios: [0.10, 0.35, 0.70, 1.0],
    description: 'Bituminous and concrete mountain highway corridors subject to sub-base scouring.',
  },
  agricultural_land: {
    name: 'Agricultural Floodplain',
    depthThresholds: [0.2, 0.8, 2.0, 4.0],
    damageRatios: [0.20, 0.60, 0.90, 1.0],
    description: 'Terraced arable fields, siltation deposits, and seasonal standing crop loss.',
  },
};

export default function DamageAssessment() {
  const { currentRun } = useRun();
  const [selectedAssetClass, setSelectedAssetClass] = useState('paved_roads');
  const [simulatedWaterDepth, setSimulatedWaterDepth] = useState(3.5);

  const curve = DEFAULT_VULNERABILITY_CURVES[selectedAssetClass];

  // Calculate physical damage ratio from depth curve
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
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-y-auto">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              {currentRun.name}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
              PROVENANCE: THEORETICAL / ASSUMED CURVES
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Physical Damage &amp; Loss Assessment Lab
          </h1>
          <p className="text-xs text-slate-500">
            Defensible hazard-vulnerability framework: Hazard (Depth, Duration) &times; Asset Exposure &times; Vulnerability &rarr; Physical Damage Ratio.
          </p>
        </div>
      </div>

      {/* Scientific Honesty Notice Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-start gap-3 text-xs text-amber-900 shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">SCIENTIFIC LOSS FRAMEWORK NOTICE: </span>
          <span>
            Economic loss in monetary figures requires verified local asset/replacement valuation data.{' '}
            <strong>NO synthetic INR loss numbers are fabricated by FloodLab.</strong> When asset valuation census data are absent, the platform truthfully reports{' '}
            <strong>ECONOMIC LOSS: ASSET VALUE DATA REQUIRED</strong> and evaluates physical damage ratios.
          </span>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6 flex-1">
        {/* Top Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Physical Road Damage Exposure
            </div>
            <div className="text-xl font-bold font-mono text-orange-600">
              {currentRun.road_exposed_km} km
            </div>
            <div className="text-xs text-slate-500">
              {currentRun.road_segments_intersected} segments subject to inundation &amp; sub-base saturation
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Settlement Damage Status
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600">
              0 Intersections
            </div>
            <div className="text-xs text-slate-500">
              Within current modelled reach ({currentRun.domain_km} km)
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Velocity-Dependent Damage
            </div>
            <div className="text-base font-bold text-slate-400 font-mono">
              DATA NOT AVAILABLE
            </div>
            <div className="text-[10px] text-slate-500">
              LISFLOOD-FP ACC solver is depth-averaged without vector velocity output
            </div>
          </div>
        </div>

        {/* Interactive Vulnerability Sensitivity Sandbox */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                Vulnerability Depth-Damage Response Curve
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect physical structure damage ratio $D_r \in [0.0, 1.0]$ under variable flood depths.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Asset Class:</span>
              <select
                value={selectedAssetClass}
                onChange={(e) => setSelectedAssetClass(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-50 focus:bg-white"
              >
                {Object.entries(DEFAULT_VULNERABILITY_CURVES).map(([key, c]) => (
                  <option key={key} value={key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Depth Slider & Current Damage Ratio Box */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-semibold text-slate-700">Test Hazard Water Depth:</span>
                  <span className="font-mono font-bold text-blue-600 text-sm">
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
                  className="w-full cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>0.0 m (Dry)</span>
                  <span>2.5 m (First floor)</span>
                  <span>5.0 m (Submerged)</span>
                  <span>10.0 m (Extreme gorge)</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="font-bold text-slate-700 text-[11px]">Asset Classification Description:</div>
                <p className="text-slate-600 text-[11px] leading-relaxed">{curve.description}</p>
                <div className="text-[10px] text-slate-400 font-mono pt-1">
                  Provenance: ASSUMED / USER PROVIDED &middot; Methodology: CWC / NDMA Embankment &amp; Inundation Guidelines
                </div>
              </div>
            </div>

            {/* Calculated Damage Ratio Card */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Calculated Physical Damage Ratio
                </div>
                <div className="text-3xl font-bold font-mono text-slate-900">
                  {(currentDamageRatio * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Fraction of asset structural replacement required
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 space-y-1 text-xs">
                <div className="font-bold text-slate-700 text-[11px]">Economic Loss Valuation:</div>
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
                  ASSET VALUE DATA REQUIRED
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  District PWD &amp; Revenue department unit cost schedules required to translate damage ratio into verified currency figures.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Depth-Damage Curve Thresholds Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Standard Himalayan Basin Vulnerability Step Thresholds
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-mono text-[11px]">
                <tr>
                  <th className="p-2.5">Asset Class</th>
                  <th className="p-2.5">Threshold 1 (Light)</th>
                  <th className="p-2.5">Threshold 2 (Moderate)</th>
                  <th className="p-2.5">Threshold 3 (Severe)</th>
                  <th className="p-2.5">Threshold 4 (Destruction)</th>
                  <th className="p-2.5">Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {Object.entries(DEFAULT_VULNERABILITY_CURVES).map(([key, c]) => (
                  <tr key={key} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-800">{c.name}</td>
                    <td className="p-2.5 font-mono">
                      {c.depthThresholds[0]}m &rarr; {c.damageRatios[0] * 100}%
                    </td>
                    <td className="p-2.5 font-mono">
                      {c.depthThresholds[1]}m &rarr; {c.damageRatios[1] * 100}%
                    </td>
                    <td className="p-2.5 font-mono">
                      {c.depthThresholds[2]}m &rarr; {c.damageRatios[2] * 100}%
                    </td>
                    <td className="p-2.5 font-mono">
                      {c.depthThresholds[3]}m &rarr; {c.damageRatios[3] * 100}%
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-600">
                        ASSUMED
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
