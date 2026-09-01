import React, { useState } from 'react';
import {
  Compass,
  Users,
  Building2,
  MapPin,
  AlertTriangle,
  X,
  Activity,
  Home,
  Navigation,
  Shield,
  Zap,
} from 'lucide-react';
import { INFRA_TYPES } from '../../data/prototype/tehriInfrastructure';

export default function SelectedAreaInspector({
  selectedArea,
  onClearSelection,
  onSelectRadius,
  onSelectSettlement,
  onSelectInfra,
}) {
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'health' | 'shelter' | 'transport'

  if (!selectedArea) return null;

  const healthcare = selectedArea.healthcareList || [];
  const shelters = selectedArea.sheltersList || [];
  const bridges = selectedArea.bridgesList || [];
  const roads = selectedArea.roadsList || [];
  const power = selectedArea.powerList || [];
  const settlements = selectedArea.settlementsList || [];

  return (
    <div className="flex flex-col select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-[var(--surface-border)] flex items-center justify-between bg-[var(--surface-1)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--text-primary)]">
              Spatial Buffer Query
            </h4>
            <p className="text-[10px] text-[var(--text-muted)] font-mono">
              Center: [{selectedArea.center[0].toFixed(3)}°N, {selectedArea.center[1].toFixed(3)}°E]
            </p>
          </div>
        </div>
        <button
          onClick={onClearSelection}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition"
          title="Clear query buffer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Radius Buffer Selector */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface-2)]">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Query Radius</span>
        <div className="flex items-center gap-1.5">
          {[3, 5, 10].map((r) => (
            <button
              key={r}
              onClick={() => onSelectRadius?.(r)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                selectedArea.radiusKm === r
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* Primary Quantitative Metric Cards */}
      <div className="p-4 grid grid-cols-2 gap-2.5 border-b border-[var(--surface-border)]">
        {/* Total & Flooded Area */}
        <div className="p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--surface-border)] space-y-0.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Buffer Footprint</p>
          <p className="text-base font-bold font-mono text-[var(--text-primary)]">
            {selectedArea.totalAreaKm2} <span className="text-xs font-normal text-[var(--text-muted)]">km²</span>
          </p>
          <p className="text-[11px] text-blue-400 font-mono">
            {selectedArea.floodedKm2} km² ({selectedArea.floodedPercent}%) flooded
          </p>
        </div>

        {/* Population Breakdown */}
        <div className="p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--surface-border)] space-y-0.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Currently Exposed</p>
          <p className={`text-base font-bold font-mono ${selectedArea.exposedPop > 0 ? 'text-[var(--danger)]' : 'text-[var(--safe)]'}`}>
            {selectedArea.exposedPop.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] font-mono">
            of {selectedArea.totalPopInRadius.toLocaleString()} in radius
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-3 pt-2 flex items-center gap-1 border-b border-[var(--surface-border)] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
            activeCategory === 'all'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          All ({selectedArea.settlementsCount + selectedArea.infraCount})
        </button>
        <button
          onClick={() => setActiveCategory('health')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
            activeCategory === 'health'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Healthcare ({healthcare.length})
        </button>
        <button
          onClick={() => setActiveCategory('transport')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
            activeCategory === 'transport'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Bridges &amp; Roads ({bridges.length + roads.length})
        </button>
        <button
          onClick={() => setActiveCategory('shelter')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
            activeCategory === 'shelter'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Shelters ({shelters.length})
        </button>
      </div>

      {/* Detailed Items List */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {/* Settlements */}
        {(activeCategory === 'all' || activeCategory === 'settlements') && settlements.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Intersected Settlements ({settlements.length})
            </p>
            {settlements.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSettlement?.(s)}
                className="w-full p-2 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--surface-3)]/80 border border-[var(--surface-border)] flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {s.name}
                  </span>
                </div>
                <div className="text-right font-mono shrink-0 ml-2">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {s.population.toLocaleString()} pop · T+{s.arrivalMin}m
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Healthcare */}
        {(activeCategory === 'all' || activeCategory === 'health') && healthcare.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Healthcare Facilities ({healthcare.length})
            </p>
            {healthcare.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelectInfra?.(a)}
                className="w-full p-2.5 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--surface-3)]/80 border border-[var(--surface-border)] flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">🏥</span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {a.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">
                      {a.distKm.toFixed(1)} km from query center
                    </p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded shrink-0 ml-2"
                  style={{
                    color: a.risk.color,
                    backgroundColor: `${a.risk.color}15`,
                    border: `1px solid ${a.risk.color}40`,
                  }}
                >
                  {a.risk.state.replace(/_/g, ' ')}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Bridges & Roads */}
        {(activeCategory === 'all' || activeCategory === 'transport') && (bridges.length > 0 || roads.length > 0) && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Transport Corridors &amp; Bridges ({bridges.length + roads.length})
            </p>
            {[...bridges, ...roads].map((a) => (
              <button
                key={a.id}
                onClick={() => onSelectInfra?.(a)}
                className="w-full p-2.5 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--surface-3)]/80 border border-[var(--surface-border)] flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{a.type === 'bridge' ? '🌉' : '🛣️'}</span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {a.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">
                      {a.distKm.toFixed(1)} km · {a.accessRoadStatus.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded shrink-0 ml-2"
                  style={{
                    color: a.risk.color,
                    backgroundColor: `${a.risk.color}15`,
                    border: `1px solid ${a.risk.color}40`,
                  }}
                >
                  {a.risk.state.replace(/_/g, ' ')}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Relief Shelters */}
        {(activeCategory === 'all' || activeCategory === 'shelter') && shelters.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Relief Shelters ({shelters.length})
            </p>
            {shelters.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelectInfra?.(a)}
                className="w-full p-2.5 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--surface-3)]/80 border border-[var(--surface-border)] flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">⛺</span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {a.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">
                      Capacity: {a.capacity?.toLocaleString() || 1500}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded shrink-0 ml-2"
                  style={{
                    color: a.risk.color,
                    backgroundColor: `${a.risk.color}15`,
                    border: `1px solid ${a.risk.color}40`,
                  }}
                >
                  {a.risk.state.replace(/_/g, ' ')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Provenance Footer */}
      <div className="p-3 bg-[var(--surface-1)] border-t border-[var(--surface-border)]">
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-sans">
          PROTOTYPE EXPOSURE · Spatial buffer query. Real system: zonal raster statistics across WorldPop / GHSL.
        </p>
      </div>
    </div>
  );
}
