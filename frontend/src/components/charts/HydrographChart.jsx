import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatFinite } from '../../utils/units';

export default function HydrographChart({
  times = [0, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
  flows = [0, 50000, 150000, 300000, 100000, 50000, 25000, 10000, 5000, 0, 0],
  currentTimeHrs = 0.1,
  peakDischarge = 300000,
}) {
  const maxFlow = Math.max(...flows, peakDischarge, 1000);
  const maxTime = Math.max(...times, 6.0);
  const svgW = 420, svgH = 140, padL = 45, padR = 15, padT = 10, padB = 25;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const scaleX = (t) => padL + (t / maxTime) * plotW;
  const scaleY = (q) => padT + plotH - (q / maxFlow) * plotH;
  const points = times.map((t, i) => `${scaleX(t)},${scaleY(flows[i] || 0)}`).join(' ');
  const areaPoints = `${scaleX(0)},${scaleY(0)} ${points} ${scaleX(times[times.length - 1])},${scaleY(0)}`;
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
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">LISFLOOD-FP Coupling Q(t)</span>
        </div>
        <span className="text-xs font-mono font-bold text-red-600">{formatFinite(peakDischarge / 1000, 0)}k m³/s peak</span>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">Provenance: BACK-SCALED DUALSPHYSICS MODEL RESULT</p>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full flex-1">
        <defs>
          <linearGradient id="hydroFillLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
          const y = padT + plotH * (1 - frac);
          const val = Math.round(maxFlow * frac);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={padL - 5} y={y + 3} fill="#94A3B8" fontSize="7" textAnchor="end" fontFamily="monospace">
                {val > 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}
        {[0, 1, 2, 3, 4, 5, 6].map((t) => (
          <g key={t}>
            <line x1={scaleX(t)} y1={svgH - padB} x2={scaleX(t)} y2={svgH - padB + 3} stroke="#CBD5E1" strokeWidth="1" />
            <text x={scaleX(t)} y={svgH - padB + 12} fill="#94A3B8" fontSize="7" textAnchor="middle" fontFamily="monospace">{t}h</text>
          </g>
        ))}
        <polygon points={areaPoints} fill="url(#hydroFillLight)" />
        <polyline points={points} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
        <line x1={currentX} y1={padT} x2={currentX} y2={svgH - padB} stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,2" />
        <circle cx={currentX} cy={currentY} r="3.5" fill="#F59E0B" stroke="#fff" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
