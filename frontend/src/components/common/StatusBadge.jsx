import React from 'react';

const STATUS_CONFIGS = {
  COMPLETED: {
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    dot: 'bg-emerald-400',
    label: 'COMPLETED',
  },
  COMPLETED_ADAPTER: {
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    dot: 'bg-emerald-400',
    label: 'COMPLETED',
  },
  RUNNING: {
    bg: 'bg-cyan-950/60',
    text: 'text-cyan-400',
    border: 'border-cyan-800/60',
    dot: 'bg-cyan-400 animate-pulse',
    label: 'RUNNING',
  },
  NOT_STARTED: {
    bg: 'bg-slate-900',
    text: 'text-slate-400',
    border: 'border-slate-800',
    dot: 'bg-slate-500',
    label: 'NOT STARTED',
  },
  NOT_RUN: {
    bg: 'bg-slate-900',
    text: 'text-slate-400',
    border: 'border-slate-800',
    dot: 'bg-slate-500',
    label: 'NOT RUN',
  },
  DATA_UNAVAILABLE: {
    bg: 'bg-slate-900',
    text: 'text-slate-500',
    border: 'border-slate-800',
    dot: 'bg-slate-600',
    label: 'DATA UNAVAILABLE',
  },
  FAILED: {
    bg: 'bg-red-950/60',
    text: 'text-red-400',
    border: 'border-red-800/60',
    dot: 'bg-red-400',
    label: 'FAILED',
  },
  INVALID: {
    bg: 'bg-amber-950/60',
    text: 'text-amber-400',
    border: 'border-amber-800/60',
    dot: 'bg-amber-400',
    label: 'INVALID',
  },
  WATCH: {
    bg: 'bg-amber-950/60',
    text: 'text-amber-400',
    border: 'border-amber-800/60',
    dot: 'bg-amber-400',
    label: 'WATCH',
  },
  HIGH: {
    bg: 'bg-red-950/60',
    text: 'text-red-400',
    border: 'border-red-800/60',
    dot: 'bg-red-400 animate-pulse',
    label: 'HIGH ALERT',
  },
  NORMAL: {
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    dot: 'bg-emerald-400',
    label: 'NORMAL',
  },
};

export default function StatusBadge({ status = 'NOT_RUN', label, className = '' }) {
  const norm = (status || 'NOT_RUN').toUpperCase();
  const cfg = STATUS_CONFIGS[norm] || STATUS_CONFIGS.NOT_RUN;
  const displayLabel = label || cfg.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{displayLabel}</span>
    </span>
  );
}
