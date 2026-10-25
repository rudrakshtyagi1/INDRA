import React, { useState, useEffect, useMemo } from 'react';
import {
  Navigation,
  Compass,
  Layers,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Clock,
  Waves,
  Eye,
  Send,
  Truck,
  HeartPulse,
  Radio,
  CheckCircle2,
  XCircle,
  MapPin,
  Mountain,
} from 'lucide-react';
import HADR3DRouteCanvas from '../components/hadr/HADR3DRouteCanvas';
import ExportMenu from '../components/ExportMenu';
import {
  PROTOTYPE_NDRF_BASE,
  PROTOTYPE_TACTICAL_ROUTES,
  calculateOperationalMargin,
} from '../data/prototype/tehriPrototypeRoutes';

export default function HADRDashboard() {
  // Active selection states
  const [selectedSettlementKey, setSelectedSettlementKey] = useState('sirain');
  const [activeMode, setActiveMode] = useState('ROAD'); // 'ROAD', 'FALLBACK_GROUND', 'AIR_EVAC', 'REJECTED'
  const [viewDimension, setViewDimension] = useState('3D'); // '3D' or '2D'
  const [cameraPreset, setCameraPreset] = useState('tactical'); // 'tactical', 'chokepoint', 'ridge', 'topdown'

  // Time & Simulation Scrubber (synchronous with flood propagation)
  const [simTimeSec, setSimTimeSec] = useState(900); // default T+15 min
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [missionStartMin, setMissionStartMin] = useState(0);

  // Rescue Unit Dispatch State
  const [dispatchedUnits, setDispatchedUnits] = useState({
    ndrf_qrf: { dispatched: false, etaMin: 14, label: 'NDRF 4x4 Quick Response Team' },
    sdrf_med: { dispatched: false, etaMin: 18, label: 'SDRF Critical Care Ambulance' },
    air_evac: { dispatched: false, etaMin: 5, label: 'IAF/SDRF Evacuation Helicopter' },
  });
  const [radioLogs, setRadioLogs] = useState([
    { time: 'T+00m', sender: 'C2 BASE', text: 'Dam breach initiation detected. Tactical C2 operational.' },
    { time: 'T+05m', sender: 'SURVEILLANCE', text: 'Bhagirathi canyon road cutoff imminent below Koteshwar.' },
    { time: 'T+12m', sender: 'CHAMBA HQ', text: 'Chamba-Tehri High Ridge Bypass designated as primary green route.' },
  ]);

  // Active settlement route configuration
  const activeSettlement = useMemo(() => {
    return PROTOTYPE_TACTICAL_ROUTES[selectedSettlementKey] || PROTOTYPE_TACTICAL_ROUTES.sirain;
  }, [selectedSettlementKey]);

  // Selected route data
  const activeRouteObj = useMemo(() => {
    if (activeMode === 'ROAD') return activeSettlement.roadRoute;
    if (activeMode === 'FALLBACK_GROUND') return activeSettlement.fallbackGroundRoute;
    if (activeMode === 'AIR_EVAC') return activeSettlement.airEvacRoute;
    if (activeMode === 'REJECTED') return activeSettlement.rejectedRoute;
    return activeSettlement.roadRoute;
  }, [activeSettlement, activeMode]);

  // Operational Safety Margin
  const marginResult = useMemo(() => {
    if (activeMode === 'REJECTED') {
      return {
        status: 'CRITICAL_DEFICIT',
        label: 'VALLEY ROAD SUBMERGED (NEGATIVE MARGIN)',
        badgeColor: 'red',
        isFeasible: false,
        operationalMarginMin: -activeSettlement.rejectedRoute.bridgeFloodMin,
      };
    }
    return calculateOperationalMargin({
      checkpointFloodMin: activeRouteObj?.checkpointFloodMin,
      missionStartMin: missionStartMin,
      transitToCheckpointMin: activeRouteObj?.transitToCheckpointMin,
      requiredBufferMin: 10,
      isRouteAvailable: activeRouteObj?.isAvailable ?? true,
      unavailabilityReason: activeRouteObj?.unavailabilityReason || '',
    });
  }, [activeSettlement, activeRouteObj, activeMode, missionStartMin]);

  // Playback timer effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimTimeSec((prev) => {
        if (prev >= 3600) {
          setIsPlaying(false);
          return 3600;
        }
        return prev + 60 * playbackSpeed;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Dispatch unit action
  const handleDispatch = (unitKey) => {
    setDispatchedUnits((prev) => ({
      ...prev,
      [unitKey]: { ...prev[unitKey], dispatched: true },
    }));
    const unitLabel = dispatchedUnits[unitKey].label;
    const currentMin = Math.round(simTimeSec / 60);
    setRadioLogs((prev) => [
      {
        time: `T+${currentMin}m`,
        sender: 'DISPATCH',
        text: `${unitLabel} mobilized via ${activeRouteObj.label}. ETA: ${activeRouteObj.etaMin || 14} min.`,
      },
      ...prev,
    ]);
  };

  return (
    <div className="h-full w-full flex bg-[#0B0F19] text-slate-100 overflow-hidden select-none font-sans">
      {/* LEFT / CENTER: Tactical 3D Workspace (70% width) */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative border-r border-slate-800">
        {/* Top Operational Bar */}
        <div className="h-10 bg-[#0F172A] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold font-sans flex items-center gap-1.5 text-xs">
              <Navigation className="w-4 h-4 text-emerald-400" />
              3D HADR REROUTING &amp; RESCUE CONSOLE
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              TARGET: <strong className="text-white uppercase">{activeSettlement.settlementName}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              ORIGIN: <strong className="text-sky-300">{PROTOTYPE_NDRF_BASE.shortName}</strong>
            </span>
          </div>

          {/* 3D vs 2D & Camera Presets Toolbar */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5 text-[10px]">
              <button
                onClick={() => setViewDimension('3D')}
                className={`px-2 py-0.5 rounded font-bold transition ${
                  viewDimension === '3D' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🎮 3D Terrain
              </button>
              <button
                onClick={() => setViewDimension('2D')}
                className={`px-2 py-0.5 rounded font-bold transition ${
                  viewDimension === '2D' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🗺️ 2D Ortho
              </button>
            </div>

            {/* Camera Presets (when in 3D) */}
            {viewDimension === '3D' && (
              <select
                value={cameraPreset}
                onChange={(e) => setCameraPreset(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-sky-300 text-[10px] font-bold rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-sky-500"
              >
                <option value="tactical">Perspective: Tactical Corridor</option>
                <option value="chokepoint">Focus: Submerged Chokepoint</option>
                <option value="ridge">Focus: Chamba Ridge Bypass</option>
                <option value="topdown">Planar: Top-Down Grid</option>
              </select>
            )}

            <ExportMenu products={['normal_route', 'hazard_aware_route', 'air_evacuation_vector']} />
          </div>
        </div>

        {/* Main 3D Canvas / 2D View Container */}
        <div className="flex-1 relative w-full h-full bg-[#070B14]">
          {viewDimension === '3D' ? (
            <HADR3DRouteCanvas
              selectedSettlement={activeSettlement}
              activeMode={activeMode}
              simTimeSec={simTimeSec}
              cameraPreset={cameraPreset}
            />
          ) : (
            /* 2D Fallback Orthographic Map */
            <div className="w-full h-full flex items-center justify-center bg-[#070B14] p-6 text-center font-mono text-xs">
              <div className="max-w-md bg-slate-900/90 border border-slate-800 rounded p-6 shadow-2xl">
                <Compass className="w-8 h-8 text-sky-400 mx-auto mb-3 animate-spin" />
                <h3 className="font-bold text-white text-sm mb-1 uppercase">2D Planar Orthographic Raster</h3>
                <p className="text-slate-400 text-xs mb-4">
                  Viewing 2D flat GIS map representation with terrain contours and vector routes.
                </p>
                <button
                  onClick={() => setViewDimension('3D')}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-xs transition"
                >
                  Return to Interactive 3D Terrain
                </button>
              </div>
            </div>
          )}

          {/* Floating 3D HUD Symbology Overlay */}
          <div className="absolute top-3 left-4 z-20 flex flex-col gap-2 pointer-events-none">
            {/* Status Alert Badge */}
            <div
              className={`px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-2xl flex items-center gap-2 text-xs font-mono font-bold pointer-events-auto ${
                marginResult.isFeasible
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : 'bg-red-950/80 border-red-500 text-red-200'
              }`}
            >
              {marginResult.isFeasible ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{marginResult.label}</span>
            </div>

            {/* Active Mode Tag */}
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-1 rounded text-[10px] font-mono text-slate-300 backdrop-blur-sm pointer-events-auto flex items-center gap-2">
              <span className="text-slate-500">ACTIVE TRAJECTORY:</span>
              <span className="font-bold text-sky-400">{activeRouteObj.label}</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-bold">{activeRouteObj.distKm ? `${activeRouteObj.distKm} km` : 'Direct Air Vector'}</span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-300 font-bold">ETA: {activeRouteObj.etaMin ? `${activeRouteObj.etaMin} min` : 'N/A'}</span>
            </div>
          </div>

          {/* Interactive 3D Legend (Bottom Left) */}
          <div className="absolute bottom-16 left-4 z-20 bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-[10px] font-mono shadow-2xl backdrop-blur-md space-y-1.5 pointer-events-auto">
            <div className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-1 mb-1.5">
              3D Tactical Symbology
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3.5 h-1 bg-emerald-500 rounded" />
              <span>Recommended High-Ridge Bypass (Safe Elev &gt; 1,400m)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3.5 h-1 bg-red-500 rounded border-t border-dashed" />
              <span>Rejected Low Valley Road (Submerged Chokepoint)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3.5 h-0.5 bg-purple-400 border-t border-dotted" />
              <span>Helicopter Air Evacuation Corridor</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500/80 border border-blue-400" />
              <span>Dynamic 3D LISFLOOD Wave Surface (T+{Math.round(simTimeSec / 60)} min)</span>
            </div>
          </div>
        </div>

        {/* Bottom Simulation Time Scrubber & Margin Controls */}
        <div className="h-14 bg-[#0B0F19] border-t border-slate-800 px-4 flex items-center justify-between gap-4 shrink-0 font-mono text-xs z-20">
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setIsPlaying(false);
                setSimTimeSec(0);
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
              title="Reset to T+0s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setSimTimeSec((prev) => Math.max(0, prev - 300));
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
              title="Step -5 min"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center gap-1.5 transition shadow-sm"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setSimTimeSec((prev) => Math.min(3600, prev + 300));
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
              title="Step +5 min"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Display */}
          <div className="flex items-center gap-2 shrink-0 bg-slate-900 border border-slate-800 px-3 py-1 rounded text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>T+{Math.round(simTimeSec / 60)} min ({simTimeSec}s)</span>
          </div>

          {/* Scrubber Range */}
          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={3600}
              step={60}
              value={simTimeSec}
              onChange={(e) => {
                setIsPlaying(false);
                setSimTimeSec(parseInt(e.target.value));
              }}
              className="w-full cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Speed Multipliers */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 shrink-0 text-[10px]">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-1.5 py-0.5 rounded transition ${
                  playbackSpeed === s ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                {s}&times;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Tactical Mission Command & Dispatch (30% width, 380px) */}
      <div className="w-[380px] bg-[#111827] flex flex-col h-full overflow-y-auto shrink-0 border-l border-slate-800 font-mono text-xs">
        {/* Header */}
        <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0F172A]">
          <span className="font-bold text-slate-200 tracking-wider uppercase text-[11px] flex items-center gap-1.5 font-sans">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Tactical Rescue Command
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold text-[9px]">
            C2 ACTIVE
          </span>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* Target Settlement Selector */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold mb-1.5 block">
              1. Select Incident Target Settlement
            </label>
            <select
              value={selectedSettlementKey}
              onChange={(e) => setSelectedSettlementKey(e.target.value)}
              className="w-full bg-[#0B0F19] border border-slate-700 text-sky-300 rounded px-3 py-2 text-xs font-bold cursor-pointer focus:outline-none focus:border-sky-500"
            >
              {Object.entries(PROTOTYPE_TACTICAL_ROUTES).map(([key, data]) => (
                <option key={key} value={key}>
                  {data.settlementName} (Km {data.kmFromDam}) &middot; Pop: {data.population}
                </option>
              ))}
            </select>
          </div>

          {/* Multi-Modal Evacuation Route Mode Selector */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold mb-1.5 block">
              2. Evacuation &amp; Rerouting Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveMode('ROAD')}
                className={`p-2.5 rounded border text-left transition flex flex-col ${
                  activeMode === 'ROAD'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                    : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Ridge Bypass
                </span>
                <span className="text-xs font-bold text-white mt-0.5">
                  {activeSettlement.roadRoute?.distKm} km &middot; {activeSettlement.roadRoute?.etaMin}m
                </span>
                <span className="text-[9px] text-emerald-400/90 mt-0.5">Safe Ridge Corridor</span>
              </button>

              <button
                onClick={() => setActiveMode('AIR_EVAC')}
                className={`p-2.5 rounded border text-left transition flex flex-col ${
                  activeMode === 'AIR_EVAC'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                    : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Helicopter Air
                </span>
                <span className="text-xs font-bold text-white mt-0.5">
                  {activeSettlement.airEvacRoute?.distKm} km &middot; {activeSettlement.airEvacRoute?.etaMin}m
                </span>
                <span className="text-[9px] text-purple-300 mt-0.5">Direct Terrace LZ</span>
              </button>

              <button
                onClick={() => setActiveMode('FALLBACK_GROUND')}
                className={`p-2.5 rounded border text-left transition flex flex-col ${
                  activeMode === 'FALLBACK_GROUND'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                    : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Ridge Trail
                </span>
                <span className="text-xs font-bold text-white mt-0.5">
                  {activeSettlement.fallbackGroundRoute?.distKm} km &middot; {activeSettlement.fallbackGroundRoute?.etaMin}m
                </span>
                <span className="text-[9px] text-amber-400 mt-0.5">Foot Evacuation</span>
              </button>

              <button
                onClick={() => setActiveMode('REJECTED')}
                className={`p-2.5 rounded border text-left transition flex flex-col ${
                  activeMode === 'REJECTED'
                    ? 'bg-red-950/80 border-red-500 text-red-200'
                    : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Low Road (Cutoff)
                </span>
                <span className="text-xs font-bold text-red-300 mt-0.5">
                  {activeSettlement.rejectedRoute?.distKm} km &middot; Submerged
                </span>
                <span className="text-[9px] text-red-400 mt-0.5">T+{activeSettlement.rejectedRoute?.bridgeFloodMin}m Cutoff</span>
              </button>
            </div>
          </div>

          {/* Operational Safety Margin Metrics Card */}
          <div className="bg-[#0B0F19] border border-slate-800 rounded p-3 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-800/80 pb-1 flex justify-between items-center">
              <span>Operational Margin Accounting</span>
              <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${marginResult.isFeasible ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                {marginResult.isFeasible ? 'FEASIBLE' : 'BLOCKED'}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Flood Arrival at Chokepoint:</span>
                <span className="font-bold text-white">T+{activeRouteObj?.checkpointFloodMin || activeSettlement.rejectedRoute?.bridgeFloodMin} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Responder Transit Time:</span>
                <span className="font-bold text-sky-400">{activeRouteObj?.transitToCheckpointMin || activeRouteObj?.etaMin || 14} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Required Safety Buffer:</span>
                <span className="font-bold text-slate-300">+10 min</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5">
                <span className="text-slate-400 font-bold">Operational Safe Margin:</span>
                <span className={`font-bold ${marginResult.isFeasible ? 'text-emerald-400' : 'text-red-400'}`}>
                  {marginResult.operationalMarginMin !== null ? `${marginResult.operationalMarginMin} min` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Rationale explanation */}
            <div className="p-2 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300 leading-snug mt-2">
              <span className="text-slate-400 font-bold uppercase">Routing Rationale: </span>
              {activeRouteObj?.rationale || activeSettlement.rejectedRoute?.hazardReason}
            </div>
          </div>

          {/* Interactive Route Elevation Cross-Section */}
          <div className="bg-[#0B0F19] border border-slate-800 rounded p-3">
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1.5 flex justify-between">
              <span>Elevation Cross-Section vs Flood Stage</span>
              <span className="text-sky-400">Chamba (1450m) &rarr; River (630m)</span>
            </div>
            <div className="w-full h-24 bg-[#070B14] rounded border border-slate-800/80 p-1.5 relative">
              <svg viewBox="0 0 320 80" className="w-full h-full overflow-visible">
                {/* Elevation grid lines */}
                {[700, 1000, 1300].map((elev) => {
                  const y = 70 - ((elev - 600) / 900) * 60;
                  return (
                    <g key={elev}>
                      <line x1="25" y1={y} x2="310" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="2,2" />
                      <text x="20" y={y + 3} fill="#64748b" fontSize="7" textAnchor="end">{elev}m</text>
                    </g>
                  );
                })}

                {/* Flood Water Stage Line */}
                <line x1="25" y1="62" x2="310" y2="62" stroke="#0284c7" strokeWidth="2" strokeDasharray="3,3" />
                <text x="290" y="58" fill="#38bdf8" fontSize="7" textAnchor="end">Flood Stage (~655m)</text>

                {/* Ridge Bypass Profile (Green Curve - Stays high at 1450m -> 1100m) */}
                <path
                  d="M 30,12 C 100,10 180,18 280,32"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />

                {/* Low Valley Road Profile (Red Curve - Dives into water) */}
                <path
                  d="M 30,12 C 80,35 150,68 280,68"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />

                {/* Submersion Cutoff Point */}
                <circle cx="165" cy="62" r="3.5" fill="#ef4444" />
                <text x="165" y="74" fill="#f87171" fontSize="7" textAnchor="middle">Cutoff at Km 4.2</text>
              </svg>
            </div>
          </div>

          {/* Tactical Rescue Fleet Dispatch Console */}
          <div className="bg-[#0B0F19] border border-slate-800 rounded p-3 space-y-2.5">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                Rescue Fleet Mobilization
              </span>
              <span className="text-[9px] text-emerald-400 font-bold">READY TO DEPLOY</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                <div>
                  <div className="font-bold text-white text-[11px]">NDRF 4x4 Quick Response Team</div>
                  <div className="text-[9px] text-slate-400">High-clearance rescue vehicle &middot; Chamba Post</div>
                </div>
                <button
                  disabled={dispatchedUnits.ndrf_qrf.dispatched}
                  onClick={() => handleDispatch('ndrf_qrf')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                    dispatchedUnits.ndrf_qrf.dispatched
                      ? 'bg-slate-800 text-emerald-400 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {dispatchedUnits.ndrf_qrf.dispatched ? 'EN ROUTE' : 'DISPATCH'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                <div>
                  <div className="font-bold text-white text-[11px]">IAF/SDRF Evacuation Helicopter</div>
                  <div className="text-[9px] text-slate-400">Casualty extraction to terrace LZ &middot; ETA: 5m</div>
                </div>
                <button
                  disabled={dispatchedUnits.air_evac.dispatched}
                  onClick={() => handleDispatch('air_evac')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                    dispatchedUnits.air_evac.dispatched
                      ? 'bg-slate-800 text-purple-400 cursor-default'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {dispatchedUnits.air_evac.dispatched ? 'AIRBORNE' : 'SCRAMBLE'}
                </button>
              </div>
            </div>
          </div>

          {/* Live C2 Radio Log */}
          <div className="bg-[#0B0F19] border border-slate-800 rounded p-3">
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1.5 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Live C2 Radio &amp; Dispatch Traffic
            </div>
            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {radioLogs.map((log, idx) => (
                <div key={idx} className="text-[10px] flex items-start gap-1.5 leading-snug">
                  <span className="text-sky-400 shrink-0 font-bold">[{log.time}]</span>
                  <span className="text-amber-400 shrink-0 font-bold">{log.sender}:</span>
                  <span className="text-slate-300">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
