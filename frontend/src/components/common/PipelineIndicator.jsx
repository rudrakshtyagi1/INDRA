import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function PipelineIndicator({ className = '' }) {
  const stages = [
    { id: 'inputs', label: 'Inputs' },
    { id: 'breach', label: 'Froehlich Breach' },
    { id: 'sph', label: 'DualSPHysics' },
    { id: 'coupling', label: 'Q(t) Coupling' },
    { id: 'lisflood', label: 'LISFLOOD-FP' },
    { id: 'hadr', label: 'HADR Routing' }
  ];

  return (
    <div className={`p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          COUPLED HYDRODYNAMIC PIPELINE
        </span>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
          V3 MODEL OUTPUT
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] font-mono">
        {stages.map((st, idx) => (
          <React.Fragment key={st.id}>
            <div
              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 shrink-0"
              title={st.label}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span className="text-slate-200 font-medium">{st.label}</span>
            </div>
            {idx < stages.length - 1 && (
              <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
