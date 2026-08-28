import React from 'react';
import ProvenanceBadge from './ProvenanceBadge';

export default function MetricCard({
  title,
  value,
  unit = '',
  subtitle = '',
  provenance = null,
  icon: Icon = null,
  trend = null, // { direction: 'up'|'down'|'neutral', label: string }
  accentColor = 'cyan', // 'cyan', 'emerald', 'red', 'amber', 'purple', 'slate'
  className = '',
}) {
  const accentTextColors = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    slate: 'text-slate-100',
  };

  return (
    <div
      className={`bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700/80 transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-400 tracking-wide">{title}</span>
        <div className="flex items-center gap-1.5">
          {provenance && <ProvenanceBadge level={provenance} />}
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>

      <div className="my-1">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl sm:text-3xl font-semibold tracking-tight ${accentTextColors[accentColor] || 'text-slate-100'}`}>
            {value}
          </span>
          {unit && <span className="text-xs font-mono text-slate-400">{unit}</span>}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/50 mt-2">
          <span>{subtitle}</span>
          {trend && (
            <span
              className={`font-mono font-medium ${
                trend.direction === 'up'
                  ? 'text-red-400'
                  : trend.direction === 'down'
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
