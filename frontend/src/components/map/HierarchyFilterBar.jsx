import React from 'react';
import {
  Filter,
  Layers,
  MapPin,
  AlertTriangle,
  Search,
  Shield,
  X,
  Compass,
} from 'lucide-react';
import {
  ADMINISTRATIVE_DISTRICTS,
  ADMINISTRATIVE_TEHSILS,
} from '../../data/prototype/tehriAdministrativeHierarchy';

export default function HierarchyFilterBar({
  zoomLevel = 11,
  filters,
  onFilterChange,
  settlements = [],
  activeSettlementId,
  onSelectSettlementId,
}) {
  const getScaleLabel = (zoom) => {
    if (zoom <= 9) return { label: 'Full Domain', sub: 'District Boundaries & Regional Towns', color: 'text-blue-400' };
    if (zoom <= 12) return { label: 'Corridor Scale', sub: 'Settlement Clusters & Key Facilities', color: 'text-amber-400' };
    return { label: 'Immediate Impact', sub: 'Individual High-Risk Settlements & Roads', color: 'text-emerald-400' };
  };

  const scale = getScaleLabel(zoomLevel);

  return (
    <div className="floating-control p-2 flex flex-wrap items-center gap-2 max-w-full z-10 select-none">
      {/* Zoom Scale Context Pill */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-3)] border border-[var(--surface-border)] shrink-0">
        <Compass className={`w-3.5 h-3.5 ${scale.color}`} />
        <span className="text-xs font-semibold text-[var(--text-primary)]">{scale.label}</span>
        <span className="text-[10px] font-mono text-[var(--text-muted)]">(Z{zoomLevel})</span>
      </div>

      {/* District Filter Dropdown */}
      <div className="flex items-center gap-1 shrink-0">
        <select
          value={filters.district || 'all'}
          onChange={(e) => {
            onFilterChange({ ...filters, district: e.target.value, tehsil: 'all' });
          }}
          className="
            bg-[var(--surface-2)] border border-[var(--surface-border)] rounded-md
            px-2.5 py-1 text-xs text-[var(--text-primary)] font-medium
            hover:border-[var(--surface-border-strong)] focus:outline-none focus:border-blue-500
            transition cursor-pointer
          "
        >
          {ADMINISTRATIVE_DISTRICTS.map((d) => (
            <option key={d.id} value={d.id} className="bg-[#131c2c] text-white">
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tehsil / Block Filter Dropdown */}
      <div className="flex items-center gap-1 shrink-0">
        <select
          value={filters.tehsil || 'all'}
          onChange={(e) => onFilterChange({ ...filters, tehsil: e.target.value })}
          className="
            bg-[var(--surface-2)] border border-[var(--surface-border)] rounded-md
            px-2.5 py-1 text-xs text-[var(--text-primary)] font-medium
            hover:border-[var(--surface-border-strong)] focus:outline-none focus:border-blue-500
            transition cursor-pointer
          "
        >
          {ADMINISTRATIVE_TEHSILS.filter(
            (t) => filters.district === 'all' || t.districtId === 'all' || t.districtId === filters.district
          ).map((t) => (
            <option key={t.id} value={t.id} className="bg-[#131c2c] text-white">
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Risk State Filter Dropdown */}
      <div className="flex items-center gap-1 shrink-0">
        <select
          value={filters.riskState || 'all'}
          onChange={(e) => onFilterChange({ ...filters, riskState: e.target.value })}
          className="
            bg-[var(--surface-2)] border border-[var(--surface-border)] rounded-md
            px-2.5 py-1 text-xs text-[var(--text-primary)] font-medium
            hover:border-[var(--surface-border-strong)] focus:outline-none focus:border-blue-500
            transition cursor-pointer
          "
        >
          <option value="all" className="bg-[#131c2c]">All Risk States</option>
          <option value="CRITICAL" className="bg-[#131c2c]">Critical Risk (T &lt; 30m)</option>
          <option value="HIGH" className="bg-[#131c2c]">High Risk (T 30–60m)</option>
          <option value="MODERATE" className="bg-[#131c2c]">Moderate / Downstream</option>
        </select>
      </div>

      {/* Target Settlement Selector */}
      {settlements.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={activeSettlementId || ''}
            onChange={(e) => onSelectSettlementId?.(e.target.value)}
            className="
              bg-[var(--surface-2)] border border-blue-500/40 rounded-md
              px-2.5 py-1 text-xs text-blue-300 font-semibold
              hover:border-blue-500 focus:outline-none
              transition cursor-pointer max-w-[170px] truncate
            "
          >
            <option value="" className="bg-[#131c2c] text-slate-400">Jump to Target...</option>
            {settlements.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#131c2c] text-white">
                {s.name} (T+{s.arrivalMin}m)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Active Filter Clear */}
      {(filters.district !== 'all' || filters.tehsil !== 'all' || filters.riskState !== 'all' || activeSettlementId) && (
        <button
          onClick={() => {
            onFilterChange({ district: 'all', tehsil: 'all', riskState: 'all', searchQuery: '' });
            onSelectSettlementId?.('');
          }}
          className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-[var(--text-secondary)] transition shrink-0"
          title="Clear all filters"
        >
          <X className="w-3 h-3" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
}
