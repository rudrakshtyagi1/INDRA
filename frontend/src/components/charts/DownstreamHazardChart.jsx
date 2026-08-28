import React from 'react';
import { Waves, Gauge } from 'lucide-react';
import { formatFinite } from '../../utils/units';

export default function DownstreamHazardChart({
  stations = [
    { name: 'Tehri Axis', km: 0, depth: 68.5, vel: 22.4 },
    { name: 'Koteshwar', km: 22, depth: 42.0, vel: 18.2 },
    { name: 'Devprayag', km: 42, depth: 28.5, vel: 14.5 },
    { name: 'Shivpuri', km: 62, depth: 22.0, vel: 11.8 },
    { name: 'Rishikesh', km: 78, depth: 15.2, vel: 8.5 },
    { name: 'Haridwar', km: 100, depth: 9.4, vel: 5.2 },
  ],
}) {
  const svgW = 420;
  const svgH = 150;
  const padL = 35;
  const padR = 35;
  const padT = 15;
  const padB = 25;

  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const maxKm = 100;
  const maxDepth = 80;
  const maxVel = 25;

  const scaleX = (km) => padL + (km / maxKm) * plotW;
  const scaleDepthY = (d) => padT + plotH - (d / maxDepth) * plotH;
  const scaleVelY = (v) => padT + plotH - (v / maxVel) * plotH;

  const depthPoints = stations.map((s) => `${scaleX(s.km)},${scaleDepthY(s.depth)}`).join(' ');
  const velPoints = stations.map((s) => `${scaleX(s.km)},${scaleVelY(s.vel)}`).join(' ');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            Peak Depth &amp; Velocity Profile
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Depth (m)
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Vel (m/s)
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full py-1">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-28 overflow-visible">
          {/* Grid lines */}
          {[0, 0.5, 1.0].map((frac, i) => {
            const y = padT + plotH * (1 - frac);
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                <text x={padL - 4} y={y + 3} fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
                  {Math.round(maxDepth * frac)}m
                </text>
                <text x={svgW - padR + 4} y={y + 3} fill="#9333ea" fontSize="8" textAnchor="start" fontFamily="monospace">
                  {Math.round(maxVel * frac)}m/s
                </text>
              </g>
            );
          })}

          {/* Distance ticks */}
          {[0, 25, 50, 75, 100].map((km) => {
            const x = scaleX(km);
            return (
              <g key={km}>
                <line x1={x} y1={svgH - padB} x2={x} y2={svgH - padB + 4} stroke="#475569" strokeWidth="1" />
                <text x={x} y={svgH - padB + 14} fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="monospace">
                  {km}km
                </text>
              </g>
            );
          })}

          {/* Depth Line (Cyan) */}
          <polyline points={depthPoints} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
          {stations.map((s, i) => (
            <circle key={i} cx={scaleX(s.km)} cy={scaleDepthY(s.depth)} r="3.5" fill="#06b6d4" stroke="#0f172a" strokeWidth="1.5" />
          ))}

          {/* Velocity Line (Purple) */}
          <polyline points={velPoints} fill="none" stroke="#c084fc" strokeWidth="2" strokeDasharray="3,2" />
          {stations.map((s, i) => (
            <circle key={i} cx={scaleX(s.km)} cy={scaleVelY(s.vel)} r="3" fill="#c084fc" />
          ))}
        </svg>
      </div>

      {/* Bottom Summary */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono">
        <span className="text-slate-400">Tehri Axis Max:</span>
        <span className="text-slate-200">
          <strong className="text-cyan-400">68.5 m</strong> depth &bull; <strong className="text-purple-400">22.4 m/s</strong> surge
        </span>
      </div>
    </div>
  );
}
