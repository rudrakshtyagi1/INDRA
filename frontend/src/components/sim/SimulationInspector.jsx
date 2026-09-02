import React from 'react';
import { Info } from 'lucide-react';
import { useV3Data } from '../../hooks/useV3Data';

function Row({ label, value, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-semibold text-slate-800 tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</p>
      <div className="bg-white rounded-lg border border-slate-200 px-3 py-1">
        {children}
      </div>
    </div>
  );
}

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
  return (
    <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200 overflow-y-auto" style={{ width: 'var(--inspector-width)', flexShrink: 0 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">V3 Model Output</p>
          <span className="status-pill status-pill--warning">WHAT-IF</span>
        </div>
        <h3 className="text-sm font-bold text-slate-900">Simulation Inspector</h3>
      </div>

      <div className="p-4 flex-1">
        <Section title="Scenario">
          <Row label="Name" value="Tehri Dam V3" />
          <Row label="Type" value="Dam-Break Flood" />
          <Row label="Basin" value="Upper Bhagirathi" />
        </Section>

        <Section title="Simulation">
          <Row label="Window" value="800 s" />
          <Row label="Grid Resolution" value="30 m" />
          <Row label="Model Domain" value="15 km" />
          <Row label="Solver" value="LISFLOOD-FP 8.1" />
        </Section>

        <Section title="Model Output">
          <Row label="Road Exposure" value="38.788 km" valueClass="text-orange-600" />
          <Row label="Settlements Intersected" value="0" />
          <Row label="Healthcare Intersected" value="0" />
          <Row label="Bridges Intersected" value="0" />
          <Row label="Power Assets" value="0" />
          <Row label="Wave Reach" value="~8–9 km" />
        </Section>

        <Section title="Provenance">
          <Row label="Terrain" value="Copernicus DEM" />
          <Row label="Near Field" value="DualSPHysics v5.2" />
          <Row label="Downstream" value="LISFLOOD-FP 8.1" />
          <Row label="Roughness" value="Manning n = 0.06" />
          <Row label="Physical Validation" value="NOT AVAILABLE" valueClass="text-amber-600" />
        </Section>

        {/* Warning banner */}
        <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 leading-snug">
            Areas outside the current simulation window are <strong>OUTSIDE CURRENT MODELLED HAZARD WINDOW</strong> — not classified as safe.
          </p>
        </div>
      </div>
    </div>
  );
}
