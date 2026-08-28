import React from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { formatFinite } from '../../utils/units';

export default function HydrographChart({
  times = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0],
  flows = [0, 12000, 48000, 84200, 62000, 38000, 21000, 8500, 2400, 500],
  currentTimeHrs = 1.0,
  peakDischarge = 84200,
  timeToPeakHrs = 1.5,
}) {
  const maxFlow = Math.max(...flows, peakDischarge, 1000);
  const maxTime = Math.max(...times, 6.0);

  // SVG dimensions
  const svgW = 420;
  const svgH = 150;
  const padL = 45;
  const padR = 15;
  const padT = 15;
  const padB = 25;

  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const scaleX = (t) => padL + (t / maxTime) * plotW;
  const scaleY = (q) => padT + plotH - (q / maxFlow) * plotH;

  // Build points path
  const points = times.map((t, i) => `${scaleX(t)},${scaleY(flows[i] || 0)}`).join(' ');
  const areaPoints = `${scaleX(0)},${scaleY(0)} ${points} ${scaleX(times[times.length - 1])},${scaleY(0)}`;

  // Interpolate current discharge at currentTimeHrs
  let currentQ = 0;
  for (let i = 0; i < times.length - 1; i++) {
    if (currentTimeHrs >= times[i] && currentTimeHrs <= times[i + 1]) {
      const frac = (currentTimeHrs - times[i]) / (times[i + 1] - times[i]);
      currentQ = flows[i] + frac * (flows[i + 1] - flows[i]);
      break;
    }
  }
  if (currentTimeHrs >= times[times.length - 1]) {
    currentQ = flows[flows.length - 1] || 0;
  }

  const currentX = scaleX(currentTimeHrs);
  const currentY = scaleY(currentQ);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            Breach Outflow Q(t)
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-400">Peak:</span>
          <span className="text-red-400 font-bold">{formatFinite(peakDischarge, 0)} m³/s</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full py-1">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-28 overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
            const y = padT + plotH * (1 - frac);
            const val = Math.round(maxFlow * frac);
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                <text x={padL - 6} y={y + 3} fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">
                  {val > 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Time axis ticks */}
          {[0, 1, 2, 3, 4, 5, 6].map((t) => {
            const x = scaleX(t);
            return (
              <g key={t}>
                <line x1={x} y1={svgH - padB} x2={x} y2={svgH - padB + 4} stroke="#475569" strokeWidth="1" />
                <text x={x} y={svgH - padB + 14} fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="monospace">
                  {t}h
                </text>
              </g>
            );
          })}

          {/* Filled Area */}
          <polygon points={areaPoints} fill="url(#hydroFill)" fillOpacity="0.4" />

          {/* Discharge Line */}
          <polyline points={points} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />

          {/* Current Time Cursor Line */}
          <line
            x1={currentX}
            y1={padT}
            x2={currentX}
            y2={svgH - padB}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="4,2"
          />
          <circle cx={currentX} cy={currentY} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />

          {/* Gradients */}
          <defs>
            <linearGradient id="hydroFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom Live Metric */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono">
        <span className="text-slate-400">At T+{currentTimeHrs.toFixed(2)}h:</span>
        <span className="text-cyan-300 font-bold">{formatFinite(currentQ, 0)} m³/s</span>
      </div>
    </div>
  );
}
