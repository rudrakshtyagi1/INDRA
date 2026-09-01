import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Waves,
  FlaskConical,
  ShieldAlert,
  Satellite,
  GitCompare,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview',    label: 'Overview',        icon: LayoutDashboard },
  { id: 'operations',  label: 'Dam & Reservoir', icon: Waves },
  { id: 'simulation',  label: 'Simulation',      icon: FlaskConical },
  { id: 'hadr',        label: 'HADR Mission',    icon: ShieldAlert },
  { id: 'satellite',   label: 'Satellite SAR',   icon: Satellite },
  { id: 'comparison',  label: 'Verification',    icon: GitCompare },
];

export default function NavigationRail({ activeTab, onSelectTab }) {
  return (
    <nav
      style={{ width: 'var(--nav-width)', flexShrink: 0 }}
      className="h-full flex flex-col bg-[var(--surface-2)] border-r border-[var(--surface-border)] z-20 select-none"
    >
      {/* Brand mark */}
      <div className="h-12 flex items-center justify-center border-b border-[var(--surface-border)] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-inner">
          <Waves className="w-4 h-4 text-blue-400" />
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 flex flex-col items-center py-4 gap-2 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelectTab(id)}
              title={label}
              className={`
                group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150
                ${isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent'
                }
              `}
            >
              {/* Active left indicator */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-accent"
                  className="absolute -left-[1px] top-2.5 bottom-2.5 w-1 bg-blue-400 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-5 h-5" />

              {/* High-readability Tooltip */}
              <span className="
                absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                bg-[var(--surface-3)] border border-[var(--surface-border-strong)] text-[var(--text-primary)]
                whitespace-nowrap shadow-2xl
                opacity-0 pointer-events-none group-hover:opacity-100
                transition-opacity duration-150 z-50
              ">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* System Status Indicator */}
      <div className="h-12 flex items-center justify-center border-t border-[var(--surface-border)] shrink-0">
        <div
          title="FastAPI Backend Online"
          className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"
        />
      </div>
    </nav>
  );
}
