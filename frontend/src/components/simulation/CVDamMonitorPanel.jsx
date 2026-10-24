import React, { useState, useEffect } from 'react';
import {
  Camera,
  Eye,
  AlertTriangle,
  Activity,
  CheckCircle2,
  RefreshCw,
  Waves,
  Sliders,
  Layers,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useRun } from '../../context/RunContext';

const SCENARIOS = [
  { id: 'normal_ops', label: '1. Normal Ops (820.5m)', desc: 'Safe freeboard (19m), intact embankment, normal regulated flow' },
  { id: 'monsoon_rise', label: '2. Monsoon Surcharge (836.8m)', desc: 'Rapid reservoir rise (+0.52m/h), gates open, surcharge warning' },
  { id: 'crest_overtopping', label: '3. Crest Overtopping (840.4m)', desc: 'Overtopping sheet flow (+0.9m head), downstream face erosion' },
  { id: 'structural_breach', label: '4. Catastrophic Breach (841.2m)', desc: 'Embankment collapse (124.5m notch), >720k m³/s peak flux' },
];

export default function CVDamMonitorPanel({ onSyncToSimulation }) {
  const { selectedRunId } = useRun();
  const [activeScenario, setActiveScenario] = useState('normal_ops');
  const [activeCameraId, setActiveCameraId] = useState('CAM-TEHRI-CREST-01');
  const [cameras, setCameras] = useState([]);
  const [frameData, setFrameData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showOverlays, setShowOverlays] = useState({
    crestLine: true,
    waterline: true,
    boxes: true,
    telemetry: true,
  });

  // Fetch cameras list
  useEffect(() => {
    fetch('/api/cv/cameras')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCameras(data))
      .catch(() => {
        // Fallback mock
        setCameras([
          { camera_id: 'CAM-TEHRI-CREST-01', name: 'Tehri Crest Optical Sensor 1', location: 'Left Abutment Vantage', status: 'ONLINE' },
          { camera_id: 'CAM-TEHRI-SPILL-02', name: 'Chute Spillway & Radial Gates', location: 'Spillway Control Pier', status: 'ONLINE' },
          { camera_id: 'CAM-TEHRI-RESERVOIR-03', name: 'Bhagirathi Gorge Upstream Gauge', location: 'Koti Colony Pier', status: 'ONLINE' },
        ]);
      });
  }, []);

  // Fetch current CV frame
  const loadFrame = (scenId = activeScenario, camId = activeCameraId) => {
    setIsLoading(true);
    fetch(`/api/cv/frame?scenario_id=${scenId}&camera_id=${camId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setFrameData(data);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadFrame(activeScenario, activeCameraId);
  }, [activeScenario, activeCameraId]);

  const handleScenarioChange = (newScen) => {
    setActiveScenario(newScen);
    fetch(`/api/cv/scenario/${newScen}`, { method: 'POST' })
      .then(() => loadFrame(newScen, activeCameraId))
      .catch(() => loadFrame(newScen, activeCameraId));
  };

  const handleSyncToSimulation = () => {
    setIsSyncing(true);
    fetch('/api/cv/sync-simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apply_to_solver: true,
        override_boundary_inflow: true,
        selected_run_id: selectedRunId,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsSyncing(false);
        if (data) {
          setSyncResult(data);
          if (onSyncToSimulation) {
            onSyncToSimulation(data);
          }
        }
      })
      .catch(() => {
        setIsSyncing(false);
      });
  };

  const isBreached = frameData?.metrics?.is_breached || activeScenario === 'structural_breach';
  const isOvertopping = frameData?.metrics?.is_overtopping || activeScenario === 'crest_overtopping';

  return (
    <div className="bg-[#0B0F19] text-slate-200 border border-slate-800 rounded flex flex-col h-full overflow-y-auto font-mono text-xs p-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-sky-400" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                CV DAM OPTICAL INTEGRITY & BREACH DETECTOR
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-950 text-sky-400 border border-sky-800">
                PROPOSED ARCHITECTURE v2.1
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Sensor: {activeCameraId}</span>
              <span>•</span>
              <span>Fiducial Datum: Tehri Crest 839.5m AMSL</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">STATUS:</span>
            {isBreached ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/80 border border-red-600 text-red-400 font-bold text-[10px] animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                BREACH CONFIRMED (124.5m NOTCH)
              </span>
            ) : isOvertopping ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-950/80 border border-amber-600 text-amber-400 font-bold text-[10px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                CREST OVERTOPPING (+0.9m)
              </span>
            ) : activeScenario === 'monsoon_rise' ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-950/80 border border-yellow-600 text-yellow-400 font-bold text-[10px]">
                <Activity className="w-3.5 h-3.5" />
                SURCHARGE RISING (+0.52m/h)
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-950/80 border border-emerald-600 text-emerald-400 font-bold text-[10px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                INTACT · NORMAL SURVEILLANCE
              </span>
            )}
          </div>

          <button
            onClick={() => loadFrame()}
            disabled={isLoading}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center"
            title="Refresh Frame"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Camera & Scenario Selector Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-3 shrink-0">
        <div className="md:col-span-1 bg-[#111827] border border-slate-800 rounded p-2.5">
          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5 flex items-center gap-1">
            <Eye className="w-3 h-3 text-sky-400" /> Optical Sensor Feed
          </label>
          <select
            value={activeCameraId}
            onChange={(e) => setActiveCameraId(e.target.value)}
            className="w-full bg-[#0B0F19] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-hidden focus:border-sky-500"
          >
            {cameras.map((c) => (
              <option key={c.camera_id} value={c.camera_id}>
                {c.camera_id} ({c.name})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 bg-[#111827] border border-slate-800 rounded p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Sliders className="w-3 h-3 text-violet-400" /> Operational / Stress-Test CV Scenario
            </label>
            <span className="text-[9px] text-slate-500">Live Perception Pipeline Testing</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {SCENARIOS.map((scen) => (
              <button
                key={scen.id}
                onClick={() => handleScenarioChange(scen.id)}
                className={`px-2 py-1.5 rounded text-[10px] font-bold text-left transition border ${
                  activeScenario === scen.id
                    ? scen.id === 'structural_breach'
                      ? 'bg-red-950 border-red-500 text-white shadow-xs'
                      : scen.id === 'crest_overtopping'
                      ? 'bg-amber-950 border-amber-500 text-white shadow-xs'
                      : 'bg-sky-950 border-sky-500 text-white shadow-xs'
                    : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div>{scen.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Optical Canvas + Telemetry HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 min-h-[380px]">
        {/* Left: Interactive Optical Stream Canvas (2 Cols) */}
        <div className="lg:col-span-2 bg-[#070B14] border border-slate-800 rounded flex flex-col relative overflow-hidden">
          {/* Canvas Sub-header */}
          <div className="h-7 px-3 bg-[#111827] border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400 select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              OPTICAL HUD FEED · 30 FPS · RES 1920x1080 · LATENCY: 22ms
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">CONFIDENCE:</span>
              <span className="text-emerald-400 font-bold">
                {frameData?.metrics?.confidence ? (frameData.metrics.confidence * 100).toFixed(1) : '98.5'}%
              </span>
            </div>
          </div>

          {/* SVG Frame Rendering */}
          <div className="flex-1 w-full h-full flex items-center justify-center p-2 relative">
            {frameData?.overlay_svg ? (
              <div
                className="w-full h-full max-h-[380px] flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: frameData.overlay_svg }}
              />
            ) : (
              <div className="text-slate-500 text-center p-8">
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
                Initializing Optical Perception Stream...
              </div>
            )}
          </div>
        </div>

        {/* Right: Structural Telemetry & Breach Metrics (1 Col) */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          {/* Key Metrics Cards */}
          <div className="bg-[#111827] border border-slate-800 rounded p-3 flex flex-col gap-2.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <span>REAL-TIME CV TELEMETRY</span>
              <span className="text-sky-400 text-[9px]">CALIBRATED</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-[#0B0F19] border border-slate-800 rounded">
                <div className="text-[9px] text-slate-500 uppercase">WATER ELEVATION</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">
                  {frameData?.metrics?.water_elevation_m?.toFixed(2) || '820.50'} m
                </div>
                <div className="text-[8px] text-slate-400">AMSL (WGS84)</div>
              </div>

              <div className="p-2 bg-[#0B0F19] border border-slate-800 rounded">
                <div className="text-[9px] text-slate-500 uppercase">CREST FREEBOARD</div>
                <div className={`text-sm font-bold mt-0.5 ${isBreached || isOvertopping ? 'text-red-400' : 'text-emerald-400'}`}>
                  {frameData?.metrics?.freeboard_m?.toFixed(2) || '19.00'} m
                </div>
                <div className="text-[8px] text-slate-400">Crest: 839.50m</div>
              </div>

              <div className="p-2 bg-[#0B0F19] border border-slate-800 rounded">
                <div className="text-[9px] text-slate-500 uppercase">RATE OF RISE Δh/Δt</div>
                <div className={`text-sm font-bold mt-0.5 ${(frameData?.metrics?.rate_of_rise_m_hr || 0) > 0.4 ? 'text-amber-400' : 'text-sky-400'}`}>
                  {(frameData?.metrics?.rate_of_rise_m_hr || 0) > 0 ? '+' : ''}
                  {frameData?.metrics?.rate_of_rise_m_hr?.toFixed(2) || '+0.04'} m/h
                </div>
                <div className="text-[8px] text-slate-400">Optical Edge Tracker</div>
              </div>

              <div className="p-2 bg-[#0B0F19] border border-slate-800 rounded">
                <div className="text-[9px] text-slate-500 uppercase">EST. FLUX Q(t)</div>
                <div className="text-sm font-bold text-violet-300 mt-0.5">
                  {frameData?.metrics?.estimated_breach_outflow_m3s?.toLocaleString() || '120'} m³/s
                </div>
                <div className="text-[8px] text-slate-400">Hydraulic Weir / Breach</div>
              </div>
            </div>

            {/* Notch Dimensions if breached */}
            {isBreached && (
              <div className="p-2 bg-red-950/40 border border-red-800/80 rounded mt-1">
                <div className="text-[9px] font-bold text-red-300 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  DETECTED BREACH NOTCH GEOMETRY
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1.5 text-[10px]">
                  <div>
                    <span className="text-slate-400">Width Bw:</span>{' '}
                    <span className="text-white font-bold">{frameData?.metrics?.breach_width_m || 124.5} m</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Depth Hb:</span>{' '}
                    <span className="text-white font-bold">{frameData?.metrics?.breach_depth_m || 48.2} m</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button: Sync to Simulation Engine */}
          <div className="bg-[#111827] border border-slate-800 rounded p-3 flex flex-col gap-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              SIMULATION ENGINE INJECTION
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Inject CV optical findings directly into 2D LISFLOOD-FP solver boundary conditions to compute downstream inundation and wetted road closures.
            </p>

            <button
              onClick={handleSyncToSimulation}
              disabled={isSyncing}
              className={`w-full py-2 px-3 rounded font-bold text-xs uppercase flex items-center justify-center gap-2 transition ${
                isBreached
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40'
              }`}
            >
              <Zap className="w-4 h-4" />
              {isSyncing ? 'Synchronizing Solver...' : isBreached ? 'INJECT BREACH INTO SIMULATION' : 'SYNC CV TO SIMULATION'}
            </button>

            {syncResult && (
              <div className="p-2 bg-emerald-950/50 border border-emerald-800 rounded text-[9px] text-emerald-300 mt-1">
                ✓ {syncResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operational Protocol Notes based on Architecture */}
      <div className="p-3 bg-[#111827] border border-slate-800 rounded text-[10px] text-slate-400 leading-relaxed flex items-start gap-2.5">
        <Waves className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-300">INDRA ARCHITECTURE GOVERNANCE: </span>
          Camera anomalies are empirical evidence for scenario reweighting and boundary condition triggers, not a structural geotechnical dam-failure model.
          In accordance with INDRA target architecture (24 Oct 2026), optical waterline estimations map to versioned incident state revisions and dynamically update downstream flood arrival envelopes.
        </div>
      </div>
    </div>
  );
}
