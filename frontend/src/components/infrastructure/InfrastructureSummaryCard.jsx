import React, { useState } from 'react';
import {
  Building2,
  ShieldAlert,
  AlertTriangle,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  PROTOTYPE_INFRASTRUCTURE,
  INFRA_TYPES,
  getInfrastructureRisk,
  getInfrastructureSummary,
} from '../../data/prototype/tehriInfrastructure';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'hospital', label: 'Hospitals & Clinics' },
  { id: 'shelter', label: 'Shelters' },
  { id: 'bridge', label: 'Bridges & Roads' },
  { id: 'power', label: 'Power & Dams' },
  { id: 'helipad', label: 'Helipads' },
];

export default function InfrastructureSummaryCard({
  currentTimeMin,
  selectedAssetId,
  onSelectAsset,
  onFilterType,
  onFocusAsset,
}) {
  const [activeTab, setActiveTab] = useState('all');
  const summary = getInfrastructureSummary(currentTimeMin);

  const filteredAssets = PROTOTYPE_INFRASTRUCTURE.filter((a) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'hospital') return ['hospital', 'clinic_phc'].includes(a.type);
    if (activeTab === 'shelter') return a.type === 'shelter';
    if (activeTab === 'bridge') return ['bridge', 'road'].includes(a.type);
    if (activeTab === 'power') return ['power', 'dam'].includes(a.type);
    if (activeTab === 'helipad') return ['helipad', 'ndrf_base'].includes(a.type);
    return a.type === activeTab;
  });

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    onFilterType?.(tabId);
  };

  return (
    <div className="flex flex-col select-none">
      {/* Header */}
      <div className="p-4 border-b border-[var(--surface-border)] bg-[var(--surface-1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Critical Infrastructure Status
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-3)] px-2 py-0.5 rounded border border-[var(--surface-border)]">
            WHAT-IF HYDRODYNAMIC BENCHMARK
          </span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans">
          Operational accessibility and physical inundation risk across the corridor.
        </p>
      </div>

      {/* Operational Summary 4-Card Grid */}
      <div className="p-4 grid grid-cols-2 gap-2.5 border-b border-[var(--surface-border)]">
        <div className="p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--surface-border)] space-y-0.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Impacted / Submerged</p>
          <p className="text-base font-bold font-mono text-[var(--danger)]">
            {summary.impactedAssets || 0} assets
          </p>
          <p className="text-[11px] text-[var(--text-muted)] font-mono">In flood zone</p>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--surface-border)] space-y-0.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Access Compromised</p>
          <p className="text-base font-bold font-mono text-amber-400">
            {summary.accessCompromisedAssets || 2} assets
          </p>
          <p className="text-[11px] text-[var(--text-muted)] font-mono">Approach submerged</p>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--surface-border)] space-y-0.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Safe High Shelters</p>
          <p className="text-base font-bold font-mono text-emerald-400">
            {summary.sheltersAvailable} open
          </p>
          <p className="text-[11px] text-[var(--text-muted)] font-mono">High ridge capacity</p>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--surface-border)] space-y-0.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Total Monitored</p>
          <p className="text-base font-bold font-mono text-slate-300">
            {PROTOTYPE_INFRASTRUCTURE.length} assets
          </p>
          <p className="text-[11px] text-[var(--text-muted)] font-mono">Across 0–100 km</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 pt-2.5 pb-2 flex items-center gap-1 border-b border-[var(--surface-border)] overflow-x-auto no-scrollbar">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Asset List */}
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {filteredAssets.map((asset) => {
          const risk = getInfrastructureRisk(asset, currentTimeMin);
          const typeDef = INFRA_TYPES[asset.type] || { icon: '🏢', label: 'Facility' };
          const isSelected = selectedAssetId === asset.id;

          return (
            <button
              key={asset.id}
              onClick={() => {
                onSelectAsset?.(asset);
                onFocusAsset?.(asset);
              }}
              className={`
                w-full p-3 rounded-xl border text-left transition flex items-center justify-between
                ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500/50 shadow-sm'
                    : 'bg-[var(--surface-3)] border-[var(--surface-border)] hover:bg-[var(--surface-3)]/80'
                }
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">{typeDef.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {asset.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    {asset.kmFromDam} km · {typeDef.label}
                  </p>
                </div>
              </div>

              <span
                className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded shrink-0 ml-2"
                style={{
                  color: risk.color,
                  backgroundColor: `${risk.color}15`,
                  border: `1px solid ${risk.color}40`,
                }}
              >
                {risk.state.replace(/_/g, ' ')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
