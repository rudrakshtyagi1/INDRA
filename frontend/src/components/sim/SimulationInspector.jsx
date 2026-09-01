import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Compass,
  X,
} from 'lucide-react';
import ExposurePanel from '../exposure/ExposurePanel';
import InfrastructureSummaryCard from '../infrastructure/InfrastructureSummaryCard';
import InfrastructureInspector from '../infrastructure/InfrastructureInspector';
import SelectedAreaInspector from '../exposure/SelectedAreaInspector';

export default function SimulationInspector({
  currentTimeMin,
  selectedAsset,
  onSelectAsset,
  selectedArea,
  onClearSelectedArea,
  onSelectRadius,
  onSelectSettlement,
  onFocusAsset,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('exposure'); // 'exposure' | 'infra' | 'area' | 'asset'

  // Automatically switch tab if an asset or area is selected
  useEffect(() => {
    if (selectedAsset) {
      setActiveTab('asset');
    }
  }, [selectedAsset]);

  useEffect(() => {
    if (selectedArea) {
      setActiveTab('area');
    }
  }, [selectedArea]);

  return (
    <div className="h-full flex flex-col bg-[var(--surface-2)] border-l border-[var(--surface-border)] overflow-hidden">
      {/* Top Tab Bar */}
      <div className="h-11 px-3 flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface-1)] shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('exposure')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'exposure'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Population Exposure</span>
          </button>

          <button
            onClick={() => setActiveTab('infra')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'infra'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Infrastructure</span>
          </button>

          {selectedArea && (
            <button
              onClick={() => setActiveTab('area')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'area'
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Query Area</span>
            </button>
          )}

          {selectedAsset && (
            <button
              onClick={() => setActiveTab('asset')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'asset'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Asset Detail</span>
            </button>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition shrink-0"
            title="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab Content Container */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'exposure' && (
          <ExposurePanel
            currentTimeMin={currentTimeMin}
            onSelectSettlement={onSelectSettlement}
          />
        )}

        {activeTab === 'infra' && (
          <InfrastructureSummaryCard
            currentTimeMin={currentTimeMin}
            onSelectAsset={onSelectAsset}
            onFocusAsset={onFocusAsset}
          />
        )}

        {activeTab === 'area' && (
          <SelectedAreaInspector
            selectedArea={selectedArea}
            onClear={onClearSelectedArea}
            onSelectRadius={onSelectRadius}
          />
        )}

        {activeTab === 'asset' && selectedAsset && (
          <InfrastructureInspector
            asset={selectedAsset}
            currentTimeMin={currentTimeMin}
            onClose={() => setActiveTab('infra')}
            onFocus={onFocusAsset}
          />
        )}
      </div>
    </div>
  );
}
