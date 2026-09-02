import React from 'react';
import { ChevronRight, Database } from 'lucide-react';
import { useRun } from '../context/RunContext';
import ExportMenu from '../components/ExportMenu';

const PAGE_TITLES = {
  overview: 'Command Center',
  simulation: 'Simulation Lab',
  scenarios: 'Scenario Builder',
  exposure: 'Exposure & Vulnerability',
  damage: 'Damage & Loss Assessment',
  hadr: 'HADR Operations',
  satellite: 'Sentinel-1 Observation Lab',
  models_qa: 'Models & Numerical QA',
  data: 'Data & Provenance',
};

export default function ContextBar({ activeTab }) {
  const pageTitle = PAGE_TITLES[activeTab] || 'Command Center';
  const { selectedRunId, setSelectedRunId, allRuns, currentRun } = useRun();

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 z-20 shrink-0 select-none shadow-xs">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-xs min-w-0">
        <span className="text-slate-400 font-semibold tracking-wide uppercase">FloodLab</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
        <span className="font-bold text-slate-800 truncate text-sm">{pageTitle}</span>
      </div>

      {/* Right: Global Run Switcher + Benchmark Provenance + Export */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Run Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
          <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Active Run:
          </span>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer py-0 pr-6"
          >
            {Object.values(allRuns).map((run) => (
              <option key={run.run_id} value={run.run_id}>
                {run.name}
              </option>
            ))}
          </select>
        </div>

        {/* Benchmark Classification Badge */}
        <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
          WHAT-IF BENCHMARK
        </span>

        {/* Validation State Badge */}
        <span className="hidden xl:inline-flex items-center text-[10px] text-slate-400 font-mono">
          PHYSICAL VALIDATION: NOT AVAILABLE
        </span>

        {/* Export Menu for current active run */}
        <ExportMenu
          type="extent"
          scenarioId={currentRun?.scenario_id || 'TEHRI_V3_BENCHMARK'}
          label="Export Run"
          buttonClassName="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 shadow-xs flex items-center gap-1.5 transition"
        />
      </div>
    </header>
  );
}
