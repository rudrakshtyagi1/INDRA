import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { formatMinutes } from '../../utils/formatters';

export default function ArrivalTimelineChart({ currentTimeMin = 0 }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">Settlement Arrival Timeline</span>
        </div>
        <div className="text-[11px] font-mono text-amber-600 font-semibold">
          T+{formatMinutes(currentTimeMin)}
        </div>
      </div>

      <div className="flex flex-col justify-center items-center h-full space-y-4 pt-4 text-center">
        <div>
          <span className="text-slate-400 font-bold text-[10px] block mb-1">SETTLEMENT EXPOSURE:</span>
          <span className="text-emerald-600 font-mono text-xs font-bold">NONE INTERSECTED WITHIN CURRENT MODEL WINDOW</span>
        </div>
        
        <div className="p-2 border border-amber-200 bg-amber-50 rounded-lg flex gap-2 items-start max-w-xs mx-auto">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="text-[10px] text-amber-700 leading-tight text-left">
            <span className="font-bold block mb-0.5">DOWNSTREAM STATUS:</span>
            UNKNOWN BEYOND MODEL WINDOW
          </div>
        </div>
      </div>
    </div>
  );
}
