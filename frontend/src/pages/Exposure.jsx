import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Filter } from 'lucide-react';
import L from 'leaflet';
import { useRun } from '../context/RunContext';
import { useV3Data } from '../hooks/useV3Data';
import ExportMenu from '../components/ExportMenu';

export default function Exposure() {
  const { currentRun, selectedRunId } = useRun();
  const v3 = useV3Data();
  const [activeFilter, setActiveFilter] = useState('ALL');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({});

  // Init Map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [30.15, 78.35],
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

  // Sync Layers based on active filter and current run
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    ['roads', 'settlements', 'healthcare', 'bridges', 'power'].forEach((k) => {
      if (layersRef.current[k]) {
        map.removeLayer(layersRef.current[k]);
        layersRef.current[k] = null;
      }
    });

    const isVisible = (k) => activeFilter === 'ALL' || activeFilter === k;

    // Roads
    if (isVisible('roads') && v3.v3Roads) {
      layersRef.current.roads = L.geoJSON(v3.v3Roads, {
        style: { color: '#ea580c', weight: 3, opacity: 0.85 },
      }).addTo(map);
    }

    // Settlements
    if (isVisible('settlements') && v3.v3Context?.settlements) {
      layersRef.current.settlements = L.geoJSON(v3.v3Context.settlements, {
        pointToLayer: (f, latlng) =>
          L.circleMarker(latlng, { radius: 4, fillColor: '#64748b', fillOpacity: 0.8, color: '#fff', weight: 1 }),
      }).addTo(map);
    }

    // Healthcare
    if (isVisible('healthcare') && v3.v3Context?.healthcare) {
      layersRef.current.healthcare = L.geoJSON(v3.v3Context.healthcare, {
        pointToLayer: (f, latlng) =>
          L.circleMarker(latlng, { radius: 5, fillColor: '#ef4444', fillOpacity: 0.9, color: '#fff', weight: 1 }),
      }).addTo(map);
    }

    // Bridges
    if (isVisible('bridges') && v3.v3Context?.bridges) {
      layersRef.current.bridges = L.geoJSON(v3.v3Context.bridges, {
        pointToLayer: (f, latlng) =>
          L.circleMarker(latlng, { radius: 4, fillColor: '#eab308', fillOpacity: 0.9, color: '#fff', weight: 1 }),
      }).addTo(map);
    }

    // Power
    if (isVisible('power') && v3.v3Context?.power) {
      layersRef.current.power = L.geoJSON(v3.v3Context.power, {
        pointToLayer: (f, latlng) =>
          L.circleMarker(latlng, { radius: 4, fillColor: '#a855f7', fillOpacity: 0.9, color: '#fff', weight: 1 }),
      }).addTo(map);
    }
  }, [v3, activeFilter, selectedRunId]);

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-hidden">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 select-none shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Exposure &amp; Vulnerability Assessment
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {currentRun.shortName}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Intersection of OpenStreetMap critical infrastructure against verified hydrodynamic wetted domain.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <ExportMenu
            products={[
              'exposed_roads',
              'exposed_settlements',
              'exposed_healthcare',
              'exposed_bridges',
              'exposed_power',
              'exposure_summary',
            ]}
          />
        </div>
      </div>

      {/* Zero Exposure Semantics Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">CRITICAL EXPOSURE PROVENANCE: </span>
          <span>
            Zero settlements or healthcare intersected indicates{' '}
            <strong>NO INTERSECTION WITH CURRENT MODELLED HAZARD EXTENT</strong>. Assets located downstream are{' '}
            <strong>NOT CLASSIFIED AS SAFE BEYOND CURRENT WINDOW</strong> ({currentRun.simulation_window_s}s, {currentRun.domain_km} km domain reach).
          </span>
        </div>
      </div>

      {/* Main Content: Map + Asset Tables */}
      <div className="flex-1 flex min-h-0">
        {/* Left Interactive Map */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-100">
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700">Filter Asset Layer:</span>
              <div className="inline-flex rounded border border-slate-200 p-0.5 bg-slate-50">
                {['ALL', 'roads', 'settlements', 'healthcare', 'bridges', 'power'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      activeFilter === f
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Domain: {currentRun.domain_km} km &middot; {currentRun.simulation_window_s}s
            </span>
          </div>
          <div className="flex-1 relative" ref={mapContainerRef} />
        </div>

        {/* Right Asset Statistics Sidebar */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto text-xs">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Verified Asset Exposure
            </h2>
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg border border-orange-200 bg-orange-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-900">Road Infrastructure</span>
                  <span className="font-mono font-bold text-base text-orange-700">
                    {currentRun.road_exposed_km} km
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-orange-800">
                  <span>Wetted Segments:</span>
                  <span className="font-mono font-bold">{currentRun.road_segments_intersected}</span>
                </div>
                {currentRun.earliest_road_exposure_s !== null && (
                  <div className="flex justify-between text-[10px] text-orange-700 pt-1 border-t border-orange-200/60">
                    <span>Earliest Inundation Arrival:</span>
                    <span className="font-mono font-bold">T+{currentRun.earliest_road_exposure_s} s</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2 text-[11px]">
                <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                  Other Downstream Critical Assets
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Settlements Intersected:</span>
                  <span className="font-mono font-bold text-slate-800">
                    0 <span className="text-[9px] text-slate-400 font-sans font-normal">(in wetted reach)</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Healthcare Facilities:</span>
                  <span className="font-mono font-bold text-slate-800">
                    0 <span className="text-[9px] text-slate-400 font-sans font-normal">(in wetted reach)</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Bridges Intersected:</span>
                  <span className="font-mono font-bold text-slate-800">
                    0 <span className="text-[9px] text-slate-400 font-sans font-normal">(in wetted reach)</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Power Facilities:</span>
                  <span className="font-mono font-bold text-slate-800">
                    0 <span className="text-[9px] text-slate-400 font-sans font-normal">(in wetted reach)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Depth &amp; Arrival Classes
            </h2>
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 text-[11px]">
              <div className="font-bold text-slate-700">Road Depth Distribution:</div>
              <div className="space-y-1 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">&gt; 5.0 m deep:</span>
                  <span className="font-bold text-red-600">
                    {selectedRunId === 'v4_extended' ? '73 segments' : '52 segments'}
                  </span>
                </div>
                {selectedRunId === 'v4_extended' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">0.5 – 1.5 m deep:</span>
                    <span className="font-bold text-amber-600">1 segment</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 space-y-1">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[9px]">
                Scientific Provenance
              </div>
              <p>
                Spatial intersection calculated via GIS overlay of OpenStreetMap features against LISFLOOD-FP 8.1 inundation footprint.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
