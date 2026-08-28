import React from 'react';
import { Layers, Play, AlertCircle, FileQuestion } from 'lucide-react';

export default function EmptyState({
  title = 'No Data Available',
  description = 'There is currently no active simulation or data stream loaded for this view.',
  icon: Icon = FileQuestion,
  action = null,
  className = '',
}) {
  return (
    <div
      className={`bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-4 my-8 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
        <Icon className="w-7 h-7" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-slate-200">{title}</h3>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
