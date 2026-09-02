import React from 'react';
import {
  Building2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Compass,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import { INFRA_TYPES, getInfrastructureRisk } from '../../data/prototype/tehriInfrastructure';

export default function InfrastructureInspector({
  asset,
  currentTimeMin,
  onClose,
  onFocusAsset,
}) {
  if (!asset) return null;

  const risk = getInfrastructureRisk(asset, currentTimeMin);
  const typeDef = INFRA_TYPES[asset.type] || { icon: '🏢', label: 'Infrastructure', category: 'General' };

  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 flex flex-col gap-3.5 relative">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl">{typeDef.icon}</span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{asset.name}</h4>
            <p className="text-xs text-[var(--text-secondary)] font-sans">
              {typeDef.category} · {asset.kmFromDam} km from Dam
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Risk Badge */}
      <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-[var(--surface-3)] border border-[var(--surface-border)]">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          Flood Hazard Status
        </span>
        <span
          className="text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded"
          style={{
            color: risk.color,
            backgroundColor: `${risk.color}15`,
            border: `1px solid ${risk.color}40`,
          }}
        >
          {risk.label}
        </span>
      </div>

      {/* Key Attributes */}
      <div className="space-y-2 text-xs">
        <div className="inspector-row">
          <span className="inspector-row__label">Flood Wave Arrival</span>
          <span className="inspector-row__value font-mono">
            {asset.floodArrivalMin ? `T+${asset.floodArrivalMin} min` : 'Physically Safe (High Ridge)'}
          </span>
        </div>

        <div className="inspector-row">
          <span className="inspector-row__label">Road Access State</span>
          <span
            className={`inspector-row__value font-mono ${
              ['FLOODED', 'TAILRACE_FLOODED'].includes(asset.accessRoadStatus)
                ? 'text-[var(--danger)]'
                : ['AT_RISK', 'ACCESS_AT_RISK'].includes(asset.accessRoadStatus)
                ? 'text-[var(--warning)]'
                : 'text-[var(--safe)]'
            }`}
          >
            {asset.accessRoadStatus.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="inspector-row">
          <span className="inspector-row__label">Alternative Ridge Route</span>
          <span className="inspector-row__value flex items-center gap-1.5 font-mono">
            {asset.altAccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--safe)]" />
                <span className="text-[var(--safe)]">Available</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-[var(--danger)]" />
                <span className="text-[var(--danger)]">Unavailable</span>
              </>
            )}
          </span>
        </div>

        <div className="inspector-row">
          <span className="inspector-row__label">HADR Operational Priority</span>
          <span
            className={`inspector-row__value font-bold ${
              asset.hadrPriority === 'CRITICAL'
                ? 'text-[var(--danger)]'
                : asset.hadrPriority === 'HIGH'
                ? 'text-[var(--warning)]'
                : 'text-blue-400'
            }`}
          >
            {asset.hadrPriority}
          </span>
        </div>

        {asset.capacity && (
          <div className="inspector-row">
            <span className="inspector-row__label">Designated Capacity</span>
            <span className="inspector-row__value font-mono">
              {asset.capacity.toLocaleString()} persons (WHAT-IF HYDRODYNAMIC BENCHMARK)
            </span>
          </div>
        )}
      </div>

      {/* Operational Note */}
      {asset.notes && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--surface-1)] p-3 rounded-lg border border-[var(--surface-border)]">
          {asset.notes}
        </p>
      )}

      {/* Provenance footer & focus button */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--surface-border)]">
        <span className="text-[10px] font-mono text-[var(--text-muted)]">
          PROTOTYPE INFRASTRUCTURE FIXTURE
        </span>
        {onFocusAsset && (
          <button
            onClick={() => onFocusAsset(asset)}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
          >
            Center on map →
          </button>
        )}
      </div>
    </div>
  );
}
