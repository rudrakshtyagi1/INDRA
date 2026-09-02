
import React from 'react';
import { Database, ShieldCheck, FileCheck } from 'lucide-react';

export default function DataProvenance() {
  const sources = [
    { source: 'Copernicus GLO-30', purpose: 'Terrain Definition & Channel Topography', time: 'Static', space: 'Global', type: 'Remote Sensing', status: 'USED' },
    { source: 'ERA5-Land', purpose: 'Catchment Rainfall Forcing', time: 'Hourly', space: '9 km', type: 'Reanalysis', status: 'USED' },
    { source: 'CWC Tekhla', purpose: 'Hydrologic QA / Boundary condition validation', time: 'Daily', space: 'Point', type: 'Observed Gauge', status: 'USED' },
    { source: 'CWC Koteshwar', purpose: 'Downstream QA', time: 'Daily', space: 'Point', type: 'Observed Gauge', status: 'USED' },
    { source: 'HydroRIVERS', purpose: 'River routing context', time: 'Static', space: 'Global', type: 'Geospatial', status: 'USED' },
    { source: 'ESA WorldCover', purpose: 'Land-cover context / Roughness estimation', time: '2021', space: '10 m', type: 'Remote Sensing', status: 'USED' },
    { source: 'OpenStreetMap', purpose: 'Infrastructure, Roads, HADR Routing', time: 'Dynamic', space: 'Global', type: 'Open Geospatial', status: 'USED' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Data & Provenance</h1>
        <p className="text-slate-500">FloodLab core is physics-based. It does not use ML training for hydrodynamic prediction. All inputs are derived from physical observables or numerical solvers.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800">Verified V3 Data Pipeline</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Purpose</th>
                <th className="px-6 py-3">Time Coverage</th>
                <th className="px-6 py-3">Spatial Coverage</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map(s => (
                <tr key={s.source} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.source}</td>
                  <td className="px-6 py-4 text-slate-600">{s.purpose}</td>
                  <td className="px-6 py-4 text-slate-600">{s.time}</td>
                  <td className="px-6 py-4 text-slate-600">{s.space}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-mono">{s.type}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md tracking-wider">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
