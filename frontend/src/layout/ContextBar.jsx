import React from 'react';
import { Database, Compass } from 'lucide-react';
import { useRun } from '../context/RunContext';
import ExportMenu from '../components/ExportMenu';

export default function ContextBar({ onOpenTour }) {
  const { selectedRunId, setSelectedRunId, allRuns, currentRun, timeFormatted } = useRun();

  return (
    <header className="h-11 bg-[#0F172A] border-b border-slate-800 px-4 flex items-center justify-between gap-3 shrink-0 select-none text-xs z-30 font-mono">
      {/* Left: Global Mission Telemetry String */}
      <div className="flex items-center gap-2 overflow-x-auto min-w-0">
        <span className="font-extrabold text-sky-400 tracking-wider font-sans text-xs">
          FLOODLAB
        </span>
        <span className="text-slate-600 font-bold">{'//'}</span>

        {/* Global Active Run Selector Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5">
          <Database className="w-3 h-3 text-sky-400 shrink-0" />
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="bg-transparent text-slate-100 font-bold text-[11px] focus:outline-none cursor-pointer pr-4"
          >
            {Object.values(allRuns).map((r) => (
              <option key={r.run_id} value={r.run_id} className="bg-slate-900 text-slate-200">
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-600 font-bold hidden sm:inline">{'//'}</span>

        {/* Dynamic Simulation Time */}
        <div className="hidden sm:flex items-center gap-1 text-slate-200 bg-slate-900/60 border border-slate-800 rounded px-2 py-0.5">
          <span className="text-slate-400 text-[10px]">TIME:</span>
          <span className="font-bold text-sky-300">{timeFormatted}</span>
        </div>

        <span className="text-slate-600 font-bold hidden md:inline">{'//'}</span>

        {/* Solver */}
        <span className="hidden md:inline text-slate-300 font-medium text-[11px]">
          {currentRun.far_field_solver}
        </span>

        <span className="text-slate-600 font-bold hidden lg:inline">{'//'}</span>

        {/* QA State */}
        <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800">
          {currentRun.qa_status}
        </span>

        <span className="text-slate-600 font-bold hidden xl:inline">{'//'}</span>

        {/* Benchmark Tag */}
        <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-950/80 text-amber-400 border border-amber-800">
          WHAT-IF BENCHMARK
        </span>
      </div>

      {/* Right: Validation State & Instant Run Export */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="hidden 2xl:inline text-[10px] text-slate-400 font-sans">
          PHYSICAL VALIDATION: <strong className="text-slate-300 font-mono">NOT AVAILABLE</strong>
        </span>

        <button
          onClick={onOpenTour}
          className="px-2.5 py-1 text-[11px] font-bold bg-sky-950/80 hover:bg-sky-900 text-sky-400 border border-sky-800 rounded transition flex items-center gap-1.5 font-sans"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>GUIDED SCIENCE TOUR</span>
        </button>

        <ExportMenu
          type="extent"
          scenarioId={currentRun?.scenario_id || 'TEHRI_V3_BENCHMARK'}
          label="EXPORT PRODUCTS"
          buttonClassName="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition flex items-center gap-1.5 font-sans"
        />
      </div>
    </header>
  );
}
