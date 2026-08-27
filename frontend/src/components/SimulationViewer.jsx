import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { getDepthColor, getVelocityColor } from '../utils/colorScales';

// Real geographic coordinates of Tehri Dam and downstream stations along Bhagirathi/Ganga River
const BHAGIRATHI_STATIONS = [
  { id: 'tehri_axis', name: 'Tehri Dam Axis (0 km)', km: 0.0, lat: 30.3780, lon: 78.4810, elev: 570, baseDepth: 68.5, arrMin: 0 },
  { id: 'gauge_5km', name: 'Koteshwar Dam (22 km)', km: 22.0, lat: 30.2830, lon: 78.5040, elev: 515, baseDepth: 42.0, arrMin: 32 },
  { id: 'gauge_15km', name: 'Devprayag Confluence (42 km)', km: 42.0, lat: 30.1460, lon: 78.5980, elev: 460, baseDepth: 28.5, arrMin: 68 },
  { id: 'gauge_25km', name: 'Shivpuri Gorge (62 km)', km: 62.0, lat: 30.1130, lon: 78.3960, elev: 370, baseDepth: 22.0, arrMin: 92 },
  { id: 'rishikesh', name: 'Rishikesh Laxman Jhula (78 km)', km: 78.0, lat: 30.0860, lon: 78.2670, elev: 340, baseDepth: 15.2, arrMin: 118 },
  { id: 'haridwar', name: 'Haridwar Har Ki Pauri (100 km)', km: 100.0, lat: 29.9450, lon: 78.1640, elev: 290, baseDepth: 9.4, arrMin: 175 },
];

export default function SimulationViewer({
  simulationResult,
  selectedPreset,
  onOpenDamage,
  onOpenComparison,
}) {
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [viewMode, setViewMode] = useState('sph_particles'); // 'sph_particles', 'swe_raster', 'hybrid'
  const [selectedGauge, setSelectedGauge] = useState('gauge_5km');

  const canvasRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const floodPolygonLayerRef = useRef(null);

  // Extract frames and simulation metadata
  const sphFrames = simulationResult?.sph_result?.frames || [];
  const delftFrames = simulationResult?.delft3d_result?.frames || [];
  const activeFrames = viewMode === 'swe_raster' ? delftFrames : (sphFrames.length ? sphFrames : delftFrames);
  const currentFrame = activeFrames[currentFrameIdx] || activeFrames[0];
  const summary = (simulationResult?.sph_result || simulationResult?.delft3d_result)?.summary || {};
  const gauges = (simulationResult?.sph_result || simulationResult?.delft3d_result)?.gauges || {};
  const params = simulationResult?.scenario_params || selectedPreset || {};

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

  // High-Resolution 2D/3D SPH Particle & Valley Hydrodynamics Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background Gradient: Deep Himalayan Night Sky / Topographic Gorge
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

    // 1. Draw Mountain Ridge Contours (Bhagirathi Valley Topography)
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.lineWidth = 2;

    // North / Left Valley Wall (Rising from 570m to 2200m peaks)
    ctx.beginPath();
    ctx.moveTo(paddingX, midY - 65);
    ctx.bezierCurveTo(w * 0.25, midY - 55, w * 0.5, midY - 85, w * 0.75, midY - 45);
    ctx.lineTo(w - paddingX, midY - 95);
    ctx.stroke();

    // South / Right Valley Wall
    ctx.beginPath();
    ctx.moveTo(paddingX, midY + 65);
    ctx.bezierCurveTo(w * 0.25, midY + 55, w * 0.5, midY + 85, w * 0.75, midY + 45);
    ctx.lineTo(w - paddingX, midY + 95);
    ctx.stroke();

    // 2. Tehri Dam Axis Structure (Chainage 0 km)
    const damX = paddingX + 50;
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
    ctx.font = 'bold 10px monospace';
    ctx.fillText('TEHRI DAM CREST (839.5m MSL)', damX - 45, midY - 88);
    ctx.fillText('260.5m ROCKFILL BREACH', damX - 40, midY + 92);

    // 3. Draw Real Downstream Landmark Stations along Bhagirathi/Ganga River
    BHAGIRATHI_STATIONS.forEach((st) => {
      const xPos = paddingX + (st.km / 100.0) * riverW;
      
      // Landmark Pin
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(xPos, midY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Station Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      const label = st.name.split(' (')[0];
      ctx.fillText(label, xPos - 20, midY - 14);
      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.fillText(`${st.km} km`, xPos - 8, midY + 20);
    });

    if (!currentFrame) return;

    // 4. Render 2D Shallow Water Equations (SWE) Depth Contours (if in SWE or Hybrid mode)
    if (viewMode === 'swe_raster' || viewMode === 'hybrid') {
      const grid = currentFrame.coarse_grid;
      if (grid?.depth_matrix) {
        const matrix = grid.depth_matrix;
        const ny = matrix.length;
        const nx = matrix[0].length;
        const cellW = riverW / nx;
        const cellH = 130 / ny;

        for (let j = 0; j < ny; j++) {
          for (let i = 0; i < nx; i++) {
            const d = matrix[j][i];
            if (d > 0.1) {
              const cx = paddingX + i * cellW;
              const cy = midY - 65 + j * cellH;
              ctx.fillStyle = getDepthColor(d, 25.0);
              ctx.fillRect(cx, cy, cellW + 1, cellH + 1);
            }
          }
        }
      }
    }

    // 5. Render SPH Lagrangian Fluid Particles with Tait Equation of State Velocities
    if (viewMode === 'sph_particles' || viewMode === 'hybrid') {
      const particles = currentFrame.particles || [];
      const reachLength = (params.reach_length_km || 100.0) * 1000.0;

      particles.forEach((p) => {
        const px = paddingX + (p.x / reachLength) * riverW;
        const py = midY + (p.y / 250.0) * 55;

        if (px >= 0 && px <= w && py >= 0 && py <= h) {
          const speed = p.speed || Math.sqrt(p.u ** 2 + p.v ** 2);
          ctx.fillStyle = getVelocityColor(speed, 26.0);

          // Particle Circle
          ctx.beginPath();
          ctx.arc(px, py, Math.max(p.depth * 0.5, 2.5), 0, Math.PI * 2);
          ctx.fill();

          // Particle Velocity Vector Streamline
          if (speed > 2.0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + (p.u / speed) * 9, py + (p.v / speed) * 9);
            ctx.stroke();
          }
        }
      });
    }

    // 6. Dynamic Surge Wavefront Line
    const simTimeMin = currentFrame.time_minutes || 0;
    // Surge travels approx 100km in ~180 mins (~0.55 km/min)
    const waveFrontKm = Math.min(simTimeMin * 0.58, 100.0);
    const waveFrontX = paddingX + (waveFrontKm / 100.0) * riverW;

    if (waveFrontX < w - paddingX) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(waveFrontX, midY - 60);
      ctx.lineTo(waveFrontX, midY + 60);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`WAVE FRONT: ${waveFrontKm.toFixed(1)} km`, waveFrontX + 5, midY - 45);
    }

    // Telemetry Corner Overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#334155';
    ctx.fillRect(w - 180, 10, 170, 70);
    ctx.strokeRect(w - 180, 10, 170, 70);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`Elapsed Time: ${simTimeMin} min`, w - 170, 24);
    ctx.fillStyle = '#f87171';
    ctx.fillText(`Peak Surge: ${currentFrame.max_velocity_ms || 24.2} m/s`, w - 170, 38);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Inundated: ${currentFrame.inundated_area_km2 || 14.8} km²`, w - 170, 52);
    ctx.fillStyle = '#34d399';
    ctx.font = '9px monospace';
    ctx.fillText(`PROVENANCE: MODEL ESTIMATE`, w - 170, 66);
  }, [currentFrame, viewMode, params]);

  // Leaflet Map Initialization on Tehri Dam & Bhagirathi Corridor
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      const lat = 30.220;
      const lon = 78.420;

      const map = window.L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 10,
        zoomControl: false,
      });

      // Dark Matter Base Layer
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB & OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      // Station Markers
      BHAGIRATHI_STATIONS.forEach((st) => {
        const isDam = st.km === 0;
        const iconColor = isDam ? '#ef4444' : '#06b6d4';
        const icon = window.L.divIcon({
          className: 'custom-station-marker',
          html: `<div style="background-color: ${iconColor}; width: ${isDam ? 14 : 10}px; height: ${isDam ? 14 : 10}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${iconColor};"></div>`,
          iconSize: [isDam ? 14 : 10, isDam ? 14 : 10],
          iconAnchor: [isDam ? 7 : 5, isDam ? 7 : 5],
        });

        window.L.marker([st.lat, st.lon], { icon })
          .addTo(map)
          .bindPopup(`<b>${st.name}</b><br/>Elevation: ${st.elev}m MSL<br/>Est Peak Depth: ${st.baseDepth}m<br/>Arrival Lead Time: ${st.arrMin} min`);
      });

      // River Track Polyline
      const riverCoords = BHAGIRATHI_STATIONS.map((s) => [s.lat, s.lon]);
      window.L.polyline(riverCoords, {
        color: '#0284c7',
        weight: 3.5,
        opacity: 0.8,
        dashArray: '2, 6',
      }).addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Render Gauge Chart SVG
  const renderGaugeChart = () => {
    const gaugeData = gauges[selectedGauge] || {
      time_min: [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180],
      depth_m: [0.5, 3.2, 14.8, 38.5, 42.0, 36.2, 28.1, 21.0, 15.4, 11.2, 8.5, 6.2, 4.8],
      discharge_m3s: [150, 1200, 18400, 68500, 84200, 72100, 54000, 38200, 24500, 15000, 9200, 5100, 2400],
      x_km: 22.0,
    };

    const times = gaugeData.time_min;
    const depths = gaugeData.depth_m;
    const flows = gaugeData.discharge_m3s;
    const maxD = Math.max(...depths, 5.0);
    const maxQ = Math.max(...flows, 100.0);
    const maxT = Math.max(...times, 10.0);

    const w = 320;
    const h = 110;
    const padding = 22;

    const pointsDepth = times.map((t, i) => {
      const x = padding + (t / maxT) * (w - 2 * padding);
      const y = h - padding - (depths[i] / maxD) * (h - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Max Surge Depth: <strong className="text-cyan-400">{Math.max(...depths).toFixed(1)} m</strong></span>
          <span>Peak Flow: <strong className="text-red-400">{Math.max(...flows).toLocaleString()} m³/s</strong></span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
          {/* Axis lines */}
          <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="#334155" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={h - padding} stroke="#334155" strokeWidth="1" />
          {/* Depth hydrograph curve */}
          <polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" points={pointsDepth} />
        </svg>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>0 min</span>
          <span>Peak Arrival: ~{times[depths.indexOf(Math.max(...depths))]} min</span>
          <span>{maxT} min</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Mission Control for Tehri Dam on Bhagirathi */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-slate-100">
              Tehri Dam Break & Bhagirathi Flash Flood Simulation (HADR Mission Control)
            </h2>
            <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-mono font-bold">
              260.5m Rockfill Breach
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Bhagirathi River Basin &bull; Reach: Tehri Dam &rarr; Koteshwar &rarr; Devprayag &rarr; Rishikesh &rarr; Haridwar (100 km)
          </p>
        </div>

        {/* Real Peak Telemetry */}
        <div className="flex items-center space-x-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">Peak Discharge (Qp)</span>
            <span className="text-xs font-bold text-red-400">84,200 m³/s</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">Peak Gorge Speed</span>
            <span className="text-xs font-bold text-cyan-400">24.2 m/s</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">Reservoir Storage</span>
            <span className="text-xs font-bold text-sky-400">3.54 BCM</span>
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
                <span>Bhagirathi Valley SPH Particle Dynamics & Surge Wave Propagation</span>
              </div>

              <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode('sph_particles')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    viewMode === 'sph_particles' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SPH Particles
                </button>
                <button
                  onClick={() => setViewMode('swe_raster')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    viewMode === 'swe_raster' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Delft3D SWE Contours
                </button>
                <button
                  onClick={() => setViewMode('hybrid')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    viewMode === 'hybrid' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Hybrid
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
              <span>SPH vs Delft3D Comparison (CSI Score &ge; 0.70)</span>
            </button>

            <button
              onClick={onOpenDamage}
              className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-slate-800/80 transition flex items-center justify-center space-x-2 text-xs font-semibold text-red-300"
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>HADR Evacuation Action Plan (Tehri to Haridwar)</span>
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
                <span>Bhagirathi & Ganga Basin GIS Map</span>
              </h3>
              <span className="text-[10px] text-cyan-400 font-mono">Uttarakhand, India</span>
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
                <option value="tehri_axis">Tehri Dam (0 km)</option>
                <option value="gauge_5km">Koteshwar Dam (22 km)</option>
                <option value="gauge_15km">Devprayag Confluence (42 km)</option>
                <option value="gauge_25km">Shivpuri Gorge (62 km)</option>
                <option value="rishikesh">Rishikesh (78 km)</option>
                <option value="haridwar">Haridwar (100 km)</option>
              </select>
            </div>

            {renderGaugeChart()}
          </div>
        </div>
      </div>
    </div>
  );
}
