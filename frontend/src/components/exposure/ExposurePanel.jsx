import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronRight, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import {
  getCurrentlyExposed,
  getCumulativeExposed,
  getProjectedExposed,
  getNextPrioritySettlement,
  getDistrictExposure,
} from '../../data/prototype/tehriPopulationExposure';

function ExposureMetricCard({ label, value, sub, color = 'text-[var(--text-primary)]', provenance }) {
  return (
    <div className="p-3.5 rounded-xl bg-[var(--surface-3)] border border-[var(--surface-border)] space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
        {provenance && (
          <span className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--surface-border)]">
            {provenance}
          </span>
        )}
      </div>
      <p className={`text-xl font-bold font-mono tabular-nums leading-tight ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-[11px] text-[var(--text-muted)] font-sans">{sub}</p>}
    </div>
  );
}

export default function ExposurePanel({ currentTimeMin, onSelectSettlement }) {
  const currently = getCurrentlyExposed(currentTimeMin);
  const cumulative = getCumulativeExposed(currentTimeMin);
  const projected = getProjectedExposed();
  const nextPriority = getNextPrioritySettlement(currentTimeMin);
  const districts = getDistrictExposure(currentTimeMin);

  const timeLabel = currentTimeMin < 60
    ? `T+${currentTimeMin}m`
    : `T+${Math.floor(currentTimeMin / 60)}h ${currentTimeMin % 60}m`;

  return (
    <div className="flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-[var(--surface-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Population Exposure Analysis
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            {timeLabel}
          </span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">
          PROTOTYPE SETTLEMENT-CENTROID EXPOSURE · NOT WORLDPOP/GHSL RASTER-DERIVED
        </p>
      </div>

      {/* 3 Key Exposure Metric Cards */}
      <div className="space-y-2.5">
        <ExposureMetricCard
          label="CURRENTLY EXPOSED"
          sub={`Inside active flood footprint at ${timeLabel}`}
          value={currently.total}
          color={currently.total > 0 ? 'text-[var(--danger)]' : 'text-[var(--safe)]'}
          provenance="PROTOTYPE EXPOSURE"
        />
        <ExposureMetricCard
          label="CUMULATIVE EXPOSED"
          sub="Total inundated population from T+0 to current step"
          value={cumulative.total}
          color="text-[var(--warning)]"
          provenance="PROTOTYPE EXPOSURE"
        />
        <ExposureMetricCard
          label="PROJECTED SCENARIO EXPOSURE"
          sub="Maximum 145 km corridor scenario inundation footprint"
          value={projected.total}
          color="text-slate-300"
          provenance="PROTOTYPE EXPOSURE"
        />
      </div>

      <p className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-1)] p-2.5 rounded-lg border border-[var(--surface-border)] leading-relaxed">
        <strong>Data Note:</strong> Settlement centroid approximation. Real-time WorldPop / GHSL raster integration is disconnected; population values are precomputed planning prototypes.
      </p>

      {/* Immediate Next Priority Target */}
      {nextPriority && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Next Approaching Target</span>
            </span>
            <span className="text-xs font-mono font-bold text-amber-300">
              T+{nextPriority.arrivalMin}m
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">{nextPriority.name}</p>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                {nextPriority.kmFromDam} km from Dam · {nextPriority.population.toLocaleString()} pop
              </p>
            </div>
            {onSelectSettlement && (
              <button
                onClick={() => onSelectSettlement(nextPriority)}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition"
              >
                Focus
              </button>
            )}
          </div>
        </div>
      )}

      {/* District-wise Breakdown */}
      <div className="pt-2 border-t border-[var(--surface-border)] space-y-2">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">
          District-Level Exposure ({timeLabel})
        </p>
        <div className="space-y-1.5">
          {districts.map((d) => (
            <div
              key={d.id}
              className="p-2.5 rounded-lg bg-[var(--surface-3)] border border-[var(--surface-border)] flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">{d.name}</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {d.settlementCount} monitored settlements
                </p>
              </div>
              <div className="text-right font-mono">
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  {d.exposedPop.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {d.exposedSettlements.length} active
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
