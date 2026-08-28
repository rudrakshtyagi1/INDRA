import React from 'react';
import {
  Play,
  SlidersHorizontal,
  Download,
  Activity,
  Layers,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function Topbar({
  selectedPreset,
  presets = [],
  onSelectPreset,
  simulationResult,
  isSimulating,
  onRunSimulation,
  onOpenScenarioDrawer,
  onOpenDem,
  onOpenExport,
}) {
  const runId = simulationResult?.run_id ? simulationResult.run_id.slice(0, 10) : 'NOT RUN';
  const solverStatus = isSimulating
    ? 'RUNNING'
    : simulationResult
    ? 'COMPLETED'
    : 'NOT_RUN';

  return (
    <header className="h-16 px-6 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-20 select-none">
      {/* Left: Active Scenario Picker & Run State */}
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Scenario Dropdown */}
        <div className="relative flex items-center">
          <select
            value={selectedPreset?.id || ''}
            onChange={(e) => onSelectPreset(e.target.value)}
            disabled={isSimulating}
            className="appearance-none bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 pr-8 text-xs font-semibold text-slate-100 hover:border-slate-700 focus:outline-none focus:border-cyan-500 transition cursor-pointer max-w-xs sm:max-w-md truncate"
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
        </div>

        {/* Scenario Config Drawer Trigger */}
        <button
          onClick={onOpenScenarioDrawer}
          title="Configure Scenario Parameters"
          className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {/* Global Run ID Badge */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono text-slate-400">
          <span className="text-slate-400">RUN:</span>
          <span className="text-cyan-400 font-semibold">{runId}</span>
        </div>

        <StatusBadge status={solverStatus} />
      </div>

      {/* Right: Quick Actions & Primary CTA */}
      <div className="flex items-center gap-2.5">
        {/* Elevation Profile Trigger */}
        <button
          onClick={onOpenDem}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-slate-100 transition"
        >
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Cross-Section</span>
        </button>

        {/* Export Modal Trigger */}
        <button
          onClick={onOpenExport}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-slate-100 transition"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export Manifest</span>
        </button>

        {/* Primary CTA: Run Simulation */}
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-slate-950 font-semibold text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Run Simulation</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
