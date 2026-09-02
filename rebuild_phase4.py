import os

hadr = """
import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Info, MapPin, Truck, AlertTriangle, Route } from 'lucide-react';
import L from 'leaflet';
import { useV3Data } from '../hooks/useV3Data';
import { createBasemapLayer } from '../utils/mapTiles';

export default function HADRDashboard() {
  const v3 = useV3Data();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    basemap: null,
    normalRoute: null,
    hazardRoute: null,
    origin: null,
    destination: null
  });

  const [activeRoute, setActiveRoute] = useState('both'); // 'normal' | 'hazard' | 'both'

  useEffect(() => {
    if (mapInstanceRef.current || !v3.v3NormalRoute || !v3.v3HazardAwareRoute) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.15, 78.49],
      zoom: 11,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);
    mapInstanceRef.current = map;

    // Origin Marker (Dehradun / Jolly Grant roughly)
    const originIcon = L.divIcon({
      className: '',
      html: `<div class="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-md"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    layersRef.current.origin = L.marker([30.189, 78.033], { icon: originIcon }).addTo(map)
      .bindTooltip('<div class="font-bold text-xs">PROTOTYPE HADR MISSION ORIGIN</div>', { direction: 'top', permanent: false });

    // Destination Marker (Tehri Dam roughly)
    const destIcon = L.divIcon({
      className: '',
      html: `<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    layersRef.current.destination = L.marker([30.378, 78.481], { icon: destIcon }).addTo(map)
      .bindTooltip('<div class="font-bold text-xs">MISSION DESTINATION (TEHRI DAM)</div>', { direction: 'top', permanent: false });

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [v3.v3NormalRoute, v3.v3HazardAwareRoute]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.normalRoute) map.removeLayer(layersRef.current.normalRoute);
    if (layersRef.current.hazardRoute) map.removeLayer(layersRef.current.hazardRoute);

    if ((activeRoute === 'both' || activeRoute === 'normal') && v3.v3NormalRoute) {
       layersRef.current.normalRoute = L.geoJSON(v3.v3NormalRoute, {
         style: { color: '#ef4444', weight: 4, opacity: 0.8, dashArray: '8, 8' }
       }).addTo(map);
    }
    
    if ((activeRoute === 'both' || activeRoute === 'hazard') && v3.v3HazardAwareRoute) {
       layersRef.current.hazardRoute = L.geoJSON(v3.v3HazardAwareRoute, {
         style: { color: '#10b981', weight: 5, opacity: 0.9 }
       }).addTo(map);
    }
    
    // Fit bounds if both exist
    if (v3.v3NormalRoute && layersRef.current.normalRoute) {
       map.fitBounds(layersRef.current.normalRoute.getBounds(), { padding: [50, 50] });
    }
  }, [v3.v3NormalRoute, v3.v3HazardAwareRoute, activeRoute]);


  if (!v3.v3Routes) return <div className="p-8">Loading V3 Data...</div>;

  return (
    <div className="flex w-full h-full relative bg-slate-50">
      
      {/* Left Panel */}
      <div className="w-[400px] h-full bg-white border-r border-slate-200 shadow-sm flex flex-col z-10">
        <div className="p-6 border-b border-slate-100">
           <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <ShieldAlert className="w-6 h-6 text-blue-600" />
             HADR Operations
           </h1>
           <p className="text-sm text-slate-500 mt-2">Time-aware hazard avoidance routing benchmark based on physical solver outputs.</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
           {/* Normal Route Card */}
           <div 
             onClick={() => setActiveRoute('normal')}
             className={`p-4 border rounded-xl cursor-pointer transition ${activeRoute === 'normal' || activeRoute === 'both' ? 'border-red-300 bg-red-50/30' : 'border-slate-200 hover:border-red-200'}`}
           >
             <div className="flex items-center gap-2 mb-3">
               <Route className="w-4 h-4 text-red-500" />
               <h3 className="font-bold text-slate-800">Normal Route (Fastest)</h3>
             </div>
             <div className="flex items-end justify-between mb-3">
               <span className="text-3xl font-light tracking-tight text-slate-900">133.61 <span className="text-sm text-slate-500 font-semibold">km</span></span>
               <span className="text-lg font-mono text-slate-700">~4.45h</span>
             </div>
             <div className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1.5 rounded uppercase flex items-center gap-2">
               <AlertTriangle className="w-3 h-3" />
               NOT FEASIBLE AGAINST KNOWN MODELLED HAZARD
             </div>
           </div>

           {/* Hazard-Aware Route Card */}
           <div 
             onClick={() => setActiveRoute('hazard')}
             className={`p-4 border rounded-xl cursor-pointer transition ${activeRoute === 'hazard' || activeRoute === 'both' ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 hover:border-emerald-200'}`}
           >
             <div className="flex items-center gap-2 mb-3">
               <Route className="w-4 h-4 text-emerald-500" />
               <h3 className="font-bold text-slate-800">Hazard-Aware Route</h3>
             </div>
             <div className="flex items-end justify-between mb-3">
               <span className="text-3xl font-light tracking-tight text-slate-900">143.93 <span className="text-sm text-slate-500 font-semibold">km</span></span>
               <span className="text-lg font-mono text-slate-700">~4.80h</span>
             </div>
             <div className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1.5 rounded uppercase flex items-center gap-2">
               <ShieldAlert className="w-3 h-3" />
               AVOIDS CURRENTLY MODELLED HAZARD SEGMENTS
             </div>
             <div className="mt-3 text-xs text-slate-500 font-medium">Penalty: +10.32 km</div>
           </div>

           <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800">
             <Info className="w-5 h-5 shrink-0" />
             <p className="text-[11px] font-semibold leading-tight">UNKNOWN BEYOND 800s MODEL WINDOW. This feasibility assessment strictly applies to the computed V3 domain.</p>
           </div>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50">
           <button onClick={() => setActiveRoute('both')} className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-sm font-bold text-slate-700 transition">View Both Routes</button>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      </div>

    </div>
  );
}
"""

with open("frontend/src/pages/HADRDashboard.jsx", "w") as f:
    f.write(hadr)

infrastructure = """
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
"""

with open("frontend/src/pages/Infrastructure.jsx", "w") as f:
    f.write(infrastructure)

