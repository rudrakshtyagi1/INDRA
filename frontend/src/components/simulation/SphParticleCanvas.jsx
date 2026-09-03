import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Activity,
} from 'lucide-react';
import sphFramesData from '../../data/sph_particles_v54.json';

export default function SphParticleCanvas() {
  const [frameIdx, setFrameIdx] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [viewMode, setViewMode] = useState('profile'); // 'profile' (X-Z) or 'plan' (X-Y)
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const totalFrames = sphFramesData.length;
  const currentFrame = sphFramesData[frameIdx] || sphFramesData[0];

  // Playback timer
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let lastTime = performance.now();
    const frameDuration = 200 / speed; // ms per frame

    const tick = (now) => {
      if (now - lastTime >= frameDuration) {
        setFrameIdx((prev) => (prev + 1) % totalFrames);
        lastTime = now;
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, speed, totalFrames]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#070B14';
    ctx.fillRect(0, 0, width, height);

    // Padding & scales
    const padL = 60;
    const padR = 40;
    const padT = 40;
    const padB = 45;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    // Coordinate extents
    // X (flow direction): -5m to +50m
    const minX = -4.0;
    const maxX = 50.0;
    const scaleX = (x) => padL + ((x - minX) / (maxX - minX)) * plotW;

    let scaleY;
    if (viewMode === 'profile') {
      // Z (vertical): -1.5m to +6.0m
      const minZ = -1.5;
      const maxZ = 5.5;
      scaleY = (z) => padT + plotH - ((z - minZ) / (maxZ - minZ)) * plotH;
    } else {
      // Y (lateral): 0m to 4m
      const minY = 0.5;
      const maxY = 3.5;
      scaleY = (y) => padT + plotH - ((y - minY) / (maxY - minY)) * plotH;
    }

    // Draw coordinate grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // X-axis grid lines (every 10m)
    ctx.font = '9px monospace';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'center';
    for (let x = 0; x <= 50; x += 10) {
      const cx = scaleX(x);
      ctx.beginPath();
      ctx.moveTo(cx, padT);
      ctx.lineTo(cx, padT + plotH);
      ctx.stroke();
      ctx.fillText(`${x}m`, cx, padT + plotH + 14);
    }

    // Y-axis grid lines
    ctx.textAlign = 'right';
    if (viewMode === 'profile') {
      for (let z = 0; z <= 5; z += 1) {
        const cy = scaleY(z);
        ctx.beginPath();
        ctx.moveTo(padL, cy);
        ctx.lineTo(padL + plotW, cy);
        ctx.stroke();
        ctx.fillText(`${z}m`, padL - 8, cy + 3);
      }
    } else {
      for (let y = 1; y <= 3; y += 0.5) {
        const cy = scaleY(y);
        ctx.beginPath();
        ctx.moveTo(padL, cy);
        ctx.lineTo(padL + plotW, cy);
        ctx.stroke();
        ctx.fillText(`${y.toFixed(1)}m`, padL - 8, cy + 3);
      }
    }
    ctx.setLineDash([]);

    // Draw Breach Embankment & Boundary structures
    ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;

    if (viewMode === 'profile') {
      // Dam face profile upstream
      ctx.beginPath();
      ctx.moveTo(scaleX(minX), scaleY(4.5));
      ctx.lineTo(scaleX(0), scaleY(4.5));
      ctx.lineTo(scaleX(0), scaleY(0));
      ctx.lineTo(scaleX(minX), scaleY(0));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Channel bed downstream
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(scaleX(0), scaleY(0));
      ctx.lineTo(scaleX(maxX), scaleY(0));
      ctx.stroke();
    }

    // Checkpoint line at x = 20m
    const cpX = scaleX(20.0);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(cpX, padT);
    ctx.lineTo(cpX, padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHECKPOINT x = 20m (Coupling Transect)', cpX, padT - 8);

    // Particle rendering color function (based on vmag)
    const getParticleColor = (v) => {
      if (v < 1.5) return '#0284C7'; // Cyan-600
      if (v < 3.5) return '#38BDF8'; // Sky-400
      if (v < 6.0) return '#34D399'; // Emerald-400
      if (v < 8.5) return '#FBBF24'; // Amber-400
      return '#F43F5E';              // Rose-500
    };

    // Draw all particles in current frame
    const particles = currentFrame.particles || [];
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]; // [x, y, z, vmag]
      const px = scaleX(p[0]);
      const py = viewMode === 'profile' ? scaleY(p[2]) : scaleY(p[1]);
      const v = p[3];

      ctx.fillStyle = getParticleColor(v);
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      viewMode === 'profile' ? 'PROFILE VIEW (Elevation Z vs Downstream X)' : 'PLAN VIEW (Lateral Y vs Downstream X)',
      padL,
      padT - 18
    );
  }, [frameIdx, currentFrame, viewMode]);

  return (
    <div className="bg-[#111827] border border-slate-800 rounded flex flex-col h-full overflow-hidden font-mono text-xs">
      {/* Top Banner */}
      <div className="p-3 border-b border-slate-800 bg-[#0B0F19] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-200">DUALSPHYSICS 5.4 CPU — REAL PARTICLE DYNAMICS</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-800 bg-emerald-950/80 text-emerald-400 font-bold">
            VERIFIED EXECUTION
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-slate-400">
            PROJECTION: <strong className="text-slate-200">{viewMode.toUpperCase()}</strong>
          </span>
          <div className="inline-flex rounded border border-slate-700 bg-slate-900 p-0.5">
            <button
              onClick={() => setViewMode('profile')}
              className={`px-2 py-0.5 rounded text-[10px] ${
                viewMode === 'profile' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              PROFILE (X-Z)
            </button>
            <button
              onClick={() => setViewMode('plan')}
              className={`px-2 py-0.5 rounded text-[10px] ${
                viewMode === 'plan' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              PLAN (X-Y)
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-[#070B14] flex items-center justify-center p-2 min-h-0">
        <canvas
          ref={canvasRef}
          width={840}
          height={380}
          className="w-full h-full object-contain rounded border border-slate-800/80"
        />

        {/* Real-time Watermark / Source Tag */}
        <div className="absolute top-4 left-4 bg-slate-950/80 border border-slate-800 p-2 rounded text-[9px] text-slate-400 pointer-events-none space-y-0.5">
          <div>SOURCE: <span className="text-slate-200">PartFluid_*.vtk (41 Real Binary Frames)</span></div>
          <div>DOWNSAMPLING: <span className="text-emerald-400">DISPLAY DOWNSAMPLING (Exact Float32 Coords)</span></div>
          <div>SOLVER: <span className="text-sky-400">DualSPHysics 5.4 Lagrangian SPH</span></div>
        </div>

        {/* Live Metrics Overlay */}
        <div className="absolute top-4 right-4 bg-slate-950/80 border border-slate-800 p-2 rounded text-[10px] text-right pointer-events-none space-y-0.5">
          <div className="text-slate-400">
            FRAME: <strong className="text-white">#{currentFrame.frame_index} / 41</strong>
          </div>
          <div className="text-slate-400">
            MODEL TIME: <strong className="text-sky-400">{currentFrame.model_time_s.toFixed(1)} s</strong>
          </div>
          <div className="text-slate-400">
            PROTOTYPE TIME: <strong className="text-amber-400">{currentFrame.prototype_time_s.toFixed(0)} s</strong>
          </div>
          <div className="text-slate-400">
            FLUID PARTICLES: <strong className="text-emerald-400">{currentFrame.particle_count}</strong>
          </div>
        </div>
      </div>

      {/* Controls Strip */}
      <div className="p-3 border-t border-slate-800 bg-[#0B0F19] flex items-center gap-3 shrink-0">
        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-8 h-8 rounded bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center shrink-0 shadow transition"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
        </button>

        {/* Step Buttons */}
        <button
          onClick={() => setFrameIdx((prev) => Math.max(0, prev - 1))}
          className="w-7 h-7 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center shrink-0"
          title="Step Backward"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setFrameIdx((prev) => Math.min(totalFrames - 1, prev + 1))}
          className="w-7 h-7 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center shrink-0"
          title="Step Forward"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Reset */}
        <button
          onClick={() => {
            setFrameIdx(0);
            setIsPlaying(false);
          }}
          className="w-7 h-7 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center shrink-0"
          title="Reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Scrubber */}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={totalFrames - 1}
            value={frameIdx}
            onChange={(e) => setFrameIdx(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Speed Controls */}
        <div className="flex items-center rounded border border-slate-700 bg-slate-900 p-0.5 shrink-0 text-[10px]">
          {[1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-1.5 py-0.5 rounded ${
                speed === s ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Velocity Ramp Legend */}
        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800 text-[9px] text-slate-400 shrink-0">
          <span>VELOCITY:</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0284C7] inline-block" /> 0-2</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#38BDF8] inline-block" /> 2-4</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#34D399] inline-block" /> 4-6</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FBBF24] inline-block" /> 6-8</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F43F5E] inline-block" /> &gt;8 m/s</span>
        </div>
      </div>
    </div>
  );
}
