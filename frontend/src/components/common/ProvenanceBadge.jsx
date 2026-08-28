import React from 'react';

const PROVENANCE_STYLES = {
  OBSERVED: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400',
    label: 'OBSERVED',
    desc: 'Direct sensor / satellite EO acquisition',
  },
  REPORTED: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    label: 'REPORTED',
    desc: 'Official published government / operator specification',
  },
  MODELLED: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400',
    label: 'MODELLED',
    desc: 'DualSPHysics / Delft3D FM / empirical physics solver output',
  },
  ASSUMED: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    label: 'ASSUMED',
    desc: 'Manually specified parameter or analyst judgment',
  },
  DERIVED: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    label: 'DERIVED',
    desc: 'Computed transformation from upstream sources',
  },
};

export default function ProvenanceBadge({ level = 'MODELLED', source = '', tooltip = '' }) {
  const normLevel = (level || 'MODELLED').toUpperCase();
  const cfg = PROVENANCE_STYLES[normLevel] || PROVENANCE_STYLES.MODELLED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
      title={tooltip || `${cfg.desc}${source ? ` (${source})` : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {normLevel}
      {source && <span className="opacity-60 text-[10px]">[{source}]</span>}
    </span>
  );
}
