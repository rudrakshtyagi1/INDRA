import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Map, Filter, Search } from 'lucide-react';
import L from 'leaflet';
import { useV3Data } from '../hooks/useV3Data';

export default function Exposure() {
  const v3 = useV3Data();
  const [activeFilter, setActiveFilter] = useState('ALL');
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({});

  // Init Map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, { center: [30.25, 78.35], zoom: 10, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Sync Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    ['roads', 'settlements', 'healthcare', 'bridges', 'power'].forEach(k => {
       if(layersRef.current[k]) { map.removeLayer(layersRef.current[k]); layersRef.current[k] = null; }
    });

    const isVisible = (k) => activeFilter === 'ALL' || activeFilter === k;

    if (isVisible('roads') && v3.v3Roads) {
       layersRef.current.roads = L.geoJSON(v3.v3Roads, { style: { color: '#EA580C', weight: 3 } }).addTo(map);
    }
    if (isVisible('settlements') && v3.v3Context?.settlements) {
       layersRef.current.settlements = L.geoJSON(v3.v3Context.settlements, { pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 3, fillColor: '#64748b', color: '#fff', weight: 1 }) }).addTo(map);
    }
    // and others if needed...

  }, [v3, activeFilter]);

  const roadEdges = v3.v3Roads?.features?.length || 0;

  return (
    <div className="flex flex-col h-full bg-slate-50">
       <div className="px-8 py-6 bg-white border-b border-slate-200 shrink-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-red-600" /> Exposure Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">Interactive asset exposure mapped against the V3 hydrodynamic window.</p>
       </div>

       {/* Summary Cards */}
       <div className="px-8 py-4 shrink-0 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { id: 'ALL', label: 'Overview', exp: '-', inv: '-' },
            { id: 'settlements', label: 'Settlements', exp: '0 exposed', inv: '1,049 inventoried' },
            { id: 'healthcare', label: 'Healthcare', exp: '0 exposed', inv: 'inventoried' },
            { id: 'bridges', label: 'Bridges', exp: '0 exposed', inv: '534 inventoried' },
            { id: 'roads', label: 'Roads', exp: '38.788 km exposed', inv: `${roadEdges} edges unavailable` }
          ].map(c => (
            <div key={c.id} onClick={() => setActiveFilter(c.id)} className={`p-4 rounded-xl border cursor-pointer transition ${activeFilter === c.id ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}>
               <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${activeFilter === c.id ? 'text-blue-700' : 'text-slate-500'}`}>{c.label}</h3>
               <div className="text-sm font-bold text-slate-800">{c.exp}</div>
               <div className="text-[10px] text-slate-400 mt-1">{c.inv}</div>
            </div>
          ))}
       </div>

       {/* Main Workspace */}
       <div className="flex-1 flex min-h-0 px-8 pb-8 gap-6">
          <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden relative shadow-sm">
             <div ref={mapContainerRef} className="absolute inset-0 z-0" />
          </div>
          
          <div className="w-[450px] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
             <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <span className="font-bold text-sm text-slate-800">Asset Directory</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">{activeFilter} Filter</span>
             </div>
             <div className="flex-1 overflow-y-auto p-0">
                {activeFilter === 'roads' ? (
                   <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-white sticky top-0 border-b border-slate-200">
                         <tr><th className="px-4 py-2 font-semibold text-slate-600 text-xs">Edge ID</th><th className="px-4 py-2 font-semibold text-slate-600 text-xs">Arrival (s)</th><th className="px-4 py-2 font-semibold text-slate-600 text-xs">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {v3.v3Roads?.features?.slice(0, 50).map(f => (
                           <tr key={f.properties.osmid} className="hover:bg-slate-50 cursor-pointer">
                              <td className="px-4 py-3 font-mono text-[10px] text-slate-600">{f.properties.osmid}</td>
                              <td className="px-4 py-3 font-mono text-slate-800 font-bold">{Math.round(f.properties.arrival_time_hr * 3600)}</td>
                              <td className="px-4 py-3"><span className="text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-1 rounded">Intersected</span></td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                ) : (
                   <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                      <ShieldAlert className="w-8 h-8 mb-3 opacity-20" />
                      <p className="text-sm font-medium text-slate-600 mb-1">No Assets Intersected</p>
                      <p className="text-xs">No {activeFilter === 'ALL' ? 'critical assets' : activeFilter} intersect the current 800s modelled hazard window.</p>
                   </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}
