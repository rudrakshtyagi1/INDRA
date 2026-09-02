import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Info, Navigation } from 'lucide-react';
import L from 'leaflet';
import { useRun } from '../context/RunContext';
import ExportMenu from '../components/ExportMenu';

export default function HADRDashboard() {
  const { currentRun, selectedRunId } = useRun();
  const [activeRoute, setActiveRoute] = useState(null); // 'normal', 'hazard', or null

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({});

  // Init Map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [30.2, 78.35],
      zoom: 11,
      zoomControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Route Layers based on selectedRun
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    ['normal', 'hazard'].forEach((k) => {
      if (layersRef.current[k]) {
        map.removeLayer(layersRef.current[k]);
        layersRef.current[k] = null;
      }
    });

    const isV4 = selectedRunId === 'v4_extended';

    // Normal Route URL
    const normalUrl = isV4
      ? '/api/runs/v4_extended/exports/normal_route?format=geojson'
      : '/api/scenarios/v3/hadr/route/normal';

    fetch(normalUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((geoJson) => {
        if (geoJson && mapInstanceRef.current) {
          layersRef.current.normal = L.geoJSON(geoJson, {
            style: { color: '#ef4444', weight: 4, dashArray: '6, 6' },
          }).addTo(mapInstanceRef.current);
        }
      })
      .catch(() => {});

    // Hazard Aware Route (only exists for V3 benchmark)
    if (!isV4) {
      fetch('/api/scenarios/v3/hadr/route/hazard_aware')
        .then((res) => (res.ok ? res.json() : null))
        .then((geoJson) => {
          if (geoJson && mapInstanceRef.current) {
            layersRef.current.hazard = L.geoJSON(geoJson, {
              style: { color: '#10b981', weight: 5 },
            }).addTo(mapInstanceRef.current);
          }
        })
        .catch(() => {});
    }
  }, [selectedRunId]);

  // Adjust route emphasis
  useEffect(() => {
    if (layersRef.current.normal) {
      layersRef.current.normal.setStyle({
        opacity: activeRoute === 'hazard' ? 0.25 : 1.0,
        weight: activeRoute === 'normal' ? 6 : 4,
      });
      if (activeRoute === 'normal') layersRef.current.normal.bringToFront();
    }
    if (layersRef.current.hazard) {
      layersRef.current.hazard.setStyle({
        opacity: activeRoute === 'normal' ? 0.25 : 1.0,
        weight: activeRoute === 'hazard' ? 6 : 5,
      });
      if (activeRoute === 'hazard') layersRef.current.hazard.bringToFront();
    }
  }, [activeRoute]);

  const isV4 = selectedRunId === 'v4_extended';

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-hidden">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 select-none shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              HADR Operations &amp; Evacuation Routing Console
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {currentRun.shortName}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Dijkstra-based network routing evaluating feasibility against modelled wetted road segments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <ExportMenu products={['normal_route', 'hazard_aware_route']} />
        </div>
      </div>

      {/* Warning Notice */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">TACTICAL ROUTING STATUS: </span>
          <span>
            {isV4
              ? 'Under extended V4 3600s flood extent, downstream valley road segments are inundated. No feasible hazard-free detour exists in the modelled domain corridor without breaching safety thresholds.'
              : 'Assessed against verified 800s benchmark window only. Full-route future hazard status beyond model window is UNKNOWN.'}
          </span>
        </div>
      </div>

      {/* Main Map + Side Panel */}
      <div className="flex-1 flex min-h-0">
        {/* Map */}
        <div className="flex-1 relative bg-slate-100">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />
          <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur px-3 py-2.5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1 text-xs">
            <span className="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-0.5">
              Mission Context
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>ORIGIN: Prototype HADR Origin</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>DESTINATION: Healthcare Cluster</span>
            </div>
          </div>
        </div>

        {/* Tactical Parameters & Route Comparison Drawer */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto text-xs">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Route Feasibility Assessment
            </h2>

            {/* Normal Shortest-Path Route Card */}
            <div
              onClick={() => setActiveRoute(activeRoute === 'normal' ? null : 'normal')}
              className={`p-3 rounded-lg border cursor-pointer transition ${
                activeRoute === 'normal'
                  ? 'border-red-500 bg-red-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Shortest Network Route
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                  NOT FEASIBLE
                </span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {currentRun.normal_route_dist_km} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hazard Conflict Edges:</span>
                  <span className="font-mono font-bold text-red-600">
                    {currentRun.normal_route_hazard_edges} wetted edges
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-red-600 font-medium mt-1.5 pt-1 border-t border-red-200/60">
                Direct route crosses actively inundated highway segments.
              </div>
            </div>

            {/* Hazard-Aware Route Card */}
            <div
              onClick={() => {
                if (!isV4) setActiveRoute(activeRoute === 'hazard' ? null : 'hazard');
              }}
              className={`p-3 rounded-lg border transition ${
                isV4
                  ? 'border-amber-200 bg-amber-50/40 opacity-90 cursor-default'
                  : activeRoute === 'hazard'
                  ? 'border-emerald-500 bg-emerald-50/50 cursor-pointer'
                  : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isV4 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  Hazard-Aware Alternate
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isV4 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isV4 ? 'UNFEASIBLE' : 'FEASIBLE'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {currentRun.hazard_aware_route_dist_km !== null
                      ? `${currentRun.hazard_aware_route_dist_km} km`
                      : '&mdash; (No Passable Path)'}
                  </span>
                </div>
                {!isV4 && (
                  <div className="flex justify-between">
                    <span>Detour Penalty:</span>
                    <span className="font-mono text-orange-600 font-semibold">
                      +{currentRun.hazard_aware_detour_km} km
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Feasibility Status:</span>
                  <span className={`font-semibold ${isV4 ? 'text-amber-800' : 'text-emerald-700'}`}>
                    {currentRun.hazard_aware_route_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Destination Analysis Card */}
          <div className="p-4 border-b border-slate-100 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Destination Reachability
            </h3>
            <div className="p-2.5 rounded bg-blue-50/60 border border-blue-100 space-y-1.5 text-[11px]">
              <div>
                <span className="text-slate-500 text-[10px] block">Nearest by Linear Distance:</span>
                <span className="font-semibold text-slate-800">Laxman Jhula Government Hospital</span>
              </div>
              <div className="pt-1 border-t border-blue-200/50">
                <span className="text-slate-500 text-[10px] block">Nearest Reachable (Avoiding Hazard):</span>
                <span className="font-semibold text-slate-800">
                  {isV4 ? 'None within current modelled reach' : "Dr. Arora's Clinic"}
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-[10px] text-blue-700 pt-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Nearest &ne; Reachable. Evaluated against active hydrodynamic hazard footprint only.</span>
              </div>
            </div>
          </div>

          {/* Mission Provenance */}
          <div className="p-4 flex-1 space-y-2 text-[10px] text-slate-500">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[9px] block">
              Origin Provenance Note
            </span>
            <p>
              Mission Origin is a designated research benchmark coordinate. It is not an operational NDRF battalion facility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
