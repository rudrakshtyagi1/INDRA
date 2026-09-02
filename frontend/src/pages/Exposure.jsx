import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Map, Filter, Search } from 'lucide-react';
import L from 'leaflet';
import { useV3Data } from '../hooks/useV3Data';

export default function Exposure() {
  const v3 = useV3Data();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedRun, setSelectedRun] = useState('v3_benchmark');
  
  const [v4Data, setV4Data] = useState({
    summary: null,
    roads: null,
    settlements: null,
    healthcare: null,
    bridges: null,
    power: null
  });

  useEffect(() => {
    if (selectedRun === 'v4_extended') {
      const fetchJson = async (url) => {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
      };
      
      Promise.all([
        fetchJson('/api/exports/exposure_summary?run_id=v4_extended&format=geojson'),
        fetchJson('/api/exports/exposed_roads?run_id=v4_extended&format=geojson'),
        fetchJson('/api/exports/exposed_settlements?run_id=v4_extended&format=geojson'),
        fetchJson('/api/exports/exposed_healthcare?run_id=v4_extended&format=geojson'),
        fetchJson('/api/exports/exposed_bridges?run_id=v4_extended&format=geojson'),
        fetchJson('/api/exports/exposed_power?run_id=v4_extended&format=geojson')
      ]).then(([sum, roads, setts, health, br, pow]) => {
        setV4Data({
          summary: sum,
          roads: roads,
          settlements: setts,
          healthcare: health,
          bridges: br,
          power: pow
        });
      });
    }
  }, [selectedRun]);
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({});

  // Init Map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, { center: [30.15, 78.35], zoom: 11, zoomControl: false });
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

    const data = selectedRun === 'v4_extended' ? v4Data : {
      roads: v3.v3Roads,
      settlements: v3.v3Context?.settlements,
      healthcare: v3.v3Context?.healthcare,
      bridges: v3.v3Context?.bridges,
      power: v3.v3Context?.power
    };

    if (isVisible('roads') && data.roads) {
       layersRef.current.roads = L.geoJSON(data.roads, { 
         style: (f) => ({ 
           color: f.properties.exposure_status === 'OUTSIDE CURRENT MODELLED HAZARD' ? '#16A34A' : '#EA580C', 
           weight: 3 
         }) 
       }).addTo(map);
    }
    if (isVisible('settlements') && data.settlements) {
       layersRef.current.settlements = L.geoJSON(data.settlements, { 
         pointToLayer: (f, ll) => L.circleMarker(ll, { 
           radius: 4, 
           fillColor: f.properties.exposure_status === 'OUTSIDE CURRENT MODELLED HAZARD' ? '#16A34A' : '#DC2626', 
           color: '#fff', 
           weight: 1 
         }) 
       }).addTo(map);
    }
  }, [v3, v4Data, activeFilter, selectedRun]);

  const currentSummary = selectedRun === 'v4_extended' 
    ? v4Data.summary?.exposure_counts 
    : v3.v3Summary?.exposure_counts;

  const roadEdges = selectedRun === 'v4_extended' ? (currentSummary?.road_segments_intersected || 0) : (v3.v3Roads?.features?.length || 0);
  const roadKm = selectedRun === 'v4_extended' ? (currentSummary?.road_km_intersected || 0) : 38.788;
  const setts = currentSummary?.settlements_intersected || 0;
  const health = currentSummary?.healthcare_intersected || 0;
  const br = currentSummary?.bridges_intersected || 0;

  return (
    <div className="flex flex-col h-full bg-slate-50">
       <div className="px-8 py-4 bg-white border-b border-slate-200 shrink-0 flex justify-between items-center">
         <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-red-600" /> Exposure Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedRun === 'v4_extended' ? 'TEHRI V4 — CORRECTED 3600S MODEL RUN' : 'TEHRI V3 — VERIFIED BENCHMARK'}
          </p>
         </div>
         <div>
            <select className="border border-slate-300 rounded px-3 py-1 text-sm font-semibold" value={selectedRun} onChange={e => setSelectedRun(e.target.value)}>
               <option value="v3_benchmark">TEHRI V3 (800s)</option>
               <option value="v4_extended">TEHRI V4 (3600s)</option>
            </select>
         </div>
       </div>

       {/* Summary Cards */}
       <div className="px-8 py-4 shrink-0 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { id: 'ALL', label: 'Overview', exp: '-', inv: '-' },
            { id: 'settlements', label: 'Settlements', exp: `${setts} exposed`, inv: '1,049 inventoried' },
            { id: 'healthcare', label: 'Healthcare', exp: `${health} exposed`, inv: 'inventoried' },
            { id: 'bridges', label: 'Bridges', exp: `${br} exposed`, inv: '534 inventoried' },
            { id: 'roads', label: 'Roads', exp: `${roadKm} km exposed`, inv: `${roadEdges} edges unavailable` }
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
                         <tr>
                            <th className="px-4 py-2 font-semibold text-slate-600 text-xs">Edge ID</th>
                            <th className="px-4 py-2 font-semibold text-slate-600 text-xs">Arrival (s)</th>
                            <th className="px-4 py-2 font-semibold text-slate-600 text-xs">Status</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {(selectedRun === 'v4_extended' ? v4Data.roads?.features : v3.v3Roads?.features)?.filter(f => f.properties.max_depth_m >= 0.05).slice(0, 50).map(f => (
                           <tr key={f.properties.osmid || Math.random()} className="hover:bg-slate-50 cursor-pointer">
                              <td className="px-4 py-3 font-mono text-[10px] text-slate-600">{f.properties.osmid || f.properties.u}</td>
                              <td className="px-4 py-3 font-mono text-slate-800 font-bold">{Math.round(f.properties.arrival_time_hr * 3600)}</td>
                              <td className="px-4 py-3"><span className="text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-1 rounded">Intersected</span></td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                ) : (
                   <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                      <ShieldAlert className="w-8 h-8 mb-3 opacity-20" />
                      <p className="text-sm font-medium text-slate-600 mb-1">Select Roads Filter</p>
                      <p className="text-xs">No {activeFilter === 'ALL' ? 'critical assets' : activeFilter} intersect the modelled hazard window.</p>
                   </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}
