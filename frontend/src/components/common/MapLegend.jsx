import React from 'react';

export default function MapLegend({
  title = 'Legend',
  items = [],
  className = '',
}) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={`bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 backdrop-blur-md text-xs shadow-lg space-y-2 ${className}`}
    >
      <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
        {title}
      </div>
      <div className="space-y-1.5 font-mono text-[11px]">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {item.color ? (
              <span
                className="w-3 h-3 rounded-xs shrink-0 border border-slate-700"
                style={{ backgroundColor: item.color }}
              />
            ) : item.icon ? (
              <span className="shrink-0">{item.icon}</span>
            ) : null}
            <span className="text-slate-300 font-sans text-xs">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
