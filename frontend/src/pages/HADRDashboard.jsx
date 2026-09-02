import React, { useEffect, useRef } from 'react';
import {
  Info,
  Layers,
  Navigation,
} from 'lucide-react';
import L from 'leaflet';
import { useRun } from '../context/RunContext';
import ExportMenu from '../components/ExportMenu';

const HADR_DESTINATIONS = [
  { name: 'Prototype HADR Origin', lat: 30.360, lon: 78.470, isOrigin: true },
  { name: 'Laxman Jhula Govt Hospital (Linear Nearest)', lat: 30.125, lon: 78.330 },
  { name: "Dr. Arora's Clinic (Reachable in V3)", lat: 30.150, lon: 78.320 },
];

export default function HADRDashboard() {
  const { currentRun, selectedRunId } = useRun();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const domainLayerRef = useRef(null);
  const normalRouteRef = useRef(null);
  const hazardRouteRef = useRef(null);
  const extentLayerRef = useRef(null);

  const isV4 = selectedRunId === 'v4_extended';

  // Init Map
  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      maxBounds: [
        [29.5, 77.8],
        [31.0, 79.2],
      ],
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '&copy; Esri, Maxar', maxZoom: 18 }
    ).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Origin and Hospital Markers
    HADR_DESTINATIONS.forEach((d) => {
      const isOrig = d.isOrigin;
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${
          isOrig ? '#0284c7' : '#991b1b'
        };color:#fff;border:1px solid ${
          isOrig ? '#38bdf8' : '#ef4444'
        };border-radius:2px;padding:2px 6px;font-size:9px;font-family:monospace;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.6)">${
          d.name
        }</div>`,
        iconSize: [160, 18],
        iconAnchor: [80, 9],
      });
      L.marker([d.lat, d.lon], { icon }).addTo(map);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Layers on run change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Fit camera
    if (currentRun.domain_bounds) {
      map.fitBounds(currentRun.domain_bounds, { padding: [30, 30] });
    }

    // Model Domain
    if (domainLayerRef.current) {
      map.removeLayer(domainLayerRef.current);
      domainLayerRef.current = null;
    }
    if (currentRun.domain_bounds) {
      const b = currentRun.domain_bounds;
      domainLayerRef.current = L.polygon(
        [
          [b[0][0], b[0][1]],
          [b[0][0], b[1][1]],
          [b[1][0], b[1][1]],
          [b[1][0], b[0][1]],
        ],
        { color: '#38bdf8', weight: 1.5, fill: false, dashArray: '6, 6' }
      ).addTo(map);
    }

    // Inundation Extent
    if (extentLayerRef.current) {
      map.removeLayer(extentLayerRef.current);
      extentLayerRef.current = null;
    }
    if (currentRun.inundation_geojson_url) {
      fetch(currentRun.inundation_geojson_url)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && mapInstanceRef.current) {
            extentLayerRef.current = L.geoJSON(data, {
              style: { color: '#38bdf8', weight: 1, fillColor: '#0284c7', fillOpacity: 0.35 },
            }).addTo(mapInstanceRef.current);
          }
        })
        .catch(() => {});
    }

    // Normal Route
    if (normalRouteRef.current) {
      map.removeLayer(normalRouteRef.current);
      normalRouteRef.current = null;
    }
    const normalUrl = isV4
      ? '/api/runs/v4_extended/exports/normal_route?format=geojson'
      : '/api/scenarios/v3/hadr/route/normal';

    fetch(normalUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((geoJson) => {
        if (geoJson && mapInstanceRef.current) {
          normalRouteRef.current = L.geoJSON(geoJson, {
            style: { color: '#ef4444', weight: 3.5, dashArray: '6, 6' },
          }).addTo(mapInstanceRef.current);
        }
      })
      .catch(() => {});

    // Hazard Aware Route (V3 only)
    if (hazardRouteRef.current) {
      map.removeLayer(hazardRouteRef.current);
      hazardRouteRef.current = null;
    }
    if (!isV4) {
      fetch('/api/scenarios/v3/hadr/route/hazard_aware')
        .then((res) => (res.ok ? res.json() : null))
        .then((geoJson) => {
          if (geoJson && mapInstanceRef.current) {
            hazardRouteRef.current = L.geoJSON(geoJson, {
              style: { color: '#10b981', weight: 4.5 },
            }).addTo(mapInstanceRef.current);
          }
        })
        .catch(() => {});
    }
  }, [selectedRunId, isV4]);

  return (
    <div className="h-full w-full flex bg-[#0B0F19] text-slate-100 overflow-hidden select-none">
      {/* Center Operational Routing Map (70% width) */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative border-r border-slate-800">
        {/* Subheader Bar */}
        <div className="h-9 bg-[#111827] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-sky-400 font-bold font-sans flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              HADR EVACUATION ROUTING CONSOLE
            </span>
            <span className="text-slate-600">{'//'}</span>
            <span className="text-slate-300">
              ALGORITHM: <strong className="text-white">DIJKSTRA GRAPH WEIGHTING</strong>
            </span>
            <span className="text-slate-600">{'//'}</span>
            <span className="text-slate-300">
              HAZARD CONFLICTS: <strong className="text-red-400">{currentRun.normal_route_hazard_edges} EDGES</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ExportMenu products={['normal_route', 'hazard_aware_route']} />
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative" ref={mapContainerRef}>
          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded p-2.5 text-[10px] font-mono space-y-1 shadow-xl">
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Routing Symbology</div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-red-500" />
              <span>Normal Route (Crosses {currentRun.normal_route_hazard_edges} Inundated Edges)</span>
            </div>
            {!isV4 && (
              <div className="flex items-center gap-2 text-slate-200">
                <span className="w-4 h-1 bg-emerald-500" />
                <span>Hazard-Aware Route (143.93 km &middot; Feasible)</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3 h-3 rounded-xs bg-sky-500/40 border border-sky-400" />
              <span>Active Modelled Inundation</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-4 h-0.5 border-t border-dashed border-sky-400" />
              <span>Model Domain Boundary</span>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="h-10 bg-[#0F172A] border-t border-slate-800 px-4 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[10px]">CURRENT CORRIDOR:</span>
            <span className="font-bold text-white">Bhagirathi Gorge to Rishikesh (145 km total network)</span>
          </div>
          <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
            AREAS BEYOND MODEL EXTENT ARE NOT CLASSIFIED AS SAFE
          </span>
        </div>
      </div>

      {/* Right Mission Inspector (30% width, 360px) */}
      <div className="w-[360px] bg-[#111827] flex flex-col h-full overflow-y-auto shrink-0 text-xs">
        <div className="h-9 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0F172A]">
          <span className="font-bold text-slate-200 tracking-wider uppercase text-[11px] flex items-center gap-1.5 font-sans">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Tactical Route Analysis
          </span>
          <span className="status-tag status-tag--data">
            {isV4 ? 'V4 EXTENDED' : 'V3 BENCHMARK'}
          </span>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* Normal Shortest Route */}
          <div className="border border-red-900/60 rounded bg-red-950/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-400 uppercase tracking-wider text-[10px]">
                Normal Shortest Path
              </span>
              <span className="status-tag status-tag--alert">NOT FEASIBLE</span>
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">Distance</span>
                <span className="telemetry-row__value">{currentRun.normal_route_dist_km} km</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Hazard Conflict Edges</span>
                <span className="telemetry-row__value text-red-400 font-bold">
                  {currentRun.normal_route_hazard_edges} segments wetted
                </span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Tactical State</span>
                <span className="telemetry-row__value text-red-300">Direct road blocked by flood front</span>
              </div>
            </div>
          </div>

          {/* Hazard-Aware Route */}
          <div
            className={`border rounded p-3 space-y-2 ${
              isV4 ? 'border-amber-900/60 bg-amber-950/20' : 'border-emerald-900/60 bg-emerald-950/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-bold uppercase tracking-wider text-[10px] ${isV4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                Hazard-Aware Bypass
              </span>
              <span className={`status-tag ${isV4 ? 'status-tag--warning' : 'status-tag--verified'}`}>
                {isV4 ? 'UNFEASIBLE' : 'FEASIBLE'}
              </span>
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">Distance</span>
                <span className="telemetry-row__value">
                  {currentRun.hazard_aware_route_dist_km !== null
                    ? `${currentRun.hazard_aware_route_dist_km} km`
                    : '— (No Passable Path)'}
                </span>
              </div>
              {!isV4 && (
                <div className="telemetry-row">
                  <span className="telemetry-row__label">Detour Penalty</span>
                  <span className="telemetry-row__value text-orange-400">
                    +{currentRun.hazard_aware_detour_km} km
                  </span>
                </div>
              )}
              <div className="telemetry-row">
                <span className="telemetry-row__label">Status</span>
                <span className={`telemetry-row__value ${isV4 ? 'text-amber-300' : 'text-emerald-400'}`}>
                  {currentRun.hazard_aware_route_status}
                </span>
              </div>
            </div>
            {isV4 && (
              <p className="text-[10px] text-amber-400/90 leading-snug pt-1">
                Under extended 3600s flood extent, downstream valley road network is inundated. No passable detour exists within the current mountain valley corridor without traversing hazard water.
              </p>
            )}
          </div>

          {/* Destination Reachability Analysis */}
          <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Destination Reachability
            </div>
            <div className="space-y-2 text-[11px]">
              <div>
                <span className="text-slate-500 text-[10px] block">Linear Nearest Facility:</span>
                <span className="font-bold text-slate-200">Laxman Jhula Government Hospital</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800">
                <span className="text-slate-500 text-[10px] block">Reachable (Avoiding Hazard):</span>
                <span className="font-bold text-sky-400">
                  {isV4 ? 'None in valley corridor' : "Dr. Arora's Clinic"}
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-[10px] text-sky-300/80 pt-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Nearest &ne; Reachable. Assessed strictly against wetted road network.</span>
              </div>
            </div>
          </div>

          {/* Mission Disclaimer */}
          <div className="border border-slate-800 rounded bg-slate-900/60 p-3 space-y-1 text-[10px] text-slate-400">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[9px] block">
              Origin Provenance Note
            </span>
            <p>
              Mission Origin is a designated research benchmark coordinate. It is not an operational NDRF facility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
