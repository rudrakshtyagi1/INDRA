import os

comparison = """
import React from 'react';
import { Activity, AlertTriangle, ChevronRight } from 'lucide-react';
import HydrographChart from '../components/charts/HydrographChart';

export default function ScenarioComparison() {
  return (
    <div className="p-8 max-w-7xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" /> Scenario Comparison
        </h1>
        <p className="text-slate-500">Compare physical breach parameters and downstream hydrographs.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-8">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Dam & Scenario Inputs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 w-1/4">Parameter</th>
                <th className="px-6 py-3 w-1/4 border-l border-slate-100">LOW (PMF)</th>
                <th className="px-6 py-3 w-1/4 border-l border-slate-100 bg-blue-50/30 text-blue-800">BASE (V3 WHAT-IF)</th>
                <th className="px-6 py-3 w-1/4 border-l border-slate-100">HIGH (Extreme)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="px-6 py-3 font-semibold text-slate-800">Reservoir State</td>
                <td className="px-6 py-3 border-l border-slate-100 text-slate-400">Not Simulated</td>
                <td className="px-6 py-3 border-l border-slate-100 bg-blue-50/30 font-mono">El 830.0 m (FRL)</td>
                <td className="px-6 py-3 border-l border-slate-100 text-slate-400">Not Simulated</td>
              </tr>
              <tr>
                <td className="px-6 py-3 font-semibold text-slate-800">Breach Width</td>
                <td className="px-6 py-3 border-l border-slate-100 text-slate-400">Not Simulated</td>
                <td className="px-6 py-3 border-l border-slate-100 bg-blue-50/30 font-mono">140.0 m</td>
                <td className="px-6 py-3 border-l border-slate-100 text-slate-400">Not Simulated</td>
              </tr>
              <tr>
                <td className="px-6 py-3 font-semibold text-slate-800">Breach Formation</td>
                <td className="px-6 py-3 border-l border-slate-100 text-slate-400">Not Simulated</td>
                <td className="px-6 py-3 border-l border-slate-100 bg-blue-50/30 font-mono">Instantaneous / Overtopping</td>
                <td className="px-6 py-3 border-l border-slate-100 text-slate-400">Not Simulated</td>
              </tr>
              <tr>
                <td className="px-6 py-3 font-semibold text-slate-800">Boundary Peak Q</td>
                <td className="px-6 py-3 border-l border-slate-100 text-slate-400">Not Simulated</td>
                <td className="px-6 py-3 border-l border-slate-100 bg-blue-50/30 font-mono text-blue-700 font-bold">300,000 m³/s</td>
                <td className="px-6 py-3 border-l border-slate-100 text-slate-400">Not Simulated</td>
              </tr>
              <tr>
                <td className="px-6 py-3 font-semibold text-slate-800">Provenance</td>
                <td className="px-6 py-3 border-l border-slate-100 text-slate-400">-</td>
                <td className="px-6 py-3 border-l border-slate-100 bg-blue-50/30 font-mono text-[10px]">BACK-SCALED DUALSPHYSICS MODEL RESULT</td>
                <td className="px-6 py-3 border-l border-slate-100 text-slate-400">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
         <h3 className="font-bold text-slate-800 mb-4">Hydrograph Comparison (At x = 2.0 km)</h3>
         <div className="h-64 mb-4">
            <HydrographChart />
         </div>
         <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>Only the BASE (V3) hydrograph is currently available. LOW and HIGH scenarios require solver execution.</p>
         </div>
      </div>
    </div>
  );
}
"""
with open("frontend/src/pages/ScenarioComparison.jsx", "w") as f:
    f.write(comparison)
