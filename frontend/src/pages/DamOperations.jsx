import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { PROTOTYPE_METADATA } from '../data/prototype/tehriPrototypeRun';
import HydrographChart from '../components/charts/HydrographChart';
import ContextInspector from '../layout/ContextInspector';

export default function DamOperations({
  selectedPreset, simulationResult, onOpenScenarioDrawer, onRunSimulation, isSimulating,
}) {
  const [specsOpen, setSpecsOpen] = useState(false);
  const meta = PROTOTYPE_METADATA;
  const dam = meta.dam;
  const breach = meta.breachMechanics;

  // Reservoir level as percentage of dam height
  const frlPct = ((dam.fullReservoirLevelMsl - dam.riverBedMsl) / dam.damHeightM) * 100;
  const currentLevelPct = frlPct; // at FRL for prototype

  return (
    <div className="w-full h-full flex overflow-hidden bg-[var(--surface-0)]">

      {/* Main content — fills canvas */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top thin label bar */}
        <div className="h-9 px-5 flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface-1)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
              {dam.name} · Structural & Hydraulic Profile
            </span>
            <span className="status-pill status-pill--running">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              SCADA Telemetry Offline · Reported Baseline
            </span>
          </div>
          <button
            onClick={onOpenScenarioDrawer}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5 transition"
          >
            <SlidersHorizontal className="w-3 h-3" />
            Configure scenario
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5 max-w-5xl">

            {/* Primary engineering panel: dam schematic + gauges */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Dam cross-section schematic — 2/3 width */}
              <div className="lg:col-span-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-1)] overflow-hidden">
                <div className="px-4 pt-3 pb-2 border-b border-[var(--surface-border)] flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
                      SCHEMATIC CROSS-SECTION · Based on reported Tehri structural dimensions
                    </p>
                    <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                      Zoned earth-rockfill · Central impervious clay core
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <svg viewBox="0 0 680 240" className="w-full" style={{ maxHeight: 240 }}>
                    {/* Sky / background */}
                    <rect x="0" y="0" width="680" height="240" fill="#070b12" />

                    {/* Water body */}
                    <polygon
                      points="20,80 225,80 225,200 20,200"
                      fill="#1e3a8a"
                      fillOpacity="0.35"
                    />
                    {/* Water surface line */}
                    <line x1="20" y1="80" x2="225" y2="80" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,3" opacity="0.8" />
                    <text x="25" y="73" fill="#60a5fa" fontSize="10" fontFamily="monospace" fontWeight="600">
                      FRL 830m MSL (Design Level) — hw = {dam.hydraulicHeadM}m
                    </text>

                    {/* Dam body — rockfill */}
                    <polygon
                      points="130,200 260,44 400,44 560,200"
                      fill="#16202e"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1.5"
                    />

                    {/* Upstream face hatching lines */}
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                      const t = i / 6;
                      const x1 = 130 + t * (260 - 130);
                      const y1 = 200 - t * (200 - 44);
                      const x2 = x1 + 20;
                      const y2 = Math.min(200, y1 + 20);
                      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
                    })}

                    {/* Clay core */}
                    <polygon
                      points="262,200 280,44 320,44 338,200"
                      fill="#0c1a2e"
                      stroke="#3b4f6b"
                      strokeWidth="1"
                    />
                    <text x="300" y="130" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="600">
                      CLAY
                    </text>
                    <text x="300" y="142" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                      CORE
                    </text>

                    {/* Crest line */}
                    <line x1="260" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                    <text x="330" y="30" fill="#e2e8f0" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="700">
                      Crest {dam.crestElevationMsl}m MSL · h = {dam.damHeightM}m
                    </text>

                    {/* Height dimension arrow */}
                    <line x1="590" y1="44" x2="590" y2="200" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3" />
                    <text x="598" y="125" fill="#475569" fontSize="9" fontFamily="monospace" transform="rotate(-90, 598, 125)">
                      {dam.damHeightM}m
                    </text>

                    {/* River bed */}
                    <line x1="560" y1="200" x2="660" y2="200" stroke="#334155" strokeWidth="2" />
                    <text x="580" y="218" fill="#475569" fontSize="9" fontFamily="monospace">
                      River bed {dam.riverBedMsl}m MSL
                    </text>

                    {/* Foundation */}
                    <polygon
                      points="130,200 560,200 580,225 110,225"
                      fill="#0a1019"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <text x="345" y="218" fill="#334155" fontSize="9" fontFamily="monospace" textAnchor="middle">
                      Phyllite bedrock foundation
                    </text>

                    {/* Downstream slope annotation */}
                    <text x="490" y="145" fill="#64748b" fontSize="9" fontFamily="monospace">
                      1:1.4 slope
                    </text>
                  </svg>
                </div>
              </div>

              {/* Right: Level gauge + key readouts */}
              <div className="flex flex-col gap-4">

                {/* Reservoir level gauge */}
                <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-4 flex flex-col gap-3">
                  <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
                    Reservoir Level Status
                  </p>
                  {/* Vertical gauge */}
                  <div className="flex items-end gap-3">
                    <div className="relative w-8 bg-[var(--surface-3)] rounded overflow-hidden" style={{ height: 120 }}>
                      <div
                        className="absolute bottom-0 w-full bg-blue-700/30 border-t-2 border-blue-400/60 border-dashed"
                        style={{ height: `${frlPct}%` }}
                      />
                    </div>
                    <div className="flex flex-col justify-between" style={{ height: 120 }}>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{dam.crestElevationMsl}m</p>
                        <p className="text-[9px] text-[var(--text-muted)]">Crest (REPORTED)</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-400">{dam.fullReservoirLevelMsl}m MSL</p>
                        <p className="text-[9px] text-blue-300/80">FRL (REPORTED DESIGN LEVEL)</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-400">DATA UNAVAILABLE</p>
                        <p className="text-[9px] text-amber-400/80">Current Level (SCADA Offline)</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)]">Breach scenario assumes water level at FRL (830m MSL).</p>
                </div>

                {/* Key metrics — compact */}
                {[
                  { l: 'Dam height', v: `${dam.damHeightM} m`, prov: 'REPORTED (THDC/CWC)', color: 'text-[var(--text-primary)]' },
                  { l: 'Gross storage', v: '3.54 BCM', prov: 'REPORTED (CWC)', color: 'text-blue-400' },
                  { l: 'Peak Qp (Froehlich)', v: '84,200 m³/s', prov: 'PRECOMPUTED PROTOTYPE · Assumed FRL', color: 'text-red-400' },
                  { l: 'Capacity (HPP+PSP)', v: `${dam.installedCapacityMw} MW`, prov: 'REPORTED', color: 'text-[var(--text-primary)]' },
                ].map(({ l, v, prov, color }) => (
                  <div key={l} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2.5">
                    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{l}</p>
                    <p className={`text-sm font-bold tabular-nums ${color}`}>{v}</p>
                    <p className="text-[8px] text-[var(--text-muted)] mt-0.5">{prov}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Outflow Hydrograph */}
            <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-1)] overflow-hidden">
              <div className="px-4 pt-3 pb-2 border-b border-[var(--surface-border)]">
                <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
                  Synthesized breach outflow Q(t) · WHAT-IF HYDRODYNAMIC BENCHMARK
                </p>
                <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                  Froehlich (2008) parametric embankment breach — Qp = 84,200 m³/s at T+44.4 min
                </p>
              </div>
              <div className="h-52">
                <HydrographChart
                  times={breach.hydrographTimesHrs}
                  flows={breach.hydrographFlowsM3s}
                  currentTimeHrs={breach.timeToPeakHrs}
                  peakDischarge={breach.peakDischargeM3s}
                  timeToPeakHrs={breach.timeToPeakHrs}
                />
              </div>
            </div>

            {/* Collapsible technical specs */}
            <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-1)] overflow-hidden">
              <button
                onClick={() => setSpecsOpen(!specsOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/3 transition"
              >
                <div>
                  <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase text-left">
                    Technical specifications
                  </p>
                  <p className="text-xs font-semibold text-[var(--text-primary)] text-left mt-0.5">
                    THDC / CWC official engineering data — click to expand
                  </p>
                </div>
                {specsOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
              </button>

              <AnimatePresence>
                {specsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[var(--surface-border)] p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          ['Crest elevation', `${dam.crestElevationMsl} m MSL`],
                          ['Crest length', `${dam.crestLengthM} m`],
                          ['River bed elevation', `${dam.riverBedMsl} m MSL`],
                          ['Crest width', '20 m (approx)'],
                          ['Breach avg width', `${breach.avgBreachWidthM} m`],
                          ['Side slope z', `1:${breach.sideSlopeZ} H:V`],
                          ['Formation time tf', `${breach.breachFormationTimeHrs} hrs`],
                          ['Time to peak tp', `${breach.timeToPeakHrs} hrs (~44 min)`],
                        ].map(([l, v]) => (
                          <div key={l} className="rounded-lg bg-[var(--surface-0)] border border-[var(--surface-border)] px-3 py-2.5">
                            <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{l}</p>
                            <p className="text-xs font-bold text-[var(--text-primary)] font-mono">{v}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-[var(--text-muted)] mt-3">
                        Source: THDC India Ltd. / CWC design documents. Breach parameters are WHAT-IF HYDRODYNAMIC BENCHMARK (Froehlich 2008 formulation).
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
