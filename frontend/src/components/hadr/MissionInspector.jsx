import React from 'react';
import { ShieldAlert, Navigation, Clock, AlertTriangle, AlertOctagon, Info, MapPin } from 'lucide-react';

export default function MissionInspector({ v3 }) {
  const summary = v3?.v3Routes?.routes?.[0] || {};
  
  return (
    <div className="h-full flex flex-col bg-[var(--surface-2)] overflow-y-auto">
      <div className="p-4 border-b border-[var(--surface-border)] shrink-0 bg-[var(--surface-1)]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            HADR Routing Benchmark
          </p>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded border border-amber-700/50">
            WHAT-IF HYDRODYNAMIC BENCHMARK
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-100">Prototype Mission Analysis</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Destination Card */}
        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" /> Destination Candidates
          </h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-500 text-xs block mb-1">Nearest by Distance:</span>
              <span className="text-slate-200 break-words">Laxman Jhula Government Hospital</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block mb-1">Nearest Reachable While Avoiding Current Modelled Hazard:</span>
              <span className="text-slate-200 break-words">Dr. Arora's Clinic</span>
            </div>
            <div className="mt-2 p-2 bg-blue-900/20 border border-blue-800 rounded flex gap-2 items-start">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span className="text-[10px] text-blue-300 leading-tight">
                REACHABILITY IS ASSESSED AGAINST THE CURRENT 800-S MODEL WINDOW.
              </span>
            </div>
          </div>
        </div>

        {/* Route Status */}
        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-indigo-400" /> Route Status
          </h4>
          
          <div className="space-y-4 text-sm">
            <div className="p-2 border border-red-900/50 bg-red-950/20 rounded">
              <span className="text-red-400 font-bold text-xs block mb-1">NORMAL ROUTE:</span>
              <span className="text-slate-300">NOT FEASIBLE AGAINST KNOWN MODELLED HAZARD</span>
              <div className="mt-2 text-xs text-slate-400 grid grid-cols-2 gap-2">
                <div>Distance: <span className="text-slate-200 break-words">133.61 km</span></div>
                <div>ETA: <span className="text-slate-200 break-words">~4.45 h</span></div>
              </div>
            </div>

            <div className="p-2 border border-emerald-900/50 bg-emerald-950/20 rounded">
              <span className="text-emerald-400 font-bold text-xs block mb-1">HAZARD-AWARE ROUTE:</span>
              <span className="text-slate-300">AVOIDS CURRENTLY MODELLED HAZARD SEGMENTS</span>
              <div className="mt-2 text-xs text-slate-400 grid grid-cols-2 gap-2">
                <div>Distance: <span className="text-slate-200 break-words">143.93 km (+10.32 km penalty)</span></div>
                <div>ETA: <span className="text-slate-200 break-words">~4.80 h</span></div>
                <div className="col-span-2">Hazard edges avoided: <span className="text-slate-200 break-words">2</span></div>
              </div>
            </div>
            
            <div className="p-2 bg-amber-900/20 border border-amber-800 rounded flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[10px] text-amber-300 leading-tight">
                <span className="font-bold block mb-1">FULL-ROUTE FUTURE HAZARD STATUS:</span>
                UNKNOWN BEYOND MODEL WINDOW
              </div>
            </div>
          </div>
        </div>

        {/* Operational Margin */}
        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" /> Operational Margin
          </h4>
          <div className="text-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Normal Route Minimum Modelled Margin:</span>
              <span className="text-red-400 font-mono font-bold">-1297 s</span>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              "The normal route reaches a modelled hazard segment after the prototype clearance window has expired."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
