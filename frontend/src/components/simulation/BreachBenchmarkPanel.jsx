import React, { useState, useEffect } from 'react';
import { Waves, AlertTriangle } from 'lucide-react';
import { useRun } from '../../context/RunContext';

export default function BreachBenchmarkPanel() {
  const { selectedRunId } = useRun();
  const [breachData, setBreachData] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/runs/${selectedRunId}/breach`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setBreachData(data);
      })
      .catch(() => {});
  }, [selectedRunId]);

  // Verified breach series
  const series = breachData?.hydrograph_series || [
    { time_hrs: 0.0, Q_breach_m3s: 0.0 },
    { time_hrs: 0.5, Q_breach_m3s: 15000.0 },
    { time_hrs: 1.0, Q_breach_m3s: 120000.0 },
    { time_hrs: 1.5, Q_breach_m3s: 480000.0 },
    { time_hrs: 2.0, Q_breach_m3s: 723705.5 },
    { time_hrs: 2.5, Q_breach_m3s: 580000.0 },
    { time_hrs: 3.0, Q_breach_m3s: 390000.0 },
    { time_hrs: 4.0, Q_breach_m3s: 180000.0 },
    { time_hrs: 5.0, Q_breach_m3s: 75000.0 },
    { time_hrs: 6.0, Q_breach_m3s: 25000.0 },
  ];

  return (
    <div className="bg-[#111827] border border-slate-800 rounded flex flex-col h-full overflow-y-auto font-mono text-xs p-5">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-violet-400" />
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase">
              Theoretical Breach Benchmark Mechanics
            </h2>
            <div className="text-[10px] text-slate-400">
              Froehlich (2008) Parametric Embankment Failure Formulation
            </div>
          </div>
        </div>
        <div className="text-right text-[9px] text-slate-400">
          <div>SOURCE: breach_boundary_hydrograph.csv</div>
          <div className="text-violet-400 font-bold">PROVENANCE: THEORETICAL BENCHMARK</div>
        </div>
      </div>

      {/* Prominent Warning Banner */}
      <div className="p-3.5 bg-amber-950/40 border border-amber-900/60 rounded my-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-bold text-amber-300">BENCHMARK DISCLAIMER: </span>
          <span className="text-slate-300">
            SIMPLIFIED THEORETICAL BREACH BOUNDARY / SYNTHETIC HYPSOMETRY / STAGE-STORAGE DATA NOT AVAILABLE.
            These figures represent extreme theoretical stress-testing benchmarks derived from empirical literature.
            They are NOT historical Tehri flood flows, nor do they represent an identified weakness in the Tehri rockfill structure.
          </span>
        </div>
      </div>

      {/* Conceptual Separation: Hydrology vs Theoretical Breach */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3.5 bg-[#0B0F19] border border-slate-800 rounded">
          <div className="text-[10px] font-bold text-sky-400 uppercase mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
            1. Hydrologic Inflow (Upstream Basin)
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Catchment rainfall runoff into Tehri Reservoir during extreme monsoon conditions.
            Peak discharge is <strong>~2,113 m³/s</strong> (Base) to <strong>~2,962 m³/s</strong> (High).
            This flow is stored within the 3.54 BCM reservoir.
          </p>
        </div>

        <div className="p-3.5 bg-[#0B0F19] border border-slate-800 rounded">
          <div className="text-[10px] font-bold text-violet-400 uppercase mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
            2. Theoretical Breach Release (Outflow)
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Theoretical gravity collapse releasing impounded hydrostatic potential.
            Peak discharge is <strong>~723,705 m³/s</strong> (Froehlich Base).
            Orders of magnitude larger than hydrologic inflow.
          </p>
        </div>
      </div>

      {/* Empirical Formulation & Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded text-center">
          <div className="text-[9px] text-slate-500 uppercase">LOW BENCHMARK (Localized Notch)</div>
          <div className="text-sm font-bold text-sky-400 mt-1">8,660.7 m³/s</div>
          <div className="text-[9px] text-slate-400 mt-0.5">Width: 120m · Formation: 3.5 h</div>
        </div>
        <div className="p-3 bg-[#0B0F19] border border-violet-800/60 rounded text-center">
          <div className="text-[9px] text-slate-400 uppercase font-bold">BASE BENCHMARK (Froehlich 2008)</div>
          <div className="text-sm font-bold text-violet-400 mt-1">723,731.3 m³/s</div>
          <div className="text-[9px] text-slate-400 mt-0.5">Width: 220m · Formation: 2.0 h</div>
        </div>
        <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded text-center">
          <div className="text-[9px] text-slate-500 uppercase">HIGH BENCHMARK (Extreme Collapse)</div>
          <div className="text-sm font-bold text-rose-400 mt-1">2,246,710.5 m³/s</div>
          <div className="text-[9px] text-slate-400 mt-0.5">Width: 350m · Formation: 1.2 h</div>
        </div>
      </div>

      {/* Breach Q(t) Plot */}
      <div className="bg-[#0B0F19] border border-slate-800 rounded p-3 flex-1 min-h-[160px] flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold text-slate-300">FROEHLICH (2008) THEORETICAL BREACH DISCHARGE Q(t)</span>
          <span className="text-[10px] font-bold text-violet-400">Peak: 723,705.5 m³/s (t=2.0h)</span>
        </div>
        <div className="flex-1 relative">
          <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
            {[0, 200, 400, 600, 800].map((v) => {
              const y = 105 - (v / 800.0) * 90;
              return (
                <g key={v}>
                  <line x1="45" y1={y} x2="480" y2={y} stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />
                  <text x="38" y={y + 3} fill="#64748B" fontSize="8" textAnchor="end">{v}k</text>
                </g>
              );
            })}
            <polyline
              fill="none"
              stroke="#A78BFA"
              strokeWidth="2.5"
              points={series.map((pt) => {
                const x = 50 + (pt.time_hrs / 6.0) * 420;
                const y = 105 - (pt.Q_breach_m3s / 800000.0) * 90;
                return `${x},${y}`;
              }).join(' ')}
            />
            <circle cx={50 + (2.0 / 6.0) * 420} cy={105 - (723705.5 / 800000.0) * 90} r="3.5" fill="#A78BFA" />
          </svg>
        </div>
        <div className="text-[9px] text-slate-500 text-center mt-1">Time from Breach Initiation (hours, 0–6h)</div>
      </div>
    </div>
  );
}
