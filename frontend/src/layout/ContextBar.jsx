import React from 'react';
import { Download, ChevronRight } from 'lucide-react';

const PAGE_TITLES = {
  overview: 'Overview',
  simulation: 'Simulation Lab',
  comparison: 'Scenario Comparison',
  hadr: 'HADR Routing',
  operations: 'Infrastructure',
  satellite: 'Satellite Monitor',
};

export default function ContextBar({ activeTab, onOpenExport }) {
  const pageTitle = PAGE_TITLES[activeTab] || 'Overview';
  return (
    <header
      style={{ height: 'var(--topbar-height)', flexShrink: 0 }}
      className="flex items-center justify-between px-5 gap-4 bg-white border-b border-[var(--surface-border)] z-10 select-none"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-slate-400 font-medium">FloodLab</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-semibold text-slate-800 truncate">{pageTitle}</span>
      </div>

      {/* Right: scenario info + badge */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-slate-500">Scenario:</span>
          <span className="text-xs font-semibold text-slate-800">Tehri Dam · V3</span>
        </div>
        <div className="hidden md:block w-px h-4 bg-slate-200" />
        <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md">
          WHAT-IF BENCHMARK
        </span>
        <span className="text-[11px] text-slate-400 hidden lg:inline">Physical Validation: NOT AVAILABLE</span>
        {onOpenExport && (
          <button
            onClick={onOpenExport}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        )}
      </div>
    </header>
  );
}
