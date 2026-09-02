
import React from 'react';
import { Building2 } from 'lucide-react';

export default function Infrastructure() {
  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" /> Infrastructure Exposure
          </h1>
          <p className="text-slate-500">Critical infrastructure intersecting the V3 hydrodynamic domain.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
         <div className="bg-white border border-slate-200 p-5 rounded-xl text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Settlements</h3>
            <span className="text-4xl font-light text-slate-800">0</span>
         </div>
         <div className="bg-white border border-slate-200 p-5 rounded-xl text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Healthcare</h3>
            <span className="text-4xl font-light text-slate-800">0</span>
         </div>
         <div className="bg-white border border-slate-200 p-5 rounded-xl text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bridges</h3>
            <span className="text-4xl font-light text-slate-800">0</span>
         </div>
         <div className="bg-white border border-slate-200 p-5 rounded-xl text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Power Stations</h3>
            <span className="text-4xl font-light text-slate-800">0</span>
         </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
         <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
           <h2 className="font-bold text-slate-800">Exposed Road Segments</h2>
         </div>
         <div className="p-6">
           <p className="text-sm text-slate-600 mb-4">The time-aware exposure analysis identified 38.788 km of road exposure within the 800-second window.</p>
           <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200">
              <tr>
                <th className="px-4 py-2">Infrastructure Type</th>
                <th className="px-4 py-2">Total Exposed</th>
                <th className="px-4 py-2">Model Window Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-medium">Roads (OSM Highway)</td>
                <td className="px-4 py-3">38.788 km</td>
                <td className="px-4 py-3 text-red-600 font-semibold text-xs uppercase tracking-wider">52 Edges Compromised</td>
              </tr>
            </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}
