import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Download,
  Flame,
  Home,
  Clock,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import Panel from '../components/common/Panel';
import StatusBadge from '../components/common/StatusBadge';
import ProvenanceBadge from '../components/common/ProvenanceBadge';
import FullScreenVisualization from '../components/common/FullScreenVisualization';
import HADROperationalMap, { LOCAL_SETTLEMENTS, NDRF_BASE } from '../components/map/HADROperationalMap';
import { formatFinite } from '../utils/units';

export default function HADRDashboard({
  selectedPreset,
  simulationResult,
  onOpenExport,
  isFullScreenMode = false,
  onToggleFullScreen,
}) {
  const [selectedVillageId, setSelectedVillageId] = useState('sirain');
  const [isLocalFullScreen, setIsLocalFullScreen] = useState(false);

  const fullScreenActive = isFullScreenMode || isLocalFullScreen;

  const activeVillage =
    LOCAL_SETTLEMENTS.find((v) => v.id === selectedVillageId) || LOCAL_SETTLEMENTS[0];

  const totalPop = LOCAL_SETTLEMENTS.reduce((acc, v) => acc + v.population, 0);
  const runId = simulationResult?.run_id || 'sim_latest';

  const mapComponent = (
    <HADROperationalMap
      selectedVillageId={selectedVillageId}
      onSelectVillage={setSelectedVillageId}
      isFullScreen={fullScreenActive}
      onToggleFullScreen={() => {
        if (onToggleFullScreen) onToggleFullScreen();
        else setIsLocalFullScreen(!isLocalFullScreen);
      }}
    />
  );

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        category="EMERGENCY OPERATIONS &bull; NDRF / SDRF MISSION CONTROL"
        title="HADR Evacuation &amp; Tactical Rescue Routing"
        subtitle="Time-dependent road traversability analysis and risk-aware ridge bypass routing for threatened riverside villages."
        status="WATCH"
        statusLabel="EVACUATION DIRECTIVES ACTIVE"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onToggleFullScreen) onToggleFullScreen();
                else setIsLocalFullScreen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
              title="Enter Fullscreen Routing Mode"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fullscreen Mode</span>
            </button>
            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Mission Manifest</span>
            </button>
          </div>
        }
      />

      {/* Top 4 Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Population at Risk"
          value={totalPop.toLocaleString()}
          subtitle="Immediate 0–30 km River Corridor"
          provenance="DERIVED"
          accentColor="amber"
          icon={Users}
        />
        <MetricCard
          title="Earliest Flood Ingress"
          value="T+8 min"
          subtitle="Sirain Village (4.2 km downstream)"
          provenance="MODELLED"
          accentColor="red"
          icon={Flame}
        />
        <MetricCard
          title="NDRF Response Readiness"
          value="85 Personnel"
          subtitle="14 Inflatable Zodiacs Available"
          provenance="REPORTED"
          accentColor="cyan"
          icon={ShieldAlert}
        />
        <MetricCard
          title="Designated Safe Shelters"
          value="4 High-Ground Hubs"
          subtitle="All Above 720m MSL Contour"
          provenance="OBSERVED"
          accentColor="emerald"
          icon={Home}
        />
      </div>

      {/* Main 70/30 Operational Map & Priority Settlement Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 65–70%: Operational Map */}
        <div className="lg:col-span-8 space-y-4">
          {mapComponent}
        </div>

        {/* Right 30–35%: Priority Settlement Queue */}
        <div className="lg:col-span-4 space-y-4">
          <Panel
            title="Immediate Threatened Settlements"
            subtitle="Ranked by arrival lead time and population exposure"
            icon={ShieldAlert}
          >
            <div className="space-y-3">
              {LOCAL_SETTLEMENTS.map((village, idx) => {
                const isSelected = village.id === selectedVillageId;
                const isCritical = village.urgency === 'CRITICAL';

                return (
                  <div
                    key={village.id}
                    onClick={() => setSelectedVillageId(village.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                        : 'bg-slate-950/80 border-slate-800/80 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                            isCritical ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-100">{village.name}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          isCritical
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        T+{village.floodArrivalMin}m ARRIVAL
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                      <div>
                        <span className="text-slate-400">Pop: </span>
                        <span className="text-slate-200 font-bold">{village.population.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Peak: </span>
                        <span className="text-cyan-400 font-bold">{village.peakDepthM} m</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVillageId(village.id);
                      }}
                      className={`mt-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Navigation className="w-3 h-3" />
                      <span>{isSelected ? 'Viewing Dual Routes' : 'Show Evacuation Route'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      {/* Full-Screen HADR Routing Mode Overlay */}
      <FullScreenVisualization
        isOpen={fullScreenActive}
        onClose={() => {
          if (onToggleFullScreen) onToggleFullScreen();
          else setIsLocalFullScreen(false);
        }}
        title="Tactical HADR Evacuation &amp; Rescue Routing"
        scenarioName={selectedPreset?.name || 'Tehri Dam (Bhagirathi River)'}
        runId={runId}
        status="WATCH"
      >
        <div className="flex-1 flex h-full overflow-hidden p-3 gap-3">
          <div className="flex-1 min-h-0 relative">
            {mapComponent}
          </div>
          <div className="w-80 shrink-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-slate-800">
              Target Settlement Priority
            </h3>
            {LOCAL_SETTLEMENTS.map((village, idx) => {
              const isSelected = village.id === selectedVillageId;
              const isCritical = village.urgency === 'CRITICAL';
              return (
                <div
                  key={village.id}
                  onClick={() => setSelectedVillageId(village.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-950 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>#{idx + 1} {village.name}</span>
                    <span className={`text-[10px] font-mono ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                      T+{village.floodArrivalMin}m
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    Pop: {village.population.toLocaleString()} &bull; Peak: {village.peakDepthM}m
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </FullScreenVisualization>
    </div>
  );
}
