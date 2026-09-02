import React, { useState } from 'react';
import { Database, Search, Info, Cpu, Network, Globe } from 'lucide-react';

const DATASETS = [
  { id: 'copernicus', source: "Copernicus GLO-30", provider: 'ESA', purpose: "Terrain Definition", type: "Remote Sensing", status: "USED", resolution: "30 m", processing: "Terrain conditioning, hydrologic enforcement, grid generation for LISFLOOD-FP." },
  { id: 'era5', source: "ERA5-Land", provider: 'ECMWF', purpose: "Catchment Forcing", type: "Reanalysis", status: "USED", resolution: "9 km", processing: "Rainfall extraction and routing constraint generation." },
  { id: 'cwc_t', source: "CWC Tekhla", provider: 'Central Water Commission', purpose: "Boundary QA", type: "Observed Gauge", status: "USED", resolution: "Point", processing: "Daily time-series extraction for upstream validation context." },
  { id: 'osm', source: "OpenStreetMap", provider: 'OSM Contributors', purpose: "Infrastructure & HADR", type: "Open Geospatial", status: "USED", resolution: "Vector", processing: "Graph extraction for pgRouting, spatial filtering of critical assets against hazard buffers." },
];

const PIPELINE = [
  { id: 'obs', label: 'Observations', out: 'ERA5 / CWC', prov: 'OBSERVED / REANALYSIS' },
  { id: 'hydro', label: 'Hydrology', out: 'Catchment Q', prov: 'DERIVED' },
  { id: 'breach', label: 'Breach Gen', out: 'Froehlich parameters', prov: 'ASSUMED / EMPIRICAL' },
  { id: 'dsph', label: 'Near-field (DualSPHysics)', out: '300k m³/s Q(t)', prov: 'MODELLED' },
  { id: 'lisf', label: 'Downstream (LISFLOOD-FP)', out: 'Depth / Arrival Rasters', prov: 'MODELLED' },
  { id: 'exp', label: 'Exposure', out: 'Asset Intersections', prov: 'PRECOMPUTED' },
  { id: 'hadr', label: 'HADR Routes', out: 'Vector paths & ETA', prov: 'PRECOMPUTED' }
];

export default function DataProvenance() {
  const [selectedData, setSelectedData] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);

  return (
    <div className="flex w-full h-full">
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Scientific Provenance</h1>
          <p className="text-slate-500">FloodLab core is physics-based. It does not use ML training for hydrodynamic prediction.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-8">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <Network className="w-5 h-5 text-purple-600" />
            <h2 className="font-bold text-slate-800">Model Pipeline Architecture</h2>
          </div>
          <div className="p-6 overflow-x-auto">
             <div className="flex items-center gap-2 min-w-max">
                {PIPELINE.map((stage, i) => (
                  <React.Fragment key={stage.id}>
                    <div 
                      onClick={() => { setSelectedStage(stage); setSelectedData(null); }}
                      className={`px-4 py-3 border rounded-lg cursor-pointer transition text-center flex flex-col justify-center min-w-[120px] ${selectedStage?.id === stage.id ? 'border-purple-500 bg-purple-50 shadow-md ring-2 ring-purple-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                       <span className="text-xs font-bold text-slate-700">{stage.label}</span>
                       <span className="text-[9px] text-slate-400 font-mono mt-1">{stage.prov}</span>
                    </div>
                    {i < PIPELINE.length - 1 && <span className="text-slate-300 font-mono">-&gt;</span>}
                  </React.Fragment>
                ))}
             </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-800">Canonical Datasets</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr><th className="px-6 py-3">Source</th><th className="px-6 py-3">Purpose</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DATASETS.map(d => (
                  <tr key={d.id} onClick={() => { setSelectedData(d); setSelectedStage(null); }} className={`cursor-pointer transition ${selectedData?.id === d.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4 font-bold text-slate-800">{d.source}</td>
                    <td className="px-6 py-4 text-slate-600">{d.purpose}</td>
                    <td className="px-6 py-4 text-slate-500 text-[10px] font-mono">{d.type}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider">{d.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Right Drawer */}
      {(selectedData || selectedStage) && (
        <div className="w-[360px] bg-white border-l border-slate-200 p-6 flex flex-col h-full overflow-y-auto shadow-2xl">
           <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4 uppercase tracking-wider flex items-center gap-2">
             <Info className="w-4 h-4 text-blue-500" /> {selectedData ? 'Dataset Details' : 'Pipeline Stage'}
           </h3>
           
           {selectedData && (
             <div className="space-y-4">
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Provider</span><span className="font-medium text-slate-800 text-sm">{selectedData.provider}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Resolution / Scale</span><span className="font-mono text-slate-600 text-sm">{selectedData.resolution}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Processing</span><p className="text-sm text-slate-600 leading-relaxed">{selectedData.processing}</p></div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                   <span className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Project Constraint</span>
                   <p className="text-xs text-blue-700">Data usage strictly verified for prototype research purposes. Not a commercial operational forecast.</p>
                </div>
             </div>
           )}

           {selectedStage && (
             <div className="space-y-4">
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Stage Name</span><span className="font-medium text-slate-800 text-lg">{selectedStage.label}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Provenance Category</span><span className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] rounded inline-block mt-1">{selectedStage.prov}</span></div>
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Primary Output</span><span className="font-mono text-slate-600 text-sm">{selectedStage.out}</span></div>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
