import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, Waves } from 'lucide-react';
import { formatMinutes } from '../../utils/formatters';

export default function ArrivalTimelineChart({
  currentTimeMin = 60,
  stations = [
    { name: 'Tehri Dam Axis', arrivalMin: 0, depth: 68.5 },
    { name: 'Sirain Village', arrivalMin: 8, depth: 34.0 },
    { name: 'Tipri Riverside', arrivalMin: 18, depth: 28.5 },
    { name: 'Pangarh Settlement', arrivalMin: 26, depth: 24.0 },
    { name: 'Koteshwar Dam', arrivalMin: 32, depth: 42.0 },
    { name: 'Bagwan Hamlet', arrivalMin: 48, depth: 26.0 },
    { name: 'Devprayag Sangam', arrivalMin: 68, depth: 28.5 },
    { name: 'Shivpuri Gorge', arrivalMin: 92, depth: 22.0 },
    { name: 'Rishikesh Town', arrivalMin: 118, depth: 15.2 },
    { name: 'Haridwar Plains', arrivalMin: 175, depth: 9.4 },
  ],
}) {
  // Sort stations strictly by predicted arrival time
  const sorted = [...stations].sort((a, b) => a.arrivalMin - b.arrivalMin);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            Settlement Arrival Timeline
          </span>
        </div>
        <div className="text-[11px] font-mono text-amber-400 font-semibold">
          T+{formatMinutes(currentTimeMin)}
        </div>
      </div>

      {/* Non-overlapping Vertical Rows with Clear Status Badging */}
      <div className="space-y-1.5 py-1.5 overflow-y-auto max-h-36 pr-1 font-mono text-xs">
        {sorted.map((s, i) => {
          const isFlooded = currentTimeMin >= s.arrivalMin;
          const isImminent = !isFlooded && s.arrivalMin - currentTimeMin <= 30;

          return (
            <div
              key={i}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-colors ${
                isFlooded
                  ? 'bg-red-950/40 border-red-500/40 text-red-200'
                  : isImminent
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200 animate-pulse'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
              }`}
            >
              {/* Left: Time & Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isFlooded
                      ? 'bg-red-500/20 text-red-300'
                      : isImminent
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  T+{s.arrivalMin.toString().padStart(2, '0')}m
                </span>
                <span
                  className={`text-xs truncate ${
                    isFlooded ? 'font-bold text-red-100' : isImminent ? 'font-semibold text-amber-100' : 'text-slate-300'
                  }`}
                >
                  {s.name}
                </span>
              </div>

              {/* Right: Status Pill & Depth */}
              <div className="flex items-center gap-2 text-[10px] shrink-0">
                {isFlooded ? (
                  <span className="text-red-400 font-bold">INUNDATED ({s.depth}m)</span>
                ) : isImminent ? (
                  <span className="text-amber-300 font-semibold">
                    +{s.arrivalMin - currentTimeMin}m margin
                  </span>
                ) : (
                  <span className="text-slate-400">Safe (+{s.arrivalMin - currentTimeMin}m)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Status */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono">
        <span className="text-slate-400">Immediate Threat:</span>
        <span className="text-amber-300 font-semibold">
          {sorted.find((s) => s.arrivalMin > currentTimeMin)?.name || 'All Tracked Stations Inundated'}
        </span>
      </div>
    </div>
  );
}
