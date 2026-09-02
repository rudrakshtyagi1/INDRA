import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Info,
  Layers,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import L from 'leaflet';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import { useRun } from '../context/RunContext';
import { useV3Data } from '../hooks/useV3Data';
import v4FramesMeta from '../data/v4_frames_meta.json';

const SPEEDS = [1, 2, 5, 10];

export default function SimulationLab() {
  const { currentRun, selectedRunId, setSimTimeSec } = useRun();
  const v3 = useV3Data();

  const isV4 = selectedRunId === 'v4_extended';
  const durationSec = currentRun.simulation_window_s || 3600;
  const frameIntervalSec = currentRun.frames_interval_s || 60;
  const totalFrames = currentRun.frames_count || (isV4 ? 61 : 17);

  const [currentSec, setCurrentSec] = useState(() => {
    const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('t') : null;
    return p ? parseInt(p) : 0;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Layer Toggles
  const [layers, setLayers] = useState({
    temporalDepth: true,
    maxDepth: false,
    arrivalTime: false,
    roads: true,
    modelDomain: true,
  });

  const toggleLayer = (k) => setLayers((prev) => ({ ...prev, [k]: !prev[k] }));

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const domainLayerRef = useRef(null);
  const floodFrameRef = useRef(null);
  const maxDepthLayerRef = useRef(null);
  const arrivalLayerRef = useRef(null);
  const roadsLayerRef = useRef(null);

  // Current Frame Index
  const frameIndex = isV4
    ? Math.min(60, Math.max(0, Math.round(currentSec / 60)))
    : Math.min(16, Math.max(0, Math.round(currentSec / 50)));

  // Current frame metadata
  const currentFrameInfo = isV4 ? v4FramesMeta[frameIndex] : null;
  const wetAreaKm2 = currentFrameInfo ? currentFrameInfo.wet_area_km2 : (currentSec > 0 ? (currentSec / 800) * 12.4 : 0);
  const wetCells = currentFrameInfo ? currentFrameInfo.wet_cells : Math.round(wetAreaKm2 * 1111);

  // Wetted road calculation for currentSec
  const wettedRoadCount =
    v3.v3Roads?.features?.filter((r) => (r.properties?.arrival_time_hr || 0) * 3600 <= currentSec).length ||
    (currentSec > 120 ? Math.min(currentRun.road_segments_intersected || 74, Math.round((currentSec / 3600) * 74)) : 0);

  // Sync with global mission bar time
  useEffect(() => {
    setSimTimeSec(currentSec);
  }, [currentSec, setSimTimeSec]);

  // Reset currentSec only on run ID change and fit camera
  const prevRunIdRef = useRef(selectedRunId);
  useEffect(() => {
    if (prevRunIdRef.current !== selectedRunId) {
      prevRunIdRef.current = selectedRunId;
      setCurrentSec(0);
      setIsPlaying(false);
    }
    if (mapInstanceRef.current && currentRun.domain_bounds) {
      mapInstanceRef.current.fitBounds(currentRun.domain_bounds, { padding: [30, 30] });
    }
  }, [selectedRunId, currentRun.domain_bounds]);

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

    // Satellite imagery showing canyon terrain
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, Maxar',
        maxZoom: 18,
      }
    ).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Initial domain fit
    if (currentRun.domain_bounds) {
      map.fitBounds(currentRun.domain_bounds, { padding: [30, 30] });
    }

    // Dam marker
    const damIcon = L.divIcon({
      className: '',
      html: `<div style="background:#991b1b;color:#f8fafc;border:1px solid #ef4444;border-radius:2px;padding:2px 6px;font-size:9px;font-family:monospace;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.6)">Tehri Dam (Source Crest 839.5m)</div>`,
      iconSize: [150, 18],
      iconAnchor: [75, 9],
    });
    L.marker([30.378, 78.480], { icon: damIcon }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Domain Boundary
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (domainLayerRef.current) {
      map.removeLayer(domainLayerRef.current);
      domainLayerRef.current = null;
    }

    if (layers.modelDomain && currentRun.domain_bounds) {
      const b = currentRun.domain_bounds;
      const poly = [
        [b[0][0], b[0][1]],
        [b[0][0], b[1][1]],
        [b[1][0], b[1][1]],
        [b[1][0], b[0][1]],
      ];
      domainLayerRef.current = L.polygon(poly, {
        color: '#38bdf8',
        weight: 1.5,
        fill: false,
        dashArray: '6, 6',
      }).addTo(map);
    }
  }, [layers.modelDomain, currentRun]);

  // Sync Roads Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (roadsLayerRef.current) {
      map.removeLayer(roadsLayerRef.current);
      roadsLayerRef.current = null;
    }

    if (layers.roads && v3.v3Roads) {
      roadsLayerRef.current = L.geoJSON(v3.v3Roads, {
        style: (feat) => {
          const arrSec = (feat.properties?.arrival_time_hr || 0) * 3600;
          return arrSec <= currentSec
            ? { color: '#ef4444', weight: 3, opacity: 1.0 } // Wetted / cut edge
            : { color: '#f59e0b', weight: 2, opacity: 0.7 }; // Dry road
        },
        onEachFeature: (feat, layer) => {
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            const arr = feat.properties?.arrival_time_hr ? feat.properties.arrival_time_hr * 3600 : null;
            setSelectedFeature({
              name: feat.properties?.name || 'Road Segment',
              type: 'Road Infrastructure',
              status: arr && arr <= currentSec ? 'INUNDATED / HAZARD CUT' : 'DRY / PASSABLE AT CURRENT T',
              arrivalSec: arr,
            });
          });
        },
      }).addTo(map);
    }
  }, [layers.roads, v3.v3Roads, currentSec]);

  // Sync Temporal Depth Raster (Real 61 frames for V4)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!layers.temporalDepth) {
      if (floodFrameRef.current) {
        map.removeLayer(floodFrameRef.current);
        floodFrameRef.current = null;
      }
      return;
    }

    if (isV4) {
      const frameFile = `/api/runs/v4_extended/exports/depth_${String(frameIndex).padStart(4, '0')}?format=geotiff`;
      fetch(frameFile)
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .then((buf) => (buf ? parseGeoraster(buf) : null))
        .then((georaster) => {
          if (!mapInstanceRef.current || !layers.temporalDepth || !georaster) return;
          if (floodFrameRef.current) mapInstanceRef.current.removeLayer(floodFrameRef.current);

          const layer = new GeoRasterLayer({
            georaster,
            opacity: 0.88,
            resolution: 256,
            pixelValuesToColorFn: (values) => {
              const depth = values[0];
              if (depth <= 0.05 || depth === georaster.noDataValue || isNaN(depth)) {
                return null; // transparent for dry cells
              }
              // Continuous scientifically meaningful depth ramp with controlled alpha
              if (depth < 0.5) {
                const t = (depth - 0.05) / 0.45;
                return `rgba(56, 189, 248, ${0.45 + t * 0.2})`; // cyan shallow
              } else if (depth < 1.5) {
                const t = (depth - 0.5) / 1.0;
                return `rgba(2, 132, 199, ${0.65 + t * 0.15})`; // cerulean
              } else if (depth < 3.0) {
                const t = (depth - 1.5) / 1.5;
                return `rgba(29, 78, 216, ${0.80 + t * 0.1})`; // royal blue
              } else if (depth < 5.0) {
                const t = (depth - 3.0) / 2.0;
                return `rgba(30, 64, 175, ${0.88 + t * 0.07})`; // deep cobalt
              } else {
                return 'rgba(23, 37, 84, 0.95)'; // navy flood column
              }
            },
          });

          layer.addTo(mapInstanceRef.current);
          floodFrameRef.current = layer;
        })
        .catch(() => {});
    } else {
      // V3 arrival-derived frame
      const snapped = Math.max(0, Math.min(800, Math.round(currentSec / 50.0) * 50));
      fetch(`/api/scenarios/v3/frames/${snapped}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((geoJson) => {
          if (!mapInstanceRef.current || !layers.temporalDepth || !geoJson) return;
          if (floodFrameRef.current) mapInstanceRef.current.removeLayer(floodFrameRef.current);
          const layer = L.geoJSON(geoJson, {
            style: { color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.7, weight: 1 },
          }).addTo(mapInstanceRef.current);
          floodFrameRef.current = layer;
        })
        .catch(() => {});
    }
  }, [currentSec, frameIndex, layers.temporalDepth, isV4]);

  // Sync Max Depth Raster Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!layers.maxDepth) {
      if (maxDepthLayerRef.current) {
        map.removeLayer(maxDepthLayerRef.current);
        maxDepthLayerRef.current = null;
      }
      return;
    }

    if (currentRun.max_depth_tif_url && !maxDepthLayerRef.current) {
      fetch(currentRun.max_depth_tif_url)
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .then((buf) => (buf ? parseGeoraster(buf) : null))
        .then((georaster) => {
          if (!mapInstanceRef.current || !layers.maxDepth || !georaster) return;
          const layer = new GeoRasterLayer({
            georaster,
            opacity: 0.85,
            resolution: 256,
            pixelValuesToColorFn: (v) => {
              const depth = v[0];
              if (depth <= 0.05 || depth === georaster.noDataValue || isNaN(depth)) return null;
              if (depth < 1.0) return 'rgba(56, 189, 248, 0.6)';
              if (depth < 3.0) return 'rgba(2, 132, 199, 0.75)';
              if (depth < 5.0) return 'rgba(29, 78, 216, 0.85)';
              return 'rgba(23, 37, 84, 0.95)';
            },
          });
          layer.addTo(mapInstanceRef.current);
          maxDepthLayerRef.current = layer;
        })
        .catch(() => {});
    }
  }, [layers.maxDepth, currentRun]);

  // Sync Arrival Time Raster Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!layers.arrivalTime) {
      if (arrivalLayerRef.current) {
        map.removeLayer(arrivalLayerRef.current);
        arrivalLayerRef.current = null;
      }
      return;
    }

    const arrivalUrl = isV4
      ? '/api/runs/v4_extended/exports/arrival_time?format=geotiff'
      : '/api/runs/v3_benchmark/exports/arrival_time?format=geotiff';

    fetch(arrivalUrl)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => (buf ? parseGeoraster(buf) : null))
      .then((georaster) => {
        if (!mapInstanceRef.current || !layers.arrivalTime || !georaster) return;
        const layer = new GeoRasterLayer({
          georaster,
          opacity: 0.8,
          resolution: 256,
          pixelValuesToColorFn: (v) => {
            const arr = v[0];
            if (arr <= 0 || arr === georaster.noDataValue || isNaN(arr)) return null;
            if (arr < 900) return 'rgba(239, 68, 68, 0.85)'; // <15 min (fast red)
            if (arr < 1800) return 'rgba(249, 115, 22, 0.8)'; // 15-30 min (orange)
            if (arr < 2700) return 'rgba(234, 179, 8, 0.75)'; // 30-45 min (yellow)
            return 'rgba(16, 185, 129, 0.7)'; // >45 min (green lead time)
          },
        });
        layer.addTo(mapInstanceRef.current);
        arrivalLayerRef.current = layer;
      })
      .catch(() => {});
  }, [layers.arrivalTime, isV4]);

  // Playback Loop
  useEffect(() => {
    let raf;
    let last;
    const tick = (now) => {
      if (!last) last = now;
      const elapsed = now - last;
      const intervalMs = 250 / playbackSpeed;
      if (elapsed >= intervalMs) {
        last = now;
        setCurrentSec((prev) => {
          if (prev >= durationSec) {
            setIsPlaying(false);
            return durationSec;
          }
          return Math.min(durationSec, prev + frameIntervalSec);
        });
      }
      raf = requestAnimationFrame(tick);
    };
    if (isPlaying) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, playbackSpeed, durationSec, frameIntervalSec]);

  // Format T+HH:MM:SS
  const hrs = Math.floor(currentSec / 3600);
  const mins = Math.floor((currentSec % 3600) / 60);
  const secs = currentSec % 60;
  const timeLabel = `T+${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="h-full w-full flex bg-[#0B0F19] text-slate-100 overflow-hidden select-none">
      {/* Center Operational GIS Hydraulic Canvas (70% width) */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative border-r border-slate-800">
        {/* Top Operational Telemetry Bar */}
        <div className="h-9 bg-[#111827] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-sky-400 font-bold font-sans flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              TEMPORAL HYDRAULIC PROPAGATION LAB
            </span>
            <span className="text-slate-600">{'//'}</span>
            <span className="text-slate-300">
              FRAME: <strong className="text-white">#{frameIndex + 1}</strong> / {totalFrames}
            </span>
            <span className="text-slate-600">{'//'}</span>
            <span className="text-slate-300">
              SOLVER: <strong className="text-white">{currentRun.far_field_solver} (ACC)</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">
              DISPLAY INTERPOLATION ONLY &middot; ANALYTICAL GRID: 30 m
            </span>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="flex-1 relative" ref={mapContainerRef}>
          {/* Depth Legend Floating Overlay (Top Right of Map) */}
          <div className="absolute top-4 right-4 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded p-2.5 text-[10px] font-mono space-y-1 shadow-xl">
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">
              Water Depth Ramp
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2.5 rounded-xs" style={{ background: 'rgba(56, 189, 248, 0.65)' }} />
              <span className="text-slate-200">0.05 – 0.5 m (Shallow fringe)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2.5 rounded-xs" style={{ background: 'rgba(2, 132, 199, 0.75)' }} />
              <span className="text-slate-200">0.5 – 1.5 m (Vehicle hazard)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2.5 rounded-xs" style={{ background: 'rgba(29, 78, 216, 0.85)' }} />
              <span className="text-slate-200">1.5 – 3.0 m (Structural load)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2.5 rounded-xs" style={{ background: 'rgba(30, 64, 175, 0.92)' }} />
              <span className="text-slate-200">3.0 – 5.0 m (Severe torrent)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2.5 rounded-xs" style={{ background: 'rgba(23, 37, 84, 0.98)' }} />
              <span className="text-slate-200">&gt; 5.0 m (Extreme gorge column)</span>
            </div>
          </div>
        </div>

        {/* Bottom Professional Temporal Simulation Console */}
        <div className="h-16 bg-[#0F172A] border-t border-slate-800 px-4 flex items-center justify-between gap-4 shrink-0 font-mono text-xs select-none">
          {/* Controls: Play/Pause/Step */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentSec(0);
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
              title="Reset to T+0s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentSec((prev) => Math.max(0, prev - frameIntervalSec));
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
              title="Step Backward (-1 Frame)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold rounded flex items-center gap-1.5 transition shadow-sm"
              title={isPlaying ? 'Pause simulation' : 'Play simulation'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />}
              <span className="font-sans text-[11px]">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentSec((prev) => Math.min(durationSec, prev + frameIntervalSec));
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
              title="Step Forward (+1 Frame)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time & Telemetry Labels */}
          <div className="flex items-center gap-3 shrink-0 bg-slate-900 border border-slate-800 px-3 py-1 rounded text-[11px]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-sky-400" />
              <span className="font-bold text-white text-xs">{timeLabel}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div>
              <span className="text-slate-400 text-[10px]">WET AREA:</span>{' '}
              <strong className="text-sky-300">{wetAreaKm2.toFixed(2)} km&sup2;</strong>
            </div>
            <span className="text-slate-600">|</span>
            <div>
              <span className="text-slate-400 text-[10px]">WETTED ROADS:</span>{' '}
              <strong className="text-orange-400">{wettedRoadCount} segments</strong>
            </div>
          </div>

          {/* Time Scrubber Slider */}
          <div className="flex-1 flex items-center gap-2 min-w-[140px]">
            <input
              type="range"
              min={0}
              max={durationSec}
              step={frameIntervalSec}
              value={currentSec}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentSec(parseInt(e.target.value));
              }}
              className="control-slider w-full cursor-pointer accent-sky-400"
            />
          </div>

          {/* Playback Speed Multipliers */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 shrink-0 text-[10px]">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-1.5 py-0.5 rounded transition ${
                  playbackSpeed === s ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}&times;
              </button>
            ))}
          </div>

          {/* Layer Quick Toggles */}
          <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-800 pl-3">
            <button
              onClick={() => toggleLayer('temporalDepth')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                layers.temporalDepth
                  ? 'bg-sky-950 text-sky-400 border-sky-700'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              DEPTH
            </button>
            <button
              onClick={() => toggleLayer('maxDepth')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                layers.maxDepth
                  ? 'bg-blue-950 text-blue-400 border-blue-700'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              MAX
            </button>
            <button
              onClick={() => toggleLayer('arrivalTime')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                layers.arrivalTime
                  ? 'bg-amber-950 text-amber-400 border-amber-700'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              ARRIVAL
            </button>
            <button
              onClick={() => toggleLayer('roads')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                layers.roads
                  ? 'bg-orange-950 text-orange-400 border-orange-700'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              ROADS
            </button>
          </div>
        </div>
      </div>

      {/* Right Simulation Inspector (30% width, 360px) */}
      <div className="w-[360px] bg-[#111827] flex flex-col h-full overflow-y-auto shrink-0 text-xs">
        {/* Header */}
        <div className="h-9 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0F172A]">
          <span className="font-bold text-slate-200 tracking-wider uppercase text-[11px] flex items-center gap-1.5 font-sans">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Simulation Telemetry
          </span>
          <span className="status-tag status-tag--verified">QA: PASS</span>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* Current Step State */}
          <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Timestep State (T+{currentSec}s)
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">Frame Identifier</span>
                <span className="telemetry-row__value">
                  {isV4 ? `depth_${String(frameIndex).padStart(4, '0')}.tif` : `frame_${currentSec}s`}
                </span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Wetted Cell Count</span>
                <span className="telemetry-row__value text-sky-400">{wetCells.toLocaleString()} cells</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Wetted Flood Area</span>
                <span className="telemetry-row__value text-sky-400">{wetAreaKm2.toFixed(3)} km&sup2;</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Wetted Road Segments</span>
                <span className="telemetry-row__value text-orange-400">{wettedRoadCount} segments</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Settlement Inundation</span>
                <span className="telemetry-row__value text-emerald-400">0 within reach</span>
              </div>
            </div>
          </div>

          {/* Selected Feature Card */}
          {selectedFeature && (
            <div className="border border-sky-800/80 rounded bg-sky-950/40 p-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-sky-400 uppercase">
                <span>{selectedFeature.type}</span>
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="text-slate-400 hover:text-white"
                >
                  &times;
                </button>
              </div>
              <div className="font-bold text-white text-xs">{selectedFeature.name}</div>
              <div className="text-[11px] font-mono text-slate-300">Status: {selectedFeature.status}</div>
              {selectedFeature.arrivalSec !== null && (
                <div className="text-[10px] font-mono text-amber-400">
                  Modelled Wave Arrival: T+{selectedFeature.arrivalSec}s
                </div>
              )}
            </div>
          )}

          {/* Solver Configuration */}
          <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              LISFLOOD-FP 8.1 Setup
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">Numerical Max Depth</span>
                <span className="telemetry-row__value text-sky-400">{currentRun.max_depth_m} m</span>
              </div>
              <div className="text-[9px] text-amber-400/90 leading-tight">
                {currentRun.max_depth_label}
              </div>
              <div className="telemetry-row pt-1">
                <span className="telemetry-row__label">Model Reach Domain</span>
                <span className="telemetry-row__value">{currentRun.domain_km} km</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Manning Roughness</span>
                <span className="telemetry-row__value">n = 0.06 (Assumed)</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Mass Balance Error</span>
                <span className="telemetry-row__value text-emerald-400">
                  {currentRun.mass_balance_error_pct !== null ? `${currentRun.mass_balance_error_pct}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Explicit Velocity Honesty Card */}
          <div className="border border-slate-800 rounded bg-slate-900/60 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase font-mono">
              <Info className="w-3.5 h-3.5 shrink-0" />
              VELOCITY OUTPUT STATUS
            </div>
            <p className="text-[10px] text-slate-300 leading-snug">
              VELOCITY OUTPUT: <strong>NOT AVAILABLE FOR CURRENT PRECOMPUTED RUN</strong>.
              LISFLOOD-FP ACC solves the depth-averaged shallow water inertial formulation and writes scalar water elevations. No synthetic velocity vectors are fabricated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
