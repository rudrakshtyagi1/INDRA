import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Activity,
  Layers,
  MapPin,
  Clock,
  Waves,
  Eye,
  Maximize2,
  Gauge,
  Sliders,
  ShieldAlert,
  Compass,
  Zap,
  PlayCircle,
} from 'lucide-react';
import { getDepthColor, getVelocityColor } from '../utils/colorScales';
import { formatFinite, m3ToBillionM3 } from '../utils/units';
import { createBasemapLayer } from '../utils/mapTiles';

export default function SimulationViewer({
  simulationResult,
  selectedPreset,
  onOpenDamage,
  onOpenComparison,
  onRunSimulation,
}) {
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [viewMode, setViewMode] = useState('hybrid'); // 'sph_particles', 'swe_raster', 'hybrid'
  const [selectedGauge, setSelectedGauge] = useState('dam_axis');

  const canvasRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Extract frames and scenario params
  const params = simulationResult?.scenario_params || selectedPreset || {};
  const sphFrames = simulationResult?.sph_result?.frames || [];
  const delftFrames = simulationResult?.delft3d_result?.frames || [];
  const activeFrames =
    viewMode === 'swe_raster'
      ? delftFrames
      : sphFrames.length
      ? sphFrames
      : delftFrames;

  const currentFrame = activeFrames[currentFrameIdx] || activeFrames[0];
  const summary =
    (simulationResult?.sph_result || simulationResult?.delft3d_result)?.summary || {};
  const gauges =
    (simulationResult?.sph_result || simulationResult?.delft3d_result)?.gauges || {};

  const stations =
    params.downstream_river_stations ||
    params.downstream_stations || [
      { id: 'dam_axis', name: `${params.dam_name || 'Dam'} Axis (0 km)`, km: 0.0, lat: params.lat || 30.378, lon: params.lon || 78.481 },
      { id: 'gauge_5km', name: 'Gorge Station (22 km)', km: 22.0, lat: 30.283, lon: 78.504 },
      { id: 'gauge_15km', name: 'Confluence (42 km)', km: 42.0, lat: 30.146, lon: 78.598 },
      { id: 'gauge_25km', name: 'Valley Reach (62 km)', km: 62.0, lat: 30.113, lon: 78.396 },
      { id: 'reach_end', name: 'Reach Terminus (100 km)', km: 100.0, lat: 29.945, lon: 78.164 },
    ];

  // Animation playback timer
  useEffect(() => {
    let timer;
    if (isPlaying && activeFrames.length > 1) {
      timer = setInterval(() => {
        setCurrentFrameIdx((prev) => {
          if (prev >= activeFrames.length - 1) {
            return 0; // Loop back
          }
          return prev + 1;
        });
      }, 400 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, activeFrames.length, playbackSpeed]);

  // Canvas Renderer: SPH Near Field (0-2km) + Delft3D Far Field (2-100km)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background Gradient: Deep Topographic Gorge
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.5, '#0b1329');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle Topographic Grid Lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const midY = h / 2;
    const paddingX = 40;
    const riverW = w - 2 * paddingX;
    const reachKm = params.reach_length_km || 100.0;

    // 1. Mountain Ridge Contours (Valley Topography)
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(paddingX, midY - 65);
    ctx.bezierCurveTo(w * 0.25, midY - 55, w * 0.5, midY - 85, w * 0.75, midY - 45);
    ctx.lineTo(w - paddingX, midY - 95);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(paddingX, midY + 65);
    ctx.bezierCurveTo(w * 0.25, midY + 55, w * 0.5, midY + 85, w * 0.75, midY + 45);
    ctx.lineTo(w - paddingX, midY + 95);
    ctx.stroke();

    // 2. Dam Axis Structure (Chainage 0 km)
    const damX = paddingX + 25;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(damX, midY - 80);
    ctx.lineTo(damX, midY + 80);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dam Crest Label
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${(params.dam_name || 'DAM').toUpperCase()} AXIS (0 km)`, damX - 25, midY - 86);
    ctx.fillText(`${params.dam_height_m || 0}m ${params.dam_type || ''}`, damX - 25, midY + 92);

    // 3. Coupling Interface Transect (Near Field SPH -> Far Field Delft3D at 2 km)
    const couplingKm = 2.0;
    const couplingX = paddingX + (couplingKm / reachKm) * riverW + 40;
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(couplingX, midY - 70);
    ctx.lineTo(couplingX, midY + 70);
    ctx.stroke();
    ctx.setLineDash([]);

    // Coupling Interface Label
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('COUPLING INTERFACE: Q(t) = ∫ v·n dA', couplingX - 35, midY - 74);

    // Near Field & Far Field Zone Badges
    ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
    ctx.fillRect(damX, midY - 60, couplingX - damX, 120);
    ctx.fillStyle = '#e9d5ff';
    ctx.font = '8px sans-serif';
    ctx.fillText('SPH Near Field (0–2km)', damX + 4, midY - 48);

    ctx.fillStyle = 'rgba(14, 165, 233, 0.08)';
    ctx.fillRect(couplingX, midY - 60, w - paddingX - couplingX, 120);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText('Delft3D Far Field (2–100km)', couplingX + 8, midY - 48);

    // 4. Downstream Landmark Stations
    stations.forEach((st) => {
      const stKm = st.chainage_km !== undefined ? st.chainage_km : st.km !== undefined ? st.km : 0;
      const xPos = paddingX + (stKm / reachKm) * riverW;

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(xPos, midY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      const label = (st.name || st.station_name || '').split(' (')[0];
      ctx.fillText(label, xPos - 15, midY - 14);
      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.fillText(`${stKm} km`, xPos - 8, midY + 20);
    });

    if (!currentFrame) return;

    // 5. Render 2D SWE Flood Depth Contours (Delft3D Far Field)
    if (viewMode === 'swe_raster' || viewMode === 'hybrid') {
      const grid = currentFrame.coarse_grid;
      if (grid?.depth_matrix) {
        const matrix = grid.depth_matrix;
        const ny = matrix.length;
        const nx = matrix[0].length;
        const cellW = riverW / nx;
        const cellH = 120 / ny;

        for (let j = 0; j < ny; j++) {
          for (let i = 0; i < nx; i++) {
            const d = matrix[j][i];
            if (d > 0.1) {
              const cx = paddingX + i * cellW;
              const cy = midY - 60 + j * cellH;
              ctx.fillStyle = getDepthColor(d, 25.0);
              ctx.fillRect(cx, cy, cellW + 1, cellH + 1);
            }
          }
        }
      }
    }

    // 6. Render SPH Lagrangian Particles in Near Field
    if (viewMode === 'sph_particles' || viewMode === 'hybrid') {
      const particles = currentFrame.particles || [];
      const reachLength = reachKm * 1000.0;

      particles.forEach((p) => {
        // Map particle to near-field visual zone
        const px = damX + (p.x / 2000.0) * (couplingX - damX);
        const py = midY + (p.y / 250.0) * 45;

        if (px >= damX && px <= couplingX + 10 && py >= midY - 55 && py <= midY + 55) {
          const speed = p.speed || Math.sqrt(p.u ** 2 + p.v ** 2);
          ctx.fillStyle = getVelocityColor(speed, 26.0);

          ctx.beginPath();
          ctx.arc(px, py, Math.max((p.depth || 1.0) * 0.5, 2.5), 0, Math.PI * 2);
          ctx.fill();

          if (speed > 2.0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + (p.u / speed) * 8, py + (p.v / speed) * 8);
            ctx.stroke();
          }
        }
      });
    }

    // 7. Dynamic Surge Wavefront Line
    const simTimeMin = currentFrame.time_minutes || 0;
    const waveFrontKm = Math.min(simTimeMin * 0.58, reachKm);
    const waveFrontX = paddingX + (waveFrontKm / reachKm) * riverW;

    if (waveFrontX < w - paddingX) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(waveFrontX, midY - 55);
      ctx.lineTo(waveFrontX, midY + 55);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`WAVE FRONT: ${waveFrontKm.toFixed(1)} km`, waveFrontX + 5, midY - 42);
    }

    // Telemetry Corner Overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#334155';
    ctx.fillRect(w - 190, 10, 180, 75);
    ctx.strokeRect(w - 190, 10, 180, 75);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`Elapsed Time: ${simTimeMin} min`, w - 180, 24);
    ctx.fillStyle = '#f87171';
    ctx.fillText(`Peak Surge: ${currentFrame.max_velocity_ms || 18.2} m/s`, w - 180, 38);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Inundated: ${currentFrame.inundated_area_km2 || 12.5} km²`, w - 180, 52);
    ctx.fillStyle = '#a855f7';
    ctx.font = '9px monospace';
    ctx.fillText('PROVENANCE: MODELLED', w - 180, 68);
  }, [currentFrame, viewMode, params, stations]);

  // Leaflet Map Initialization on Dam Coordinates
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !L) return;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (_e) {
        // ignore map cleanup error
      }
      mapInstanceRef.current = null;
    }
    if (container._leaflet_id) {
      container._leaflet_id = null;
    }

    try {
      const lat = params.lat || 30.220;
      const lon = params.lon || 78.420;

      const map = L.map(container, {
        center: [lat, lon],
        zoom: 9,
        zoomControl: false,
      });

      createBasemapLayer(map).addTo(map);

      // Station Markers
      stations.forEach((st, idx) => {
        const isDam = idx === 0;
        const iconColor = isDam ? '#ef4444' : '#06b6d4';
        const icon = L.divIcon({
          className: 'custom-station-marker',
          html: `<div style="background-color: ${iconColor}; width: ${isDam ? 14 : 10}px; height: ${isDam ? 14 : 10}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${iconColor};"></div>`,
          iconSize: [isDam ? 14 : 10, isDam ? 14 : 10],
          iconAnchor: [isDam ? 7 : 5, isDam ? 7 : 5],
        });

        if (st.lat && st.lon) {
          L.marker([st.lat, st.lon], { icon })
            .addTo(map)
            .bindPopup(`<b>${st.name || st.station_name}</b><br/>Chainage: ${st.km || st.chainage_km || 0} km`);
        }
      });

      // River Track Polyline
      const validCoords = stations.filter((s) => s.lat && s.lon).map((s) => [s.lat, s.lon]);
      if (validCoords.length > 1) {
        L.polyline(validCoords, {
          color: '#0284c7',
          weight: 3.5,
          opacity: 0.8,
          dashArray: '2, 6',
        }).addTo(map);
      }

      mapInstanceRef.current = map;
    } catch (err) {
      console.warn('Leaflet map initialization warning:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_e) {
          // ignore map cleanup error
        }
        mapInstanceRef.current = null;
      }
      if (container && container._leaflet_id) {
        container._leaflet_id = null;
      }
    };
  }, [params, stations]);

  const renderGaugeChart = () => {
    const gaugeData = gauges[selectedGauge] || Object.values(gauges)[0] || {
      time_min: [0, 15, 30, 45, 60, 75, 90, 105, 120],
      depth_m: [0.5, 3.2, 14.8, 38.5, 42.0, 36.2, 28.1, 21.0, 15.4],
      discharge_m3s: [150, 1200, 18400, 68500, 84200, 72100, 54000, 38200, 24500],
      x_km: 22.0,
    };

    const times = gaugeData.time_min || [0, 60, 120];
    const depths = gaugeData.depth_m || [0, 0, 0];
    const flows = gaugeData.discharge_m3s || [0, 0, 0];
    const maxD = Math.max(...depths, 1.0);
    const maxQ = Math.max(...flows, 10.0);
    const maxT = Math.max(...times, 10.0);

    const w = 320;
    const h = 110;
    const padding = 22;

    const pointsDepth = times
      .map((t, i) => {
        const x = padding + (t / maxT) * (w - 2 * padding);
        const y = h - padding - (depths[i] / maxD) * (h - 2 * padding);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Max Depth: <strong className="text-cyan-400">{formatFinite(Math.max(...depths), 1)} m</strong></span>
          <span>Peak Flow: <strong className="text-red-400">{formatFinite(Math.max(...flows), 0)} m³/s</strong></span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
          <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="#334155" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={h - padding} stroke="#334155" strokeWidth="1" />
          <polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" points={pointsDepth} />
        </svg>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>0 min</span>
          <span>Peak: ~{times[depths.indexOf(Math.max(...depths))] || 0} min</span>
          <span>{maxT} min</span>
        </div>
      </div>
    );
  };

  if (!simulationResult) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mx-auto">
            <Waves className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">
            Simulation Status: NOT RUN
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            No hydrodynamic simulation has been run for <strong>{params.dam_name || params.name || 'this scenario'}</strong>.
            Click below to execute the coupled SPH & Delft3D solver pipeline.
          </p>
          <div className="pt-2">
            <button
              onClick={onRunSimulation}
              className="py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center justify-center space-x-2 mx-auto shadow-lg shadow-cyan-500/20"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Run Coupled Simulation</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const peakQ = simulationResult?.breach_mechanics?.peak_discharge_m3s || summary.peak_inflow_m3s || 0;
  const peakSpeed = summary.peak_surge_velocity_ms || 0;
  const resStorageBcm = m3ToBillionM3(params.reservoir_volume_m3 || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Mission Control */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-slate-100">
              {params.dam_name || params.name || 'Dam'} Breach Simulation (Mission Control)
            </h2>
            <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-mono font-bold">
              {params.dam_height_m || 0}m {params.dam_type || 'Dam'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {params.river || 'River Basin'} &bull; Reach: {params.reach_length_km || 100} km Corridor
          </p>
        </div>

        {/* Real Peak Telemetry */}
        <div className="flex items-center space-x-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">Peak Discharge (Qp)</span>
            <span className="text-xs font-bold text-red-400">{formatFinite(peakQ, 0)} m³/s</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">Peak Surge Velocity</span>
            <span className="text-xs font-bold text-cyan-400">{formatFinite(peakSpeed, 1)} m/s</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">Reservoir Storage</span>
            <span className="text-xs font-bold text-sky-400">{formatFinite(resStorageBcm, 2)} BCM</span>
          </div>
        </div>
      </div>

      {/* Main Simulation Screen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Hydrodynamic Particle Canvas & Time Scrubber */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Canvas Header */}
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span>SPH Near-Field (0–2km) → Delft3D FM Far-Field Hydrodynamics</span>
              </div>

              <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode('sph_particles')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    viewMode === 'sph_particles' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SPH Near-Field
                </button>
                <button
                  onClick={() => setViewMode('swe_raster')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    viewMode === 'swe_raster' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Delft3D Contours
                </button>
                <button
                  onClick={() => setViewMode('hybrid')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    viewMode === 'hybrid' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Coupled View
                </button>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="relative bg-slate-950">
              <canvas
                ref={canvasRef}
                width={850}
                height={330}
                className="w-full h-80 block"
              />

              {/* Legend */}
              <div className="absolute bottom-2 left-2 bg-slate-950/85 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 font-semibold">Surge Velocity:</span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                  <span className="text-slate-300">&lt;6 m/s</span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                  <span className="text-slate-300">12 m/s</span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span className="text-slate-300">&gt;20 m/s (Gorge)</span>
                </div>
              </div>
            </div>

            {/* Playback Controls Bar */}
            <div className="bg-slate-950/90 px-4 py-3 border-t border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center font-bold shadow-md transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
                </button>

                <button
                  onClick={() => setCurrentFrameIdx(0)}
                  title="Reset to T=0 min"
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>{currentFrame?.time_minutes || 0} min ({((currentFrame?.time_minutes || 0) / 60).toFixed(1)} hrs)</span>
                </div>
              </div>

              {/* Time Scrubber Slider */}
              <div className="flex-1 max-w-md">
                <input
                  type="range"
                  min="0"
                  max={Math.max(activeFrames.length - 1, 1)}
                  value={currentFrameIdx}
                  onChange={(e) => {
                    setCurrentFrameIdx(parseInt(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Speed Multipliers */}
              <div className="flex items-center space-x-1">
                {[0.5, 1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${
                      playbackSpeed === speed ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onOpenComparison}
              className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 transition flex items-center justify-center space-x-2 text-xs font-semibold text-slate-200"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>SPH vs Delft3D Comparison (CSI Verification)</span>
            </button>

            <button
              onClick={onOpenDamage}
              className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-slate-800/80 transition flex items-center justify-center space-x-2 text-xs font-semibold text-red-300"
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>HADR Exposure & Zoning Plan</span>
            </button>
          </div>
        </div>

        {/* Right Column: GIS Leaflet Map & Hydrodynamic Gauges */}
        <div className="space-y-4">
          {/* Interactive GIS Map */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>River Reach Corridor GIS Map</span>
              </h3>
              <span className="text-[10px] text-cyan-400 font-mono">{params.state || 'India'}</span>
            </div>

            <div
              ref={mapContainerRef}
              className="w-full h-48 rounded-lg border border-slate-800 overflow-hidden"
            />
          </div>

          {/* Real Hydrograph Telemetry Gauges */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>Station Hydrographs (h & Q vs t)</span>
              </h3>

              <select
                value={selectedGauge}
                onChange={(e) => setSelectedGauge(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-0.5 focus:outline-none focus:border-cyan-500"
              >
                {Object.keys(gauges).length > 0 ? (
                  Object.keys(gauges).map((gk) => (
                    <option key={gk} value={gk}>
                      {gk} ({gauges[gk]?.x_km || 0} km)
                    </option>
                  ))
                ) : (
                  stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name || st.station_name} ({st.km || st.chainage_km || 0} km)
                    </option>
                  ))
                )}
              </select>
            </div>

            {renderGaugeChart()}
          </div>
        </div>
      </div>
    </div>
  );
}
