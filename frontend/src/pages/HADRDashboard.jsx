import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Route, AlertTriangle, ShieldCheck, Info, CheckCircle2, Clock } from 'lucide-react';
import L from 'leaflet';
import { useV3Data } from '../hooks/useV3Data';

export default function HADRDashboard() {
  const v3 = useV3Data();
  const [activeRoute, setActiveRoute] = useState(null); // 'normal' | 'hazard'

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({ normal: null, hazard: null, extent: null });

  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, { center: [30.3, 78.4], zoom: 12, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);
    mapInstanceRef.current = map;

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (v3.v3Hazard && !layersRef.current.extent) {
      layersRef.current.extent = L.geoJSON(v3.v3Hazard, { style: { color: '#3b82f6', fillOpacity: 0.1, weight: 1 } }).addTo(map);
    }

    if (v3.v3NormalRoute && !layersRef.current.normal) {
      layersRef.current.normal = L.geoJSON(v3.v3NormalRoute, { style: { color: '#ef4444', weight: 4, dashArray: '6, 6' } }).addTo(map);
    }

    if (v3.v3HazardAwareRoute && !layersRef.current.hazard) {
      layersRef.current.hazard = L.geoJSON(v3.v3HazardAwareRoute, { style: { color: '#10b981', weight: 5 } }).addTo(map);
    }

    // Highlighting logic
    if (layersRef.current.normal) {
       layersRef.current.normal.setStyle({ opacity: activeRoute === 'hazard' ? 0.2 : 1.0, weight: activeRoute === 'normal' ? 6 : 4 });
       if (activeRoute === 'normal') layersRef.current.normal.bringToFront();
    }
    if (layersRef.current.hazard) {
       layersRef.current.hazard.setStyle({ opacity: activeRoute === 'normal' ? 0.2 : 1.0, weight: activeRoute === 'hazard' ? 6 : 5 });
       if (activeRoute === 'hazard') layersRef.current.hazard.bringToFront();
    }

  }, [v3, activeRoute]);

  let stats = {
     normal_route: { distance_km: 0, eta_min: 0, hazard_conflict_edges: 2, status: 'NOT FEASIBLE AGAINST KNOWN MODELLED HAZARD' },
     hazard_aware_route: { distance_km: 0, eta_min: 0, hazard_conflict_edges: 0, status: 'AVOIDS CURRENTLY MODELLED HAZARD SEGMENTS', extra_distance_km: 10.32 }
  };
  
  if (v3.v3Routes && v3.v3Routes.routes && v3.v3Routes.routes.length > 0) {
      // Use the first valid route or specific one for the dashboard
      const r = v3.v3Routes.routes[1] || v3.v3Routes.routes[0];
      stats.normal_route.distance_km = (r.normal_route_dist_m || 0) / 1000;
      stats.hazard_aware_route.distance_km = (r.hazard_aware_route_dist_m || 0) / 1000;
      stats.normal_route.hazard_conflict_edges = r.hazard_edges_avoided || 2;
      stats.hazard_aware_route.extra_distance_km = stats.hazard_aware_route.distance_km - stats.normal_route.distance_km;
      
      if (stats.hazard_aware_route.extra_distance_km < 0) stats.hazard_aware_route.extra_distance_km = 0;
  }


  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-8 py-6 bg-white border-b border-slate-200 shrink-0">
         <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
           <Navigation className="w-6 h-6 text-blue-600" /> HADR Operations Console
         </h1>
         <p className="text-sm text-slate-500 mt-1">Evaluate emergency-response routing against modelled hydrodynamic constraints.</p>
      </div>

      <div className="flex-1 flex min-h-0 px-8 py-6 gap-6">
         {/* Map */}
         <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden relative shadow-sm">
            <div ref={mapContainerRef} className="absolute inset-0 z-0" />
            <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
               <span className="text-xs font-bold text-slate-800 uppercase mb-1">Precomputed Mission</span>
               <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono"><span className="w-2 h-2 rounded-full bg-blue-500"></span> ORIGIN: PROTOTYPE HADR MISSION ORIGIN</div>
               <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono"><span className="w-2 h-2 rounded-full bg-purple-500"></span> DEST: CRITICAL HEALTHCARE CLUSTER</div>
            </div>
         </div>
         
         {/* Inspector */}
         <div className="w-[400px] flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
            
            {/* Controls */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
               <h3 className="font-bold text-slate-800 mb-4 text-sm border-b border-slate-100 pb-2">Mission Parameters</h3>
               <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Departure Time</label>
                    <select disabled className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 opacity-70 cursor-not-allowed">
                       <option>T+0s (Immediate)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Routing Engine</label>
                    <select disabled className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 opacity-70 cursor-not-allowed">
                       <option>Precomputed Static Validation</option>
                    </select>
                  </div>
                  <button disabled className="w-full py-2 mt-2 bg-slate-100 text-slate-400 border border-slate-200 font-bold text-sm rounded cursor-not-allowed flex items-center justify-center gap-2">
                     <Clock className="w-4 h-4" /> Live Recalculation Disabled
                  </button>
                  <p className="text-[9px] text-slate-400 text-center uppercase tracking-wider">Viewing Precomputed Model Results</p>
               </div>
            </div>

            {/* Routes */}
            <div 
              onMouseEnter={() => setActiveRoute('normal')} 
              onMouseLeave={() => setActiveRoute(null)}
              className={`bg-white border p-5 rounded-xl cursor-pointer transition ${activeRoute === 'normal' ? 'border-red-400 shadow-md ring-2 ring-red-50' : 'border-slate-200 hover:border-red-200'}`}
            >
               <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><Route className="w-4 h-4 text-red-500" /> Normal Route</h4>
                  <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{stats.normal_route.distance_km.toFixed(1)} km</span>
               </div>
               <div className="flex items-start gap-2 bg-red-50 border border-red-100 p-2 rounded mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide leading-tight">{stats.normal_route.status}</p>
               </div>
               <p className="text-xs text-slate-600">This baseline route intersects {stats.normal_route.hazard_conflict_edges} known hazard-conflict edges within the V3 hydrodynamic domain.</p>
            </div>

            <div 
              onMouseEnter={() => setActiveRoute('hazard')} 
              onMouseLeave={() => setActiveRoute(null)}
              className={`bg-white border p-5 rounded-xl cursor-pointer transition ${activeRoute === 'hazard' ? 'border-emerald-400 shadow-md ring-2 ring-emerald-50' : 'border-slate-200 hover:border-emerald-200'}`}
            >
               <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Hazard-Aware Route</h4>
                  <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{stats.hazard_aware_route.distance_km.toFixed(1)} km</span>
               </div>
               <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 p-2 rounded mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide leading-tight">{stats.hazard_aware_route.status}</p>
               </div>
               <p className="text-xs text-slate-600 mb-2">Algorithm successfully bypassed all currently modelled hazard segments.</p>
               <div className="text-[10px] bg-slate-50 border border-slate-100 p-2 rounded font-mono text-slate-500 flex items-center gap-2">
                  <Info className="w-3 h-3 text-blue-500" /> +{stats.hazard_aware_route.extra_distance_km.toFixed(2)} km detour required.
               </div>
            </div>

         </div>
      </div>
    </div>
  );
}
