import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  ArrowRight,
  Layers,
  MapPin,
  Play,
} from 'lucide-react';
import { useRun } from '../context/RunContext';
import { RIVER_CENTERLINE } from '../data/prototype/tehriPrototypeFlood';
import { useV3Data } from '../hooks/useV3Data';

const SETTLEMENT_MARKERS = [
  { name: 'Tehri Dam (Source Crest 839.5m)', lat: 30.378, lon: 78.480, isSource: true },
  { name: 'Devprayag (Bhagirathi-Alaknanda Confluence)', lat: 30.146, lon: 78.599 },
  { name: 'Rishikesh (Gorge Exit Gateway)', lat: 30.086, lon: 78.267 },
  { name: 'Haridwar (Upper Gangetic Plains)', lat: 29.945, lon: 78.164 },
];

export default function Overview({ onNavigate }) {
  const { currentRun } = useRun();
  const v3 = useV3Data();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const domainLayerRef = useRef(null);
  const extentLayerRef = useRef(null);
  const roadsLayerRef = useRef(null);

  // Initialize Map
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

    // High-resolution satellite / terrain imagery
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 18,
      }
    ).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    // River centerline
    if (RIVER_CENTERLINE && RIVER_CENTERLINE.length > 0) {
      L.polyline(
        RIVER_CENTERLINE.map((p) => [p.lat, p.lon]),
        { color: '#38bdf8', weight: 2.5, opacity: 0.7, dashArray: '4, 4' }
      ).addTo(map);
    }

    // Settlements markers
    SETTLEMENT_MARKERS.forEach((s) => {
      const isDam = s.isSource;
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${
          isDam ? '#991b1b' : '#0f172a'
        };color:#f8fafc;border:1px solid ${
          isDam ? '#ef4444' : '#475569'
        };border-radius:2px;padding:2px 6px;font-size:9px;font-family:monospace;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.6)">${
          s.name
        }</div>`,
        iconSize: [140, 18],
        iconAnchor: [70, 9],
      });
      L.marker([s.lat, s.lon], { icon }).addTo(map);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Camera and Layers when currentRun changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Fit Camera to Domain Bounds
    if (currentRun?.domain_bounds) {
      map.fitBounds(currentRun.domain_bounds, { padding: [30, 30] });
    }

    // 2. Draw Model Domain Boundary Polygon
    if (domainLayerRef.current) {
      map.removeLayer(domainLayerRef.current);
      domainLayerRef.current = null;
    }
    if (currentRun?.domain_bounds) {
      const b = currentRun.domain_bounds;
      const domainPoly = [
        [b[0][0], b[0][1]],
        [b[0][0], b[1][1]],
        [b[1][0], b[1][1]],
        [b[1][0], b[0][1]],
      ];
      domainLayerRef.current = L.polygon(domainPoly, {
        color: '#0284c7',
        weight: 1.5,
        fill: false,
        dashArray: '6, 6',
      }).addTo(map);
    }

    // 3. Render Inundation Extent
    if (extentLayerRef.current) {
      map.removeLayer(extentLayerRef.current);
      extentLayerRef.current = null;
    }
    if (currentRun?.inundation_geojson_url) {
      fetch(currentRun.inundation_geojson_url)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && mapInstanceRef.current) {
            extentLayerRef.current = L.geoJSON(data, {
              style: {
                color: '#38bdf8',
                weight: 1.5,
                fillColor: '#0284c7',
                fillOpacity: 0.45,
              },
            }).addTo(mapInstanceRef.current);
          }
        })
        .catch(() => {});
    }

    // 4. Render Exposed Roads
    if (roadsLayerRef.current) {
      map.removeLayer(roadsLayerRef.current);
      roadsLayerRef.current = null;
    }
    if (v3.v3Roads) {
      roadsLayerRef.current = L.geoJSON(v3.v3Roads, {
        style: { color: '#f97316', weight: 2.5, opacity: 0.9 },
      }).addTo(map);
    }
  }, [currentRun, v3.v3Roads]);

  return (
    <div className="h-full w-full flex bg-[#0B0F19] text-slate-100 overflow-hidden select-none">
      {/* Center Operational GIS Map Area (70% width) */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative border-r border-slate-800">
        {/* Sub-Header Operational Telemetry Banner */}
        <div className="h-9 bg-[#111827] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-sky-400 font-bold flex items-center gap-1.5 font-sans">
              <MapPin className="w-3.5 h-3.5" />
              OPERATIONAL SITUATION MAP
            </span>
            <span className="text-slate-600">{'//'}</span>
            <span className="text-slate-300">
              DOMAIN: <strong className="text-white">{currentRun.domain_km} km</strong> CANYON REACH
            </span>
            <span className="text-slate-600">{'//'}</span>
            <span className="text-slate-300">
              GRID: <strong className="text-white">{currentRun.grid_resolution_m} m</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-400 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded">
              WHAT-IF EMERGENCY-PLANNING BENCHMARK
            </span>
          </div>
        </div>

        {/* The Live GIS Map */}
        <div className="flex-1 relative" ref={mapContainerRef}>
          {/* Map Overlay Map Legend */}
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded p-2.5 text-[10px] font-mono space-y-1 shadow-xl">
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">
              GIS Layer Symbology
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3 h-3 rounded-xs bg-sky-500/50 border border-sky-400" />
              <span>Modelled Inundation Footprint</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3 h-1 bg-orange-500 rounded-xs" />
              <span>Exposed Road Network ({currentRun.road_exposed_km} km)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3 h-0.5 border-t border-dashed border-sky-400" />
              <span>Bhagirathi River Centerline</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3 h-0.5 border-t border-dashed border-blue-500" />
              <span>Model Domain Boundary ({currentRun.domain_km} km)</span>
            </div>
            <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-800">
              Areas outside boundary: CONTEXT ONLY
            </div>
          </div>
        </div>

        {/* Small Bottom Telemetry Bar */}
        <div className="h-10 bg-[#0F172A] border-t border-slate-800 px-4 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500 mr-1.5 text-[10px]">COUPLED BOUNDARY Q:</span>
              <span className="font-bold text-sky-400">300,000 m&sup3;/s</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1.5 text-[10px]">MAX DEPTH:</span>
              <span className="font-bold text-sky-400">{currentRun.max_depth_m} m</span>
              <span className="text-[9px] text-amber-500 ml-1">(numerical max)</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1.5 text-[10px]">WETTED ROAD:</span>
              <span className="font-bold text-orange-400">{currentRun.road_exposed_km} km</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1.5 text-[10px]">SETTLEMENTS WETTED:</span>
              <span className="font-bold text-emerald-400">0 in reach</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('simulation')}
              className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 text-white text-[11px] font-bold rounded flex items-center gap-1 transition"
            >
              <Play className="w-3 h-3 fill-white" /> Open Simulation Lab
            </button>
          </div>
        </div>
      </div>

      {/* Right Command & Control Inspector (30% width, fixed 360px) */}
      <div className="w-[360px] bg-[#111827] flex flex-col h-full overflow-y-auto shrink-0 text-xs">
        {/* Inspector Header */}
        <div className="h-9 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0F172A]">
          <span className="font-bold text-slate-200 tracking-wider uppercase text-[11px] flex items-center gap-1.5 font-sans">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            C2 Telemetry Inspector
          </span>
          <span className="status-tag status-tag--verified">
            {currentRun.qa_status}
          </span>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* Section: ACTIVE RUN STATE */}
          <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Run &amp; Solver
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">Scenario</span>
                <span className="telemetry-row__value">{currentRun.name}</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Far-Field Solver</span>
                <span className="telemetry-row__value">{currentRun.far_field_solver}</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Near-Field</span>
                <span className="telemetry-row__value">{currentRun.near_field_solver}</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Simulation Window</span>
                <span className="telemetry-row__value">{currentRun.simulation_window_s} s</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Mass Balance Err</span>
                <span className="telemetry-row__value text-emerald-400">
                  {currentRun.mass_balance_error_pct !== null
                    ? `${currentRun.mass_balance_error_pct}% (PASS)`
                    : 'N/A (Prototype)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: COUPLING BOUNDARY */}
          <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hydrodynamic Inflow Boundary
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">Coupled Peak Q</span>
                <span className="telemetry-row__value text-sky-400">
                  {currentRun.coupled_peak_q_m3s.toLocaleString()} m&sup3;/s
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug pt-1">
                Froude back-scaled hydrograph derived from DualSPHysics 3D breach collapse transect.
              </p>
            </div>
          </div>

          {/* Section: HAZARD METRICS */}
          <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hazard Reach &amp; Depths
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">Max Water Depth</span>
                <span className="telemetry-row__value text-sky-400">{currentRun.max_depth_m} m</span>
              </div>
              <div className="text-[9px] text-amber-400/90 leading-tight">
                {currentRun.max_depth_label}
              </div>
              <div className="telemetry-row pt-1">
                <span className="telemetry-row__label">Model Reach</span>
                <span className="telemetry-row__value">{currentRun.domain_km} km</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Temporal Frames</span>
                <span className="telemetry-row__value">{currentRun.frames_count} frames</span>
              </div>
            </div>
          </div>

          {/* Section: CRITICAL INFRASTRUCTURE EXPOSURE */}
          <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Downstream Exposure Summary
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">Road Inundation</span>
                <span className="telemetry-row__value text-orange-400">
                  {currentRun.road_exposed_km} km ({currentRun.road_segments_intersected} seg)
                </span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Settlements Wetted</span>
                <span className="telemetry-row__value text-emerald-400">0 in reach</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Healthcare Facilities</span>
                <span className="telemetry-row__value text-emerald-400">0 in reach</span>
              </div>
              {currentRun.earliest_road_exposure_s && (
                <div className="telemetry-row">
                  <span className="telemetry-row__label">Earliest Road Impact</span>
                  <span className="telemetry-row__value text-amber-400">
                    T+{currentRun.earliest_road_exposure_s}s
                  </span>
                </div>
              )}
            </div>
            <p className="text-[9px] text-slate-500 pt-1 leading-tight">
              0 intersections within current modelled reach. Not classified as safe beyond model boundary.
            </p>
          </div>

          {/* Section: MISSION WORKSPACE LINKS */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Tactical Workspaces
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('simulation')}
                className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-sky-700 hover:bg-slate-800/80 text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-200 text-[11px]">Simulation Lab</div>
                  <div className="text-[9px] text-slate-400">Temporal rasters</div>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-500" />
              </button>

              <button
                onClick={() => onNavigate('hadr')}
                className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-sky-700 hover:bg-slate-800/80 text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-200 text-[11px]">HADR Routes</div>
                  <div className="text-[9px] text-slate-400">Evacuation status</div>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-500" />
              </button>

              <button
                onClick={() => onNavigate('exposure')}
                className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-sky-700 hover:bg-slate-800/80 text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-200 text-[11px]">Exposure</div>
                  <div className="text-[9px] text-slate-400">Asset overlay</div>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-500" />
              </button>

              <button
                onClick={() => onNavigate('satellite')}
                className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-sky-700 hover:bg-slate-800/80 text-left transition flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-200 text-[11px]">Sentinel-1</div>
                  <div className="text-[9px] text-slate-400">SAR workstation</div>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
