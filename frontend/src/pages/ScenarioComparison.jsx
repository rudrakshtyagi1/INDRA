import React, { useState } from 'react';
import { Activity, AlertTriangle, Layers, Info } from 'lucide-react';
import HydrographChart from '../components/charts/HydrographChart';

const SCENARIOS = {
  LOW: {
    name: 'LOW (PMF)',
    description: 'Probable Maximum Flood benchmark.',
    hydrology: 'PMF Inflow',
    breach: 'Not Simulated',
    boundary: 'Not Simulated',
    hydrodynamics: 'Not Simulated',
    exposure: 'Not Simulated'
  },
  BASE: {
    name: 'BASE (V3 WHAT-IF)',
    description: 'Current verified what-if physical benchmark.',
    hydrology: 'Not Simulated (Direct Boundary)',
    breach: 'Instantaneous / Overtopping',
    boundary: '300,000 m³/s',
    hydrodynamics: 'LISFLOOD-FP 8.1 (800s)',
    exposure: '38.788 km road edges (0 critical)'
  },
  HIGH: {
    name: 'HIGH (Extreme)',
    description: 'Cascading failure boundary limits.',
    hydrology: 'Extreme Inflow',
    breach: 'Not Simulated',
    boundary: 'Not Simulated',
    hydrodynamics: 'Not Simulated',
    exposure: 'Not Simulated'
  }
};

export default function ScenarioComparison() {
  const [selected, setSelected] = useState(['BASE']);

  const toggleSelection = (key) => {
    setSelected(prev => {
       if (prev.includes(key)) {
         if (prev.length === 1) return prev; // keep at least one
         return prev.filter(k => k !== key);
       }
       if (prev.length >= 2) return [prev[1], key]; // max 2
       return [...prev, key];
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
             <Activity className="w-8 h-8 text-blue-600" /> Scenario Comparison
           </h1>
           <p className="text-slate-500 mt-1">Select up to two scenarios to compare boundary conditions and outputs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {Object.entries(SCENARIOS).map(([key, data]) => {
            const isSelected = selected.includes(key);
            const num = selected.indexOf(key) + 1;
            return (
              <div 
                key={key} 
                onClick={() => toggleSelection(key)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition relative ${isSelected ? 'border-blue-500 bg-blue-50/20 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}
              >
                 {isSelected && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">{num}</span>}
                 <h3 className="font-bold text-slate-800 text-lg mb-1">{data.name}</h3>
                 <p className="text-xs text-slate-500 mb-2">{data.description}</p>
                 <div className="mt-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Output Availability</div>
                 <div className="mt-1">
                    {data.hydrodynamics !== 'Not Simulated' ? (
                       <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">Simulated</span>
                    ) : (
                       <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">Not Simulated</span>
                    )}
                 </div>
              </div>
            );
         })}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-4">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Parameters & Results</h2>
          <span className="text-[10px] font-bold uppercase text-slate-400 border border-slate-200 px-2 py-1 rounded bg-white">{selected.length} Selected</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 w-1/4">Metric</th>
                {selected.map(s => <th key={s} className="px-6 py-3 border-l border-slate-200 text-slate-800">{SCENARIOS[s].name}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {['hydrology', 'breach', 'boundary', 'hydrodynamics', 'exposure'].map(param => (
                <tr key={param}>
                  <td className="px-6 py-3 font-semibold text-slate-800 capitalize">{param}</td>
                  {selected.map(s => {
                    const val = SCENARIOS[s][param];
                    const isNS = val === 'Not Simulated';
                    return (
                      <td key={s} className={`px-6 py-3 border-l border-slate-100 ${isNS ? 'text-slate-400 italic' : 'font-mono text-[11px] font-bold text-blue-700'}`}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
         <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-blue-500" /> Downstream Hydrograph Comparison</h3>
         <div className="h-64 mb-4">
            <HydrographChart />
         </div>
         {selected.some(s => SCENARIOS[s].hydrodynamics === 'Not Simulated') && (
           <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-xs font-semibold flex items-center gap-2 mt-4">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p>One or more selected scenarios lack hydrodynamic output. Curves are not displayed for unsimulated boundaries.</p>
           </div>
         )}
      </div>
    </div>
  );
}
