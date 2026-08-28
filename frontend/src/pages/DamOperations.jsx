import React, { useState } from 'react';
import {
  Layers,
  Sliders,
  Play,
  Waves,
  ShieldAlert,
  Flame,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  Maximize2,
  FileText,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import Panel from '../components/common/Panel';
import StatusBadge from '../components/common/StatusBadge';
import ProvenanceBadge from '../components/common/ProvenanceBadge';
import HydrographChart from '../components/charts/HydrographChart';
import { formatFinite } from '../utils/units';

export default function DamOperations({
  selectedPreset,
  simulationResult,
  onOpenScenarioDrawer,
  onRunSimulation,
  isSimulating,
}) {
  const [showTechDetails, setShowTechDetails] = useState(false);

  const damName = selectedPreset?.dam_name || 'Tehri Dam';
  const damHeight = selectedPreset?.dam_height_m || 260.5;
  const hydraulicHead = selectedPreset?.hydraulic_head_m || 260.0;
  const grossStorageM3 = selectedPreset?.reservoir_volume_m3 || 3.54e9;
  const crestLength = selectedPreset?.crest_length_m || 575.0;

  const breach = simulationResult?.breach_mechanics || {};
  const peakFlow = breach.peak_discharge_m3s || 84200.0;
  const hydroTimes = breach.hydrograph_times || [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0];
  const hydroFlows = breach.hydrograph_flows || [0, 12000, 48000, 84200, 62000, 38000, 21000, 8500, 2400, 500];

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        category="RESERVOIR HYDRAULICS &bull; DAM EMBANKMENT SAFETY"
        title={`${damName} Structural &amp; Hydraulic Profile`}
        subtitle="Reservoir storage-elevation curves, spillway discharge capacity, and empirical breach outflow synthesis."
        status="COMPLETED"
        statusLabel="TELEMETRY ONLINE"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showTechDetails ? 'Hide Technical Details' : 'View Technical Details'}</span>
            </button>
            <button
              onClick={onOpenScenarioDrawer}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Scenario</span>
            </button>
          </div>
        }
      />

      {/* Top 4 Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Structural Dam Height (hd)"
          value={formatFinite(damHeight, 1)}
          unit="meters"
          subtitle="Zoned Earth & Rockfill Embankment"
          provenance="REPORTED"
          accentColor="cyan"
          icon={Layers}
        />
        <MetricCard
          title="Operating Head (hw)"
          value={formatFinite(hydraulicHead, 1)}
          unit="meters"
          subtitle="Full Reservoir Level: 830.0m MSL"
          provenance="REPORTED"
          accentColor="purple"
          icon={Waves}
        />
        <MetricCard
          title="Gross Storage Capacity"
          value={formatFinite(grossStorageM3 / 1e9, 2)}
          unit="BCM"
          subtitle="Live Storage: 2.62 BCM"
          provenance="REPORTED"
          accentColor="emerald"
          icon={Activity}
        />
        <MetricCard
          title="Synthesized Peak Qp"
          value={formatFinite(peakFlow, 0)}
          unit="m³/s"
          subtitle="Breach Outflow Wave Peak"
          provenance="MODELLED"
          accentColor="red"
          icon={TrendingUp}
        />
      </div>

      {/* Collapsible Technical Details Panel */}
      {showTechDetails && (
        <Panel
          title="Official Dam Technical Specifications"
          subtitle="Reported by THDC India Limited &amp; Central Water Commission (CWC)"
          icon={FileText}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Crest Elevation</span>
              <span className="text-slate-100 font-bold">839.5 m MSL</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Crest Length</span>
              <span className="text-slate-100 font-bold">{crestLength} m</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">River Bed MSL</span>
              <span className="text-slate-100 font-bold">570.0 m MSL</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Hydropower Capacity</span>
              <span className="text-cyan-400 font-bold">2,400 MW</span>
            </div>
          </div>
        </Panel>
      )}

      {/* Main Embankment Cross-Section Canvas + Live Hydrograph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 65%: Embankment Cross-Section */}
        <div className="lg:col-span-7 space-y-4">
          <Panel
            title="Embankment Structural Geometry &amp; Reservoir Cross-Section"
            subtitle="Zoned earth-rockfill embankment with impervious central clay core (1:1.4 slope)"
            icon={Layers}
            noPadding
          >
            <div className="relative w-full h-80 bg-slate-950 p-4 flex flex-col justify-between overflow-hidden">
              <svg viewBox="0 0 700 260" className="w-full h-full">
                {/* Reservoir Water Body */}
                <polygon points="20,70 240,70 240,210 20,210" fill="#0284c7" fillOpacity="0.3" />
                <line x1="20" y1="70" x2="240" y2="70" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4,4" />
                <text x="30" y="62" fill="#38bdf8" fontSize="11" fontFamily="monospace">
                  {`Reservoir FRL: 830.0 m MSL (hw = ${hydraulicHead} m)`}
                </text>

                {/* Dam Embankment Trapezoid */}
                <polygon points="140,210 280,50 340,50 560,210" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />

                {/* Impervious Clay Core */}
                <polygon points="280,210 300,50 320,50 340,210" fill="#334155" stroke="#64748b" strokeWidth="1.5" strokeDasharray="2,2" />

                {/* Crest Annotations */}
                <line x1="280" y1="40" x2="340" y2="40" stroke="#f8fafc" strokeWidth="1.5" />
                <text x="310" y="32" fill="#f8fafc" fontSize="11" textAnchor="middle" fontFamily="monospace">
                  {`Crest: 839.5 m (hd = ${damHeight} m)`}
                </text>

                {/* Downstream Channel Bed */}
                <line x1="560" y1="210" x2="680" y2="210" stroke="#64748b" strokeWidth="2" />
                <text x="590" y="228" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  River Bed: 570.0 m MSL
                </text>
              </svg>

              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-900 pt-2">
                <span>Core: Impervious Clay</span>
                <span>Shell: Compacted Rockfill</span>
                <span>Foundation: Bedrock</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right 35%: Synthesized Hydrograph */}
        <div className="lg:col-span-5 h-80">
          <HydrographChart
            times={hydroTimes}
            flows={hydroFlows}
            currentTimeHrs={1.5}
            peakDischarge={peakFlow}
            timeToPeakHrs={1.5}
          />
        </div>
      </div>
    </div>
  );
}
