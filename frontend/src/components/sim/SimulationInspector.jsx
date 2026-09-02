import React from 'react';
import { Users, Building2, MapPin, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useV3Data } from '../../hooks/useV3Data';

export default function SimulationInspector() {
  const v3 = useV3Data();
  const exp = v3?.v3Exposure || {};
  
  return (
    <div className="h-full flex flex-col bg-[var(--surface-2)] border-l border-[var(--surface-border)] overflow-y-auto w-80 shrink-0">
      <div className="p-4 border-b border-[var(--surface-border)] shrink-0 bg-[var(--surface-1)]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            Exposure Analysis
          </p>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded border border-amber-700/50">
            WHAT-IF HYDRODYNAMIC BENCHMARK
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-100">Prototype Exposure</h3>
      </div>

      <div className="p-4 space-y-4 text-sm text-slate-300">
        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Model Parameters</h4>
          <ul className="space-y-2 text-xs">
            <li><span className="text-slate-500">Simulation Window:</span> <span className="font-mono text-slate-200">800 seconds</span></li>
            <li><span className="text-slate-500">Modeled Propagation:</span> <span className="font-mono text-slate-200">~Current V3 reach only</span></li>
          </ul>
        </div>

        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> Exposure Summary
          </h4>
          <ul className="space-y-3">
            <li className="flex justify-between items-center">
              <span className="text-slate-400">Settlements Intersected</span>
              <span className="font-mono text-slate-200">0</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-400">Healthcare Intersected</span>
              <span className="font-mono text-slate-200">0</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-400">Bridges Intersected</span>
              <span className="font-mono text-slate-200">0</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-400">Power Assets Intersected</span>
              <span className="font-mono text-slate-200">0</span>
            </li>
            <li className="flex justify-between items-center pt-2 border-t border-slate-700/50">
              <span className="text-slate-400 font-bold">Road Exposure</span>
              <span className="font-mono text-orange-400 font-bold">38.788 km</span>
            </li>
          </ul>
        </div>
        
        <div className="p-3 bg-blue-900/20 border border-blue-800 rounded flex gap-2 items-start">
          <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300 leading-tight">
            Current short simulation window primarily covers the steep upper gorge. Downstream areas outside the hazard polygon have a status of <strong>OUTSIDE CURRENT MODELLED HAZARD WINDOW</strong>, not "safe".
          </p>
        </div>
        
        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            Provenance Panel
          </h4>
          <ul className="space-y-1.5 text-[11px]">
            <li><span className="text-slate-500">Terrain:</span> <span className="text-slate-300">Copernicus DEM-derived</span></li>
            <li><span className="text-slate-500">Near field:</span> <span className="text-slate-300">DualSPHysics</span></li>
            <li><span className="text-slate-500">Downstream:</span> <span className="text-slate-300">LISFLOOD-FP 8.1 (30m)</span></li>
            <li><span className="text-slate-500">Hydraulic roughness:</span> <span className="text-slate-300">Assumed uniform Manning n = 0.06</span></li>
            <li><span className="text-slate-500">Channel geometry:</span> <span className="text-slate-300">Simplified numerical coupling geometry</span></li>
            <li><span className="text-slate-500">Boundary:</span> <span className="text-slate-300">Back-scaled DualSPHysics benchmark</span></li>
            <li className="mt-2 text-amber-500/80 font-bold">Physical validation: Not available</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
