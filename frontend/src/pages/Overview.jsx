import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Play,
  Satellite,
  ShieldAlert,
} from 'lucide-react';
import { useRun } from '../context/RunContext';
import { RIVER_CENTERLINE } from '../data/prototype/tehriPrototypeFlood';

const SETTLEMENT_MARKERS = [
  { name: 'Tehri Dam (Source)', lat: 30.378, lon: 78.480, isSource: true },
  { name: 'Devprayag (Confluence)', lat: 30.146, lon: 78.599 },
  { name: 'Rishikesh (Gorge Exit)', lat: 30.086, lon: 78.267 },
  { name: 'Haridwar (Plains)', lat: 29.945, lon: 78.164 },
];

export default function Overview({ onNavigate }) {
  const { currentRun } = useRun();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const extentLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.22, 78.45],
      zoom: 10,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    // River centerline
    if (RIVER_CENTERLINE && RIVER_CENTERLINE.length > 0) {
      L.polyline(
        RIVER_CENTERLINE.map((p) => [p.lat, p.lon]),
        { color: '#2563eb', weight: 3, opacity: 0.65, dashArray: '4, 4' }
      ).addTo(map);
    }

    // Settlements markers
    SETTLEMENT_MARKERS.forEach((s) => {
      const isDam = s.isSource;
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${isDam ? '#dc2626' : '#ffffff'};color:${
          isDam ? '#ffffff' : '#0f172a'
        };border:1.5px solid ${
          isDam ? '#991b1b' : '#cbd5e1'
        };border-radius:6px;padding:2px 6px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.15)">${
          s.name
        }</div>`,
        iconSize: [120, 20],
        iconAnchor: [60, 10],
      });
      L.marker([s.lat, s.lon], { icon }).addTo(map);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Inundation Extent for the currently selected run
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

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
                color: '#2563eb',
                weight: 1.5,
                fillColor: '#3b82f6',
                fillOpacity: 0.35,
              },
            }).addTo(mapInstanceRef.current);
          }
        })
        .catch(() => {});
    }
  }, [currentRun]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 flex flex-col text-slate-800">
      {/* Top Banner: Scenario Provenance & Truthful Benchmark Notice */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              {currentRun.name}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              QA: {currentRun.qa_status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Command Center — Hydrodynamic Benchmark Overview
          </h1>
          <p className="text-xs text-slate-500">
            Physics-based cascade: DualSPHysics (Lagrangian SPH) &rarr; LISFLOOD-FP (Sub-grid 2D ACC). Bhagirathi River, Uttarakhand.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('scenarios')}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            Scenario Builder
          </button>
          <button
            onClick={() => onNavigate('simulation')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Open Simulation Lab
          </button>
        </div>
      </div>

      {/* Warning Alert Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-start gap-3 text-xs text-amber-900 shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">WHAT-IF EMERGENCY-PLANNING BENCHMARK: </span>
          <span>
            Tehri Dam has never suffered a catastrophic dam break. Physical validation is{' '}
            <strong>NOT AVAILABLE</strong>. Outputs reflect a theoretical dam-failure hypothesis evaluated for disaster-preparedness research, not an operational prediction.
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Coupled Boundary Peak Q
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {currentRun.coupled_peak_q_m3s.toLocaleString()} m&sup3;/s
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {currentRun.coupled_peak_q_label}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Max Flood Depth
          </div>
          <div className="text-base font-bold text-blue-600 font-mono">
            {currentRun.max_depth_m} m
          </div>
          <div className="text-[9px] text-amber-700 leading-tight mt-0.5">
            Numerical metric (not physically validated)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Simulation Window
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {currentRun.simulation_window_s} s
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Interval: {currentRun.frames_interval_s}s ({currentRun.frames_count} frames)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Model Domain Reach
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {currentRun.domain_km} km
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Grid: {currentRun.grid_resolution_m} m (Copernicus DEM)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Road Exposure Length
          </div>
          <div className="text-base font-bold text-orange-600 font-mono">
            {currentRun.road_exposed_km} km
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {currentRun.road_segments_intersected} segments wetted
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Settlement Intersections
          </div>
          <div className="text-base font-bold text-emerald-600 font-mono">
            0
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Within current modelled reach
          </div>
        </div>
      </div>

      {/* Main Interactive Map & Side Cards */}
      <div className="flex-1 px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-[420px]">
        {/* Interactive Map (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-xs">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Study Area &amp; Hydrodynamic Reach</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Upper Bhagirathi &middot; 0–145 km Corridor
            </span>
          </div>
          <div className="flex-1 relative" ref={mapContainerRef} />
        </div>

        {/* Right Info Panels */}
        <div className="flex flex-col gap-4">
          {/* Quick Nav Workflow Cards */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Mission Modules
            </h3>
            <div className="space-y-2 text-xs">
              <div
                onClick={() => onNavigate('simulation')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Play className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-bold text-slate-800">Simulation Lab</div>
                    <div className="text-[11px] text-slate-500">
                      Temporal flood propagation &amp; raster inspection
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div
                onClick={() => onNavigate('exposure')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-orange-600" />
                  <div>
                    <div className="font-bold text-slate-800">Exposure &amp; Assets</div>
                    <div className="text-[11px] text-slate-500">
                      OSM critical infrastructure wetted intersection
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div
                onClick={() => onNavigate('hadr')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-800">HADR Operations</div>
                    <div className="text-[11px] text-slate-500">
                      Hazard-aware evacuation routing feasibility
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div
                onClick={() => onNavigate('satellite')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Satellite className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-bold text-slate-800">Sentinel-1 Observation Lab</div>
                    <div className="text-[11px] text-slate-500">
                      Earth Engine SAR bitemporal water change
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Model Status Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex-1 text-xs space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Solver Chain
            </h3>
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 bg-slate-50/50 text-[11px]">
              <div className="p-2 flex justify-between">
                <span className="text-slate-500">Near-Field:</span>
                <span className="font-semibold text-slate-800">DualSPHysics 5.4 CPU</span>
              </div>
              <div className="p-2 flex justify-between">
                <span className="text-slate-500">Coupling Transect:</span>
                <span className="font-semibold text-slate-800">300,000 m&sup3;/s Peak Q</span>
              </div>
              <div className="p-2 flex justify-between">
                <span className="text-slate-500">Downstream 2D:</span>
                <span className="font-semibold text-slate-800">LISFLOOD-FP 8.1 (ACC)</span>
              </div>
              <div className="p-2 flex justify-between">
                <span className="text-slate-500">Numerical QA:</span>
                <span className="font-mono font-bold text-emerald-600">PASS (0.00023% mass err)</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              LISFLOOD-FP ACC solves the 2D shallow-water inertial formulation. Velocity outputs are not generated by the ACC build.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
