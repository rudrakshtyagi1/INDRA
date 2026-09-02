import React from 'react';
import { Waves } from 'lucide-react';
import { formatFinite } from '../../utils/units';

export default function DownstreamHazardChart({
  stations = [
    { name: 'Tehri Axis', km: 0, depth: 68.5 },
    { name: 'Koteshwar', km: 22, depth: 42.0 },
    { name: 'Devprayag', km: 42, depth: 28.5 },
    { name: 'Shivpuri', km: 62, depth: 22.0 },
    { name: 'Rishikesh', km: 78, depth: 15.2 },
    { name: 'Haridwar', km: 100, depth: 9.4 },
  ],
}) {
  const svgW = 420;
  const svgH = 150;
  const padL = 35;
  const padR = 15;
  const padT = 15;
  const padB = 25;

  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const maxKm = 100;
  const maxDepth = 80;

  const scaleX = (km) => padL + (km / maxKm) * plotW;
  const scaleDepthY = (d) => padT + plotH - (d / maxDepth) * plotH;

  const depthPoints = stations.map((s) => `${scaleX(s.km)},${scaleDepthY(s.depth)}`).join(' ');
  const areaPoints = `${scaleX(0)},${scaleDepthY(0)} ${depthPoints} ${scaleX(100)},${scaleDepthY(0)}`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Waves className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">Peak Depth Profile</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-blue-500">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Depth (m)
          </span>
          <span className="text-slate-400 italic text-[9px]">Velocity: N/A in V3</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">Provenance: LISFLOOD-FP 8.1 peak depth, back-scaled DualSPHysics boundary</p>

      {/* SVG Chart */}
      <div className="relative w-full flex-1">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="depthFillLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
            const y = padT + plotH * (1 - frac);
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                <text x={padL - 4} y={y + 3} fill="#94A3B8" fontSize="7" textAnchor="end" fontFamily="monospace">
                  {Math.round(maxDepth * frac)}m
                </text>
              </g>
            );
          })}

          {/* Distance ticks */}
          {[0, 25, 50, 75, 100].map((km) => {
            const x = scaleX(km);
            return (
              <g key={km}>
                <line x1={x} y1={svgH - padB} x2={x} y2={svgH - padB + 3} stroke="#CBD5E1" strokeWidth="1" />
                <text x={x} y={svgH - padB + 12} fill="#94A3B8" fontSize="7" textAnchor="middle" fontFamily="monospace">
                  {km}km
                </text>
              </g>
            );
          })}

          {/* Filled area */}
          <polygon points={areaPoints} fill="url(#depthFillLight)" />

          {/* Depth Line */}
          <polyline points={depthPoints} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
          {stations.map((s, i) => (
            <circle key={i} cx={scaleX(s.km)} cy={scaleDepthY(s.depth)} r="3" fill="#2563EB" stroke="#fff" strokeWidth="1.5" />
          ))}
        </svg>
      </div>

      {/* Bottom Summary */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-mono">
        <span className="text-slate-400">Tehri Axis Max:</span>
        <span className="text-slate-700">
          <strong className="text-blue-600">68.5 m</strong> depth
          <span className="text-slate-400 ml-2 text-[10px] not-italic font-sans">(Velocity data: NOT AVAILABLE in V3)</span>
        </span>
      </div>
    </div>
  );
}
