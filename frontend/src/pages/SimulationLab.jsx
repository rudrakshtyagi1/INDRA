import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Waves,
  TrendingUp,
  Clock,
  Layers,
  Compass,
  CheckCircle2,
  Maximize2,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import FullScreenVisualization from '../components/common/FullScreenVisualization';
import GeospatialSimulationMap, { CORRIDOR_STATIONS } from '../components/map/GeospatialSimulationMap';
import HydrographChart from '../components/charts/HydrographChart';
import DownstreamHazardChart from '../components/charts/DownstreamHazardChart';
import ArrivalTimelineChart from '../components/charts/ArrivalTimelineChart';
import { formatFinite } from '../utils/units';
import { formatMinutes } from '../utils/formatters';

export default function SimulationLab({
  simulationResult,
  selectedPreset,
  onRunSimulation,
  isSimulating,
  isFullScreenMode = false,
  onToggleFullScreen,
}) {
  const [currentTimeMin, setCurrentTimeMin] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLocalFullScreen, setIsLocalFullScreen] = useState(false);

  const fullScreenActive = isFullScreenMode || isLocalFullScreen;

  // Animation Loop (0 to 180 minutes)
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeMin((prev) => {
          if (prev >= 180) {
            setIsPlaying(false);
            return 180;
          }
          return prev + 1;
        });
      }, 100 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const breach = simulationResult?.breach_mechanics || {};
  const peakFlow = breach.peak_discharge_m3s || 84200.0;
  const hydroTimes = breach.hydrograph_times || [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0];
  const hydroFlows = breach.hydrograph_flows || [0, 12000, 48000, 84200, 62000, 38000, 21000, 8500, 2400, 500];

  const currentTimeHrs = currentTimeMin / 60.0;
  const runId = simulationResult?.run_id || 'sim_latest';

  const mapComponent = (
    <GeospatialSimulationMap
      currentTimeMin={currentTimeMin}
      onTimeChange={setCurrentTimeMin}
      isPlaying={isPlaying}
      onTogglePlay={() => setIsPlaying(!isPlaying)}
      onReset={() => {
        setIsPlaying(false);
        setCurrentTimeMin(0);
      }}
      playbackSpeed={playbackSpeed}
      onSpeedChange={setPlaybackSpeed}
      scenarioParams={selectedPreset}
      isFullScreen={fullScreenActive}
      onToggleFullScreen={() => {
        if (onToggleFullScreen) onToggleFullScreen();
        else setIsLocalFullScreen(!isLocalFullScreen);
      }}
    />
  );

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <PageHeader
        category="MULTI-SCALE HYDRODYNAMICS &bull; 0–100 KM CORRIDOR"
        title="Geographic Flood Wave Simulation Lab"
        subtitle="DualSPHysics 3D Lagrangian near-field coupled to Delft3D flexible-mesh 2D shallow water wave propagation."
        status={isSimulating ? 'RUNNING' : 'COMPLETED'}
        statusLabel={isSimulating ? 'SOLVER COMPUTING...' : 'HYDRODYNAMIC MESH ACTIVE'}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onToggleFullScreen) onToggleFullScreen();
                else setIsLocalFullScreen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
              title="Enter Fullscreen Simulation Mode"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fullscreen Mode</span>
            </button>
            <button
              onClick={onRunSimulation}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>{isSimulating ? 'Computing Solver...' : 'Run Simulation'}</span>
            </button>
          </div>
        }
      />

      {/* Top 4 Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Peak Outflow (Qp)"
          value={formatFinite(peakFlow, 0)}
          unit="m³/s"
          subtitle="Hydrodynamic Breach Wave Peak"
          provenance="MODELLED"
          accentColor="cyan"
          icon={TrendingUp}
        />
        <MetricCard
          title="Near-Field Velocity (SPH)"
          value="22.4"
          unit="m/s"
          subtitle="Lagrangian Transect (0–2 km)"
          provenance="MODELLED"
          accentColor="purple"
          icon={Activity}
        />
        <MetricCard
          title="Far-Field Footprint (Delft3D)"
          value="26.5"
          unit="km²"
          subtitle="Eulerian Flexible Mesh Footprint"
          provenance="MODELLED"
          accentColor="emerald"
          icon={Waves}
        />
        <MetricCard
          title="Playback Timeline"
          value={`T+${currentTimeMin}m`}
          subtitle={`Advancement: ${currentTimeHrs.toFixed(2)}h / 3.0h`}
          provenance="DERIVED"
          accentColor="amber"
          icon={Clock}
        />
      </div>

      {/* 1. Main Geographic Leaflet Map */}
      {mapComponent}

      {/* 2. Bottom 3 Analytics Charts Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <HydrographChart
          times={hydroTimes}
          flows={hydroFlows}
          currentTimeHrs={currentTimeHrs}
          peakDischarge={peakFlow}
          timeToPeakHrs={1.5}
        />
        <DownstreamHazardChart
          stations={CORRIDOR_STATIONS.map((s) => ({
            name: s.name,
            km: s.km,
            depth: s.depth,
            vel: s.type === 'dam' ? 22.4 : Math.max(5.0, 22.0 - s.km * 0.17),
          }))}
        />
        <ArrivalTimelineChart
          currentTimeMin={currentTimeMin}
          stations={CORRIDOR_STATIONS}
        />
      </div>

      {/* Full-Screen Simulation Mode Overlay */}
      <FullScreenVisualization
        isOpen={fullScreenActive}
        onClose={() => {
          if (onToggleFullScreen) onToggleFullScreen();
          else setIsLocalFullScreen(false);
        }}
        title="Geographic Flood Wave Simulation"
        scenarioName={selectedPreset?.name || 'Tehri Dam (Bhagirathi River)'}
        runId={runId}
        status={isSimulating ? 'RUNNING' : 'COMPLETED'}
        timeLabel={`T+${formatMinutes(currentTimeMin)}`}
      >
        <div className="flex-1 flex flex-col h-full overflow-hidden p-3 gap-3">
          <div className="flex-1 min-h-0 relative">
            {mapComponent}
          </div>
          <div className="h-44 shrink-0 grid grid-cols-3 gap-3 overflow-hidden">
            <HydrographChart
              times={hydroTimes}
              flows={hydroFlows}
              currentTimeHrs={currentTimeHrs}
              peakDischarge={peakFlow}
              timeToPeakHrs={1.5}
            />
            <DownstreamHazardChart
              stations={CORRIDOR_STATIONS.map((s) => ({
                name: s.name,
                km: s.km,
                depth: s.depth,
                vel: s.type === 'dam' ? 22.4 : Math.max(5.0, 22.0 - s.km * 0.17),
              }))}
            />
            <ArrivalTimelineChart
              currentTimeMin={currentTimeMin}
              stations={CORRIDOR_STATIONS}
            />
          </div>
        </div>
      </FullScreenVisualization>
    </div>
  );
}
