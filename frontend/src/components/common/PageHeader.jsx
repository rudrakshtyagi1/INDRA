import React from 'react';
import StatusBadge from './StatusBadge';

export default function PageHeader({
  title,
  subtitle,
  category = 'EMERGENCY OPERATIONS',
  status = null,
  statusLabel = null,
  actions = null,
  metadata = null,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
      <div className="space-y-1.5 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2.5">
          {category && (
            <span className="text-[11px] font-mono font-semibold tracking-wider text-cyan-400 uppercase">
              {category}
            </span>
          )}
          {status && <StatusBadge status={status} label={statusLabel} />}
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-400 leading-relaxed">{subtitle}</p>}
        {metadata && <div className="pt-1 flex flex-wrap items-center gap-3">{metadata}</div>}
      </div>

      {actions && <div className="flex items-center gap-3 shrink-0 self-start md:self-center">{actions}</div>}
    </div>
  );
}
