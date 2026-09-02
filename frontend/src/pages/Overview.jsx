import React, { useMemo } from 'react';
import { ArrowRight, Play, Server, Database, ShieldCheck, Map as MapIcon } from 'lucide-react';
import { useV3Data } from '../hooks/useV3Data';
import { generateOperationalInsights } from '../utils/insightsEngine';

export default function Overview({ onNavigate }) {
  const v3 = useV3Data();
  const insights = useMemo(() => generateOperationalInsights(v3, 0), [v3]);

  const PIPELINE = [
    { label: 'Meteorology', status: 'pass' },
    { label: 'Hydrologic Inflow', status: 'pass' },
    { label: 'Breach Benchmark', status: 'pass' },
    { label: 'DualSPHysics 5.4 CPU', status: 'pass' },
    { label: 'Q(t) Coupling', status: 'pass' },
    { label: 'LISFLOOD-FP 8.1', status: 'pass' },
    { label: 'Exposure', status: 'pass' },
    { label: 'HADR Routing', status: 'pass' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Tehri Dam Inundation Study</h1>
          <p className="text-slate-500 max-w-3xl">Interactive hydrodynamic simulation and emergency-response platform.</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => onNavigate('scenarios')} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition cursor-pointer">Compare Scenarios</button>
           <button onClick={() => onNavigate('simulation')} className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-2 cursor-pointer">
             <Play className="w-4 h-4 fill-white" /> Open Simulation
           </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Study Map Mockup / Static Image (Using a placeholder box for now, actual map would be Leaflet) */}
        <div 
          onClick={() => onNavigate('simulation')} 
          className="lg:col-span-2 bg-slate-100 rounded-2xl border border-slate-200 h-[400px] flex items-center justify-center relative overflow-hidden cursor-pointer group"
        >
           <img src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/13/3389/5801" alt="Tehri Study Area" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:scale-105 transition-transform duration-700" />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
           <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-2 rounded-lg border border-white/20 shadow-sm flex items-center gap-2 text-xs font-bold text-slate-700">
             <MapIcon className="w-4 h-4 text-blue-600" /> Click to open Interactive Map
           </div>
           <div className="relative z-10 text-center text-white bg-slate-900/80 backdrop-blur px-6 py-4 rounded-xl border border-white/10">
              <h2 className="text-xl font-bold mb-1">Bhagirathi - Ganga Corridor</h2>
              <p className="text-slate-300 text-sm">Study corridor: ~145 km &bull; V3 hydrodynamic domain: 15 km &bull; Grid resolution: 30 m &bull; Simulation window: 800 s</p>
           </div>
        </div>

        {/* Status Panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
             <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">System Readiness</h3>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600"><Server className="w-4 h-4 text-blue-500" /> Solver Status</div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Executed</span>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600"><Database className="w-4 h-4 text-purple-500" /> V3 Data Payload</div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Precomputed</span>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck className="w-4 h-4 text-amber-500" /> Physical Validation</div>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">Not Available</span>
             </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 flex-1 flex flex-col justify-between">
             <div>
               <h3 className="font-bold text-slate-800 mb-2">Model Parameters (V3)</h3>
               <div className="text-sm text-slate-600 space-y-1 font-mono text-[11px]">
                 <div className="flex justify-between"><span>Boundary Q:</span><span className="font-bold text-slate-800">300,000 m³/s</span></div>
                 <div className="flex justify-between"><span>Simulation Window:</span><span className="font-bold text-slate-800">800 s</span></div>
                 <div className="flex justify-between"><span>Manning n:</span><span className="font-bold text-slate-800">0.06</span></div>
               </div>
             </div>
             <button onClick={() => onNavigate('hadr')} className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition cursor-pointer">View HADR Operations</button>
          </div>
        </div>
      </div>

      {/* Operational Insights */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-bold text-slate-800 mb-6">Current Operational Picture</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map(insight => (
            <div key={insight.id} className={`p-4 rounded-xl border ${insight.severity === 'high' ? 'bg-red-50/50 border-red-200' : insight.severity === 'success' ? 'bg-emerald-50/50 border-emerald-200' : insight.severity === 'warning' ? 'bg-amber-50/50 border-amber-200' : 'bg-blue-50/50 border-blue-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${insight.severity === 'high' ? 'text-red-600' : insight.severity === 'success' ? 'text-emerald-600' : insight.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'}`}>{insight.category}</span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">{insight.title}</h4>
              <p className="text-xs text-slate-600 mb-3">{insight.explanation}</p>
              <button onClick={() => onNavigate('simulation')} className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer">{insight.action} &rarr;</button>
            </div>
          ))}
        </div>
      </div>

      {/* Physics Pipeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-bold text-slate-800 mb-6">Scientific Pipeline Architecture</h3>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
          {PIPELINE.map((step, i) => (
             <React.Fragment key={step.label}>
               <div className="flex-1 min-w-[120px] bg-slate-50 border border-slate-200 rounded-lg p-3 text-center flex flex-col items-center justify-center relative hover:bg-white hover:shadow-sm transition cursor-default">
                  <span className="text-[11px] font-bold text-slate-700 uppercase mt-1">{step.label}</span>
               </div>
               {i < PIPELINE.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />}
             </React.Fragment>
          ))}
        </div>
      </div>

    </div>
  );
}
