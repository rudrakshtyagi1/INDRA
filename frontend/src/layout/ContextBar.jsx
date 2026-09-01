import React from 'react';
import { Play, RefreshCw, SlidersHorizontal, Download, Layers } from 'lucide-react';
import { PROTOTYPE_METADATA } from '../data/prototype/tehriPrototypeRun';

export default function ContextBar({
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
  const meta = PROTOTYPE_METADATA;
  const runStatus = isSimulating ? 'running' : simulationResult ? 'done' : 'idle';

  return (
    <header
      style={{ height: 'var(--context-bar-height)', flexShrink: 0 }}
      className="flex items-center justify-between px-5 gap-4 bg-[var(--surface-1)] border-b border-[var(--surface-border)] z-10 select-none"
    >
      {/* Left: Brand mark + scenario selector */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="text-sm font-bold tracking-wider text-[var(--text-primary)] shrink-0">
          Flood<span className="text-blue-400">Lab</span>
        </span>

        <div className="hidden sm:block w-px h-4 bg-[var(--surface-border)]" />

        {/* Scenario selector */}
        <div className="relative hidden sm:flex items-center min-w-0">
          <select
            value={selectedPreset?.id || ''}
            onChange={(e) => onSelectPreset(e.target.value)}
            disabled={isSimulating}
            className="
              appearance-none bg-[var(--surface-2)] border border-[var(--surface-border)] rounded-lg
              pl-3 pr-7 py-1.5 text-xs font-medium text-[var(--text-primary)]
              hover:border-[var(--surface-border-strong)] focus:outline-none focus:border-blue-500
              transition cursor-pointer max-w-[240px] truncate
              disabled:opacity-50
            "
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#131c2c] text-white">
                {p.name}
              </option>
            ))}
          </select>
          <svg className="absolute right-2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Configure button */}
        <button
          onClick={onOpenScenarioDrawer}
          title="Configure scenario parameters"
          className="
            w-8 h-8 rounded-lg flex items-center justify-center
            text-[var(--text-secondary)] hover:text-[var(--text-primary)]
            hover:bg-white/5 border border-[var(--surface-border)] transition
          "
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Center: status & location */}
      <div className="hidden md:flex items-center gap-3">
        {runStatus === 'running' && (
          <span className="status-pill status-pill--running">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Solver Running</span>
          </span>
        )}
        {runStatus === 'done' && (
          <span className="status-pill status-pill--prototype">
            Precomputed Prototype
          </span>
        )}
        {runStatus === 'idle' && (
          <span className="status-pill status-pill--active">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>System Ready</span>
          </span>
        )}
        <span className="text-xs text-[var(--text-secondary)] hidden lg:inline font-sans">
          Tehri Dam · Bhagirathi River · Uttarakhand
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenDem}
          title="Terrain cross-section"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-[var(--surface-border)] transition"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Cross Section</span>
        </button>

        <button
          onClick={onOpenExport}
          title="Export data"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-[var(--surface-border)] transition"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Export GIS</span>
        </button>

        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className="
            flex items-center gap-2 px-4 py-1.5 rounded-lg
            bg-blue-600 hover:bg-blue-500 active:bg-blue-700
            text-white text-xs font-semibold
            transition shadow-md shadow-blue-900/40
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Execute Scenario</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
