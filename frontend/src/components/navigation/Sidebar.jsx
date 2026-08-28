import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Waves,
  FlaskConical,
  ShieldAlert,
  Satellite,
  GitCompare,
  Database,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
} from 'lucide-react';

const MAIN_NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'operations', label: 'Dam Operations', icon: Waves },
  { id: 'simulation', label: 'Simulation Lab', icon: FlaskConical },
  { id: 'hadr', label: 'HADR Response', icon: ShieldAlert },
  { id: 'satellite', label: 'Satellite', icon: Satellite },
  { id: 'comparison', label: 'Comparison', icon: GitCompare },
];

const SECONDARY_NAV = [
  { id: 'elevation', label: 'Terrain & DEM', icon: Layers },
  { id: 'data_status', label: 'Data Provenance', icon: Database },
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onOpenDem,
  onOpenExport,
}) {
  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none z-30 sticky top-0"
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Waves className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col"
              >
                <span className="font-bold text-sm tracking-wide text-slate-100 font-mono">
                  FLOOD<span className="text-cyan-400">LAB</span>
                </span>
                <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                  Disaster Ops Center
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Main Navigation List */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            {!isCollapsed && 'Operational Modules'}
          </div>
          {MAIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Secondary Navigation */}
        <div className="p-3 space-y-1 border-t border-slate-900">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            {!isCollapsed && 'System Utilities'}
          </div>
          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'elevation') onOpenDem();
                  if (item.id === 'data_status') onOpenExport();
                }}
                title={isCollapsed ? item.label : undefined}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors"
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Collapse Toggle & Operational Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 space-y-2">
        {!isCollapsed && (
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-mono">TELEMETRY LINK</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">Himalayan Reach PostGIS</p>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition text-xs"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
