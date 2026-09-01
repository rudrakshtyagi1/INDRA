import React from 'react';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { PROTOTYPE_METADATA } from '../../data/prototype/tehriPrototypeRun';

/**
 * Compact Scientific Pipeline Indicator
 * Visualizes: Real Inputs -> Hydrology -> Froehlich Breach -> DualSPHysics -> Q(t) Coupling -> Delft3D FM -> HADR Routing
 */
export default function PipelineIndicator({ currentStep = 'delft3d', className = '' }) {
  const stages = PROTOTYPE_METADATA.pipelineStages;

  return (
    <div className={`p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          COUPLED HYDRODYNAMIC PIPELINE
        </span>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
          PRECOMPUTED PROTOTYPE
        </span>
      </div>

      {/* Stage Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] font-mono">
        {stages.map((st, idx) => (
          <React.Fragment key={st.id}>
            <div
              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 shrink-0"
              title={`${st.label}: ${st.detail}`}
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
