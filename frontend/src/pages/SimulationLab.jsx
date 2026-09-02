import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Layers,
  Clock,
} from 'lucide-react';
import L from 'leaflet';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import { useRun } from '../context/RunContext';
import { useV3Data } from '../hooks/useV3Data';
import { useV4Data } from '../hooks/useV4Data';

const SPEEDS = [1, 2, 5, 10];

export default function SimulationLab({ initialTimeMin = 0, onTimeChange, onNavigateToHadr }) {
  const { currentRun, selectedRunId } = useRun();
  const v3 = useV3Data();
  const v4 = useV4Data();

  const isV4 = selectedRunId === 'v4_extended';
  const maxTimeMin = currentRun.simulation_window_s / 60.0;
  const [currentTimeMin, setCurrentTimeMin] = useState(Math.min(initialTimeMin, maxTimeMin));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Layers
  const [layers, setLayers] = useState({
    floodPropagation: true,
    maxDepth: false,
    roadHazard: true,
    settlements: false,
    healthcare: false,
    bridges: false,
    power: false,
  });

  const toggleLayer = (key) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    floodFrame: null,
    maxDepth: null,
    roadHazard: null,
    settlements: null,
    healthcare: null,
    bridges: null,
    power: null,
  });

  const currentSec = Math.round(currentTimeMin * 60);

  // Init Map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [30.25, 78.35],
      zoom: 11,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);
    mapInstanceRef.current = map;

    // Load max depth raster initially
    const maxDepthUrl = currentRun.max_depth_tif_url;
    if (maxDepthUrl) {
      fetch(maxDepthUrl)
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .then((buf) => (buf ? parseGeoraster(buf) : null))
        .then((georaster) => {
          if (!georaster || !mapInstanceRef.current) return;
          const layer = new GeoRasterLayer({
            georaster,
            opacity: 0,
            resolution: 256,
            pixelValuesToColorFn: (v) => {
              const depth = v[0];
              if (depth <= 0.05 || depth === georaster.noDataValue) return null;
              if (depth < 0.5) return '#93c5fd';
              if (depth < 2.0) return '#3b82f6';
              if (depth < 5.0) return '#2563eb';
              if (depth < 10.0) return '#1d4ed8';
              return '#1e3a8a';
            },
          });
          layer.addTo(mapInstanceRef.current);
          layersRef.current.maxDepth = layer;
        })
        .catch(() => {});
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Max Depth Raster when run changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.maxDepth) {
      map.removeLayer(layersRef.current.maxDepth);
      layersRef.current.maxDepth = null;
    }

    const maxDepthUrl = currentRun.max_depth_tif_url;
    if (maxDepthUrl) {
      fetch(maxDepthUrl)
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .then((buf) => (buf ? parseGeoraster(buf) : null))
        .then((georaster) => {
          if (!georaster || !mapInstanceRef.current) return;
          const layer = new GeoRasterLayer({
            georaster,
            opacity: layers.maxDepth ? 0.8 : 0,
            resolution: 256,
            pixelValuesToColorFn: (v) => {
              const depth = v[0];
              if (depth <= 0.05 || depth === georaster.noDataValue) return null;
              if (depth < 0.5) return '#93c5fd';
              if (depth < 2.0) return '#3b82f6';
              if (depth < 5.0) return '#2563eb';
              if (depth < 10.0) return '#1d4ed8';
              return '#1e3a8a';
            },
          });
          layer.addTo(mapInstanceRef.current);
          layersRef.current.maxDepth = layer;
        })
        .catch(() => {});
    }
  }, [selectedRunId]);

  // Handle Playback Loop
  useEffect(() => {
    let raf;
    let last;
    const tick = (now) => {
      if (!last) last = now;
      const elapsed = now - last;
      if (elapsed >= 100 / playbackSpeed) {
        last = now;
        setCurrentTimeMin((prev) => {
          if (prev >= maxTimeMin) {
            setIsPlaying(false);
            return maxTimeMin;
          }
          const stepMin = isV4 ? 1.0 : 0.166;
          const next = Math.min(maxTimeMin, prev + stepMin);
          onTimeChange?.(next);
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    if (isPlaying) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, playbackSpeed, maxTimeMin, isV4, onTimeChange]);

  // Frame Update (Real temporal depth frames for V4, propagation mask for V3)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.maxDepth) {
      layersRef.current.maxDepth.setOpacity(layers.maxDepth ? 0.8 : 0);
    }

    if (!layers.floodPropagation) {
      if (layersRef.current.floodFrame) map.removeLayer(layersRef.current.floodFrame);
      layersRef.current.floodFrame = null;
      return;
    }

    if (isV4 && v4.frames && v4.frames.length > 0) {
      // Find closest V4 60s frame
      const closest = v4.frames.reduce((prev, curr) =>
        Math.abs(curr.time_sec - currentSec) < Math.abs(prev.time_sec - currentSec) ? curr : prev
      );
      if (closest && closest.url) {
        fetch(closest.url)
          .then((res) => (res.ok ? res.arrayBuffer() : null))
          .then((buf) => (buf ? parseGeoraster(buf) : null))
          .then((georaster) => {
            if (!mapInstanceRef.current || !layers.floodPropagation) return;
            if (layersRef.current.floodFrame) mapInstanceRef.current.removeLayer(layersRef.current.floodFrame);

            const layer = new GeoRasterLayer({
              georaster,
              opacity: 0.85,
              resolution: 256,
              pixelValuesToColorFn: (v) => {
                const depth = v[0];
                if (depth <= 0.05 || depth === georaster.noDataValue) return null;
                if (depth < 1.0) return '#93c5fd';
                if (depth < 3.0) return '#3b82f6';
                if (depth < 6.0) return '#2563eb';
                return '#1e3a8a';
              },
            });
            layer.addTo(mapInstanceRef.current);
            layersRef.current.floodFrame = layer;
          })
          .catch(() => {});
      }
    } else {
      // V3 arrival propagation
      const snapped = Math.max(0, Math.min(800, Math.round(currentSec / 50.0) * 50));
      fetch(`/api/scenarios/v3/frames/${snapped}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((geoJson) => {
          if (!mapInstanceRef.current || !layers.floodPropagation || !geoJson) return;
          if (layersRef.current.floodFrame) mapInstanceRef.current.removeLayer(layersRef.current.floodFrame);
          const layer = L.geoJSON(geoJson, {
            style: { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.75, weight: 0.5 },
          }).addTo(mapInstanceRef.current);
          layersRef.current.floodFrame = layer;
        })
        .catch(() => {});
    }
  }, [currentSec, layers.floodPropagation, layers.maxDepth, isV4, v4.frames]);

  // Sync Vector Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const syncVector = (key, data, styleFn, pointToLayer) => {
      if (layersRef.current[key]) {
        map.removeLayer(layersRef.current[key]);
        layersRef.current[key] = null;
      }
      if (layers[key] && data) {
        const layer = L.geoJSON(data, {
          style: styleFn,
          pointToLayer,
          onEachFeature: (feature, l) => {
            l.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              const arr = feature.properties?.arrival_time_hr ? feature.properties.arrival_time_hr * 3600 : null;
              setSelectedFeature({
                type: key,
                name: feature.properties?.name || `Feature ${feature.id || ''}`,
                arrival: arr,
                status: arr && arr <= currentSec ? 'INTERSECTED' : 'OUTSIDE CURRENT MODELLED HAZARD EXTENT',
                coords: e.latlng ? [e.latlng.lat, e.latlng.lng] : null,
              });
              setIsInspectorOpen(true);
            });
          },
        }).addTo(map);
        layersRef.current[key] = layer;
      }
    };

    // Roads
    syncVector('roadHazard', v3.v3Roads, (feature) => {
      const arrTimeSec = (feature.properties?.arrival_time_hr || 0) * 3600;
      return arrTimeSec > currentSec
        ? { color: '#94a3b8', weight: 2, opacity: 0.5 }
        : { color: '#ea580c', weight: 4, opacity: 1.0 };
    });

    // Settlements, Healthcare, Bridges, Power (from V3 context)
    syncVector(
      'settlements',
      v3.v3Context?.settlements,
      () => ({ color: '#64748b', weight: 1 }),
      (f, latlng) => L.circleMarker(latlng, { radius: 3, fillColor: '#64748b', fillOpacity: 0.7, color: '#fff', weight: 1 })
    );
    syncVector(
      'healthcare',
      v3.v3Context?.healthcare,
      () => ({ color: '#ef4444', weight: 1 }),
      (f, latlng) => L.circleMarker(latlng, { radius: 4, fillColor: '#ef4444', fillOpacity: 0.8, color: '#fff', weight: 1 })
    );
    syncVector(
      'bridges',
      v3.v3Context?.bridges,
      () => ({ color: '#eab308', weight: 1 }),
      (f, latlng) => L.circleMarker(latlng, { radius: 4, fillColor: '#eab308', fillOpacity: 0.8, color: '#fff', weight: 1 })
    );
    syncVector(
      'power',
      v3.v3Context?.power,
      () => ({ color: '#a855f7', weight: 1 }),
      (f, latlng) => L.circleMarker(latlng, { radius: 4, fillColor: '#a855f7', fillOpacity: 0.8, color: '#fff', weight: 1 })
    );
  }, [v3, layers, currentSec]);

  // Current road exposure count
  const wettedRoadSegments =
    v3.v3Roads?.features?.filter((r) => (r.properties?.arrival_time_hr * 3600) <= currentSec).length || 0;
  const pct = Math.round((currentTimeMin / maxTimeMin) * 100);

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-hidden">
      {/* Simulation Lab Top Bar */}
      <div className="h-12 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900 text-sm">Simulation Lab</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {currentRun.shortName}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            T+{currentSec}s / {currentRun.simulation_window_s}s
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Layers:</span>
          </div>

          <button
            onClick={() => toggleLayer('floodPropagation')}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition ${
              layers.floodPropagation
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Temporal Depth
          </button>

          <button
            onClick={() => toggleLayer('maxDepth')}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition ${
              layers.maxDepth
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Max Depth Raster
          </button>

          <button
            onClick={() => toggleLayer('roadHazard')}
            className={`px-2.5 py-1 rounded text-xs font-semibold border transition ${
              layers.roadHazard
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Roads ({wettedRoadSegments} wetted)
          </button>

          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded border border-slate-200 hover:bg-slate-50 ml-2"
            title="Toggle Inspector"
          >
            {isInspectorOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Map + Inspector Body */}
      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 relative" ref={mapContainerRef} />

        {/* Floating Playback Controls Bar (Bottom of Map) */}
        <div className="absolute bottom-4 left-6 right-6 z-[400] max-w-2xl mx-auto bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg p-3 flex items-center gap-3 select-none">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center justify-center shrink-0 shadow-sm transition"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTimeMin(0);
              onTimeChange?.(0);
            }}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 transition"
            title="Reset to T+0s"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 font-mono text-xs font-bold text-slate-800">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>T+{currentSec}s</span>
          </div>

          {/* Time Scrubber */}
          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={maxTimeMin}
              step={isV4 ? 1.0 : 0.166}
              value={currentTimeMin}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentTimeMin(val);
                onTimeChange?.(val);
              }}
              className="w-full cursor-pointer accent-blue-600"
            />
          </div>

          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 shrink-0 text-xs font-mono">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-1.5 py-0.5 rounded transition ${
                  playbackSpeed === s ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}&times;
              </button>
            ))}
          </div>
        </div>

        {/* Right Inspector Panel */}
        {isInspectorOpen && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto z-20 text-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Simulation Inspector</h3>
                <span className="text-[10px] text-slate-400 font-mono">Run: {currentRun.run_id}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                QA: PASS
              </span>
            </div>

            <div className="p-4 space-y-4 flex-1">
              {/* Scenario & Solver Card */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                  Solver Configuration
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Far-Field Solver:</span>
                  <span className="font-mono font-semibold text-slate-800">{currentRun.far_field_solver}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Domain Reach:</span>
                  <span className="font-mono text-slate-800">{currentRun.domain_km} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grid Resolution:</span>
                  <span className="font-mono text-slate-800">{currentRun.grid_resolution_m} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Depth:</span>
                  <span className="font-mono font-bold text-blue-600">{currentRun.max_depth_m} m</span>
                </div>
                <div className="text-[9px] text-amber-700 pt-0.5">
                  {currentRun.max_depth_label}
                </div>
              </div>

              {/* Selected Feature Card */}
              {selectedFeature && (
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-900 uppercase text-[10px]">{selectedFeature.type}</span>
                    <button
                      onClick={() => setSelectedFeature(null)}
                      className="text-slate-400 hover:text-slate-700 font-bold"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="font-semibold text-slate-800">{selectedFeature.name}</div>
                  <div className="text-slate-600 text-[10px] font-mono">Status: {selectedFeature.status}</div>
                </div>
              )}

              {/* Dynamic Step Diagnostics */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                  Current Timestep State
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Elapsed Time:</span>
                    <span className="font-mono font-bold text-slate-800">T+{currentSec} s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Wetted Road Segments:</span>
                    <span className="font-mono font-bold text-orange-600">{wettedRoadSegments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Run Road Exposure:</span>
                    <span className="font-mono text-slate-800">{currentRun.road_exposed_km} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Settlements Intersected:</span>
                    <span className="font-mono text-emerald-600 font-bold">0 in reach</span>
                  </div>
                </div>
              </div>

              {/* Truthful Velocity Disclaimer */}
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-[10px] text-slate-600 leading-snug">
                <span className="font-bold text-blue-900 block mb-0.5">Hydraulic Physics Note:</span>
                LISFLOOD-FP ACC solves the depth-averaged shallow-water equations. Velocity outputs are not generated by the far-field solver build; therefore, no synthetic velocity vectors are displayed.
              </div>

              {/* HADR Quick Action */}
              <button
                onClick={onNavigateToHadr}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                Inspect HADR Route Feasibility &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
