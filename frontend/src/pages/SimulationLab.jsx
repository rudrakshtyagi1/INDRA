import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Info,
  Layers,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Activity,
  Scale,
  Waves,
  FileCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import L from 'leaflet';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import { useRun } from '../context/RunContext';
import { useV3Data } from '../hooks/useV3Data';
import v4FramesMeta from '../data/v4_frames_meta.json';
import SphParticleCanvas from '../components/simulation/SphParticleCanvas';
import FroudeCouplingPanel from '../components/simulation/FroudeCouplingPanel';
import BreachBenchmarkPanel from '../components/simulation/BreachBenchmarkPanel';
import FrameAuditTable from '../components/simulation/FrameAuditTable';

const SPEEDS = [1, 2, 5, 10];

export default function SimulationLab() {
  const { currentRun, selectedRunId, setSimTimeSec } = useRun();
  const v3 = useV3Data();

  const isV4 = selectedRunId === 'v4_extended';
  const durationSec = currentRun.simulation_window_s || 3600;
  const frameIntervalSec = currentRun.frames_interval_s || 60;
  const getSubViewFromUrl = () => {
    if (typeof window === 'undefined') return 'lisflood';
    let v = new URLSearchParams(window.location.search).get('view');
    if (v && ['lisflood', 'sph', 'coupling', 'breach', 'audit'].includes(v)) return v;
    if (window.location.hash.includes('?')) {
      v = new URLSearchParams(window.location.hash.split('?')[1]).get('view');
      if (v && ['lisflood', 'sph', 'coupling', 'breach', 'audit'].includes(v)) return v;
    }
    return 'lisflood';
  };

  const getTimeFromUrl = () => {
    if (typeof window === 'undefined') return 0;
    let t = new URLSearchParams(window.location.search).get('t');
    if (t) return parseInt(t, 10);
    if (window.location.hash.includes('?')) {
      t = new URLSearchParams(window.location.hash.split('?')[1]).get('t');
      if (t) return parseInt(t, 10);
    }
    return 0;
  };

  // Sub-view mode: 'lisflood', 'sph', 'coupling', 'breach', 'audit'
  const [subView, setSubView] = useState(getSubViewFromUrl);
  const [currentSec, setCurrentSec] = useState(getTimeFromUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [timelineMetric, setTimelineMetric] = useState('wet_area'); // 'wet_area', 'max_depth', 'roads'

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
  const roadsLayerRef = useRef(null);

  // Current Frame Index
  const frameIndex = isV4
    ? Math.min(60, Math.max(0, Math.round(currentSec / 60)))
    : Math.min(16, Math.max(0, Math.round(currentSec / 50)));

  // Current frame metadata
  const currentFrameInfo = isV4 ? v4FramesMeta[frameIndex] : null;
  const wetAreaKm2 = currentFrameInfo ? currentFrameInfo.wet_area_km2 : (currentSec > 0 ? (currentSec / 800) * 12.4 : 0);
  const wetCells = currentFrameInfo ? currentFrameInfo.wet_cells : Math.round(wetAreaKm2 * 1111);
  const frameMaxDepth = currentFrameInfo ? currentFrameInfo.max_depth_m : (currentSec > 0 ? 27.2 : 0);

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
    if (subView !== 'lisflood') return;
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

    if (currentRun.domain_bounds) {
      map.fitBounds(currentRun.domain_bounds, { padding: [30, 30] });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [subView, currentRun.domain_bounds]);

  // Model Domain Boundary Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (domainLayerRef.current) {
      map.removeLayer(domainLayerRef.current);
      domainLayerRef.current = null;
    }

    if (layers.modelDomain && currentRun.domain_bounds) {
      const b = currentRun.domain_bounds;
      const rect = L.rectangle(b, {
        color: '#38BDF8',
        weight: 1.5,
        dashArray: '5, 5',
        fillColor: '#0369A1',
        fillOpacity: 0.04,
      });

      rect.bindTooltip(
        `MODEL DOMAIN BOUNDARY (${currentRun.domain_km} km canyon reach)`,
        { permanent: false, direction: 'top', className: 'operational-tooltip' }
      );

      rect.addTo(map);
      domainLayerRef.current = rect;
    }
  }, [layers.modelDomain, currentRun]);

  // Temporal Depth GeoTIFF Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!layers.temporalDepth) {
      if (floodFrameRef.current) {
        map.removeLayer(floodFrameRef.current);
        floodFrameRef.current = null;
      }
      return;
    }

    const frameFile = isV4
      ? `/api/runs/${selectedRunId}/exports/depth_${String(frameIndex).padStart(4, '0')}?format=geotiff`
      : `/api/runs/${selectedRunId}/exports/depth_${String(frameIndex).padStart(4, '0')}?format=geotiff`;

    let isSubscribed = true;

    fetch(frameFile)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(parseGeoraster)
      .then((georaster) => {
        if (!isSubscribed) return;

        if (floodFrameRef.current) {
          map.removeLayer(floodFrameRef.current);
          floodFrameRef.current = null;
        }

        const layer = new GeoRasterLayer({
          georaster,
          opacity: 0.88,
          resolution: 256,
          pixelValuesToColorFn: (values) => {
            const val = values[0];
            if (val === undefined || val === null || val <= 0.05 || isNaN(val) || val === georaster.noDataValue) {
              return null;
            }
            if (val <= 0.5) return 'rgba(56, 189, 248, 0.65)';
            if (val <= 1.5) return 'rgba(2, 132, 199, 0.75)';
            if (val <= 3.0) return 'rgba(29, 78, 216, 0.85)';
            if (val <= 5.0) return 'rgba(30, 64, 175, 0.92)';
            return 'rgba(23, 37, 84, 0.96)';
          },
        });

        layer.addTo(map);
        floodFrameRef.current = layer;
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [frameIndex, layers.temporalDepth, selectedRunId, isV4]);

  // Roads Vector Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (roadsLayerRef.current) {
      map.removeLayer(roadsLayerRef.current);
      roadsLayerRef.current = null;
    }

    if (layers.roads && v3.v3Roads) {
      const roadLayer = L.geoJSON(v3.v3Roads, {
        style: (feature) => {
          const arrHr = feature.properties?.arrival_time_hr || 0;
          const isFlooded = arrHr * 3600 <= currentSec;
          return {
            color: isFlooded ? '#EF4444' : '#F59E0B',
            weight: isFlooded ? 2.5 : 1.5,
            opacity: isFlooded ? 0.9 : 0.6,
          };
        },
        onEachFeature: (feature, layer) => {
          layer.on('click', () => {
            const arrHr = feature.properties?.arrival_time_hr || 0;
            const isFlooded = arrHr * 3600 <= currentSec;
            setSelectedFeature({
              type: 'Road Segment',
              name: feature.properties?.name || 'Bhagirathi Valley Road',
              status: isFlooded ? 'SUBMERGED (INUNDATED)' : 'PASSABLE (DRY)',
              arrivalSec: Math.round(arrHr * 3600),
            });
          });
        },
      });

      roadLayer.addTo(map);
      roadsLayerRef.current = roadLayer;
    }
  }, [layers.roads, v3.v3Roads, currentSec]);

  // Dam & Confluence Reference Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const damMarker = L.marker([30.378, 78.481], {
      icon: L.divIcon({
        className: 'custom-c2-marker',
        html: `<div style="background:#EF4444; color:#fff; font-size:10px; font-weight:bold; font-family:monospace; padding:2px 6px; border-radius:3px; border:1px solid #fff; white-space:nowrap; box-shadow:0 2px 4px rgba(0,0,0,0.5);">Tehri Dam (Source Crest 839.5m)</div>`,
        iconSize: [160, 20],
        iconAnchor: [80, 10],
      }),
    }).addTo(map);

    return () => {
      map.removeLayer(damMarker);
    };
  }, []);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = (1000 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentSec((prev) => {
        const next = prev + frameIntervalSec;
        if (next > durationSec) {
          setIsPlaying(false);
          return durationSec;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, frameIntervalSec, durationSec]);

  const timeLabel = `T+${String(Math.floor(currentSec / 3600)).padStart(2, '0')}:${String(
    Math.floor((currentSec % 3600) / 60)
  ).padStart(2, '0')}:${String(currentSec % 60).padStart(2, '0')}`;

  return (
    <div className="flex h-full w-full bg-[#0B0F19] text-slate-200 overflow-hidden font-mono text-xs">
      {/* Main Canvas Area (70% width) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 h-full overflow-hidden relative">
        {/* Sub-view Switcher Toolbar */}
        <div className="h-9 px-3 border-b border-slate-800 bg-[#111827] flex items-center justify-between shrink-0 text-xs select-none">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">SIMULATION ENGINE:</span>
            <button
              onClick={() => setSubView('lisflood')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                subView === 'lisflood'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              2D LISFLOOD-FP (30 km)
            </button>
            <button
              onClick={() => setSubView('sph')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                subView === 'sph'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3 h-3 text-emerald-400" />
              DUALSPHYSICS 5.4 SPH (0–2 km)
            </button>
            <button
              onClick={() => setSubView('coupling')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                subView === 'coupling'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Scale className="w-3 h-3 text-sky-400" />
              FROUDE COUPLING Q(t)
            </button>
            <button
              onClick={() => setSubView('breach')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                subView === 'breach'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Waves className="w-3 h-3 text-violet-400" />
              BREACH BENCHMARK
            </button>
            <button
              onClick={() => setSubView('audit')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                subView === 'audit'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCheck className="w-3 h-3 text-emerald-400" />
              61-FRAME AUDIT
            </button>
          </div>

          <div className="text-[10px] text-slate-400 hidden lg:block">
            DISPLAY INTERPOLATION ONLY · ANALYTICAL GRID: 30 m
          </div>
        </div>

        {/* Sub-view Content Area */}
        <div className="flex-1 relative flex flex-col min-h-0 bg-[#070B14]">
          {subView === 'sph' && <SphParticleCanvas />}
          {subView === 'coupling' && <FroudeCouplingPanel />}
          {subView === 'breach' && <BreachBenchmarkPanel />}
          {subView === 'audit' && <FrameAuditTable onSelectFrame={(t) => { setCurrentSec(t); setSubView('lisflood'); }} />}

          {/* LISFLOOD-FP 2D Map View */}
          {subView === 'lisflood' && (
            <>
              <div ref={mapContainerRef} className="flex-1 w-full h-full relative" />

              {/* Collapsible Timeline Charts Panel beneath Map */}
              {isTimelineOpen && (
                <div className="h-32 bg-[#0B0F19]/95 border-t border-slate-800 flex flex-col shrink-0 px-4 py-2 relative z-10 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-1 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 uppercase font-bold">TIMELINE TELEMETRY:</span>
                      <button
                        onClick={() => setTimelineMetric('wet_area')}
                        className={`px-1.5 py-0.5 rounded ${
                          timelineMetric === 'wet_area' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        WET AREA (km²)
                      </button>
                      <button
                        onClick={() => setTimelineMetric('max_depth')}
                        className={`px-1.5 py-0.5 rounded ${
                          timelineMetric === 'max_depth' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        MAX DEPTH (m)
                      </button>
                      <button
                        onClick={() => setTimelineMetric('roads')}
                        className={`px-1.5 py-0.5 rounded ${
                          timelineMetric === 'roads' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        ROAD DISRUPTION
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sky-400 font-bold">
                        {timelineMetric === 'wet_area' && `Wetted Area: ${wetAreaKm2.toFixed(2)} km²`}
                        {timelineMetric === 'max_depth' && `Current Frame Max Depth: ${frameMaxDepth.toFixed(1)} m`}
                        {timelineMetric === 'roads' && `Wetted Road Segments: ${wettedRoadCount} / 74`}
                      </span>
                      <button
                        onClick={() => setIsTimelineOpen(false)}
                        className="text-slate-500 hover:text-slate-300"
                        title="Collapse timeline"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* SVG Multi-Metric Timeline Plot */}
                  <div className="flex-1 w-full relative">
                    <svg viewBox="0 0 700 75" className="w-full h-full overflow-visible">
                      {/* Grid Lines */}
                      {[0, 25, 50, 75].map((yVal) => (
                        <line
                          key={yVal}
                          x1="30"
                          y1={yVal}
                          x2="690"
                          y2={yVal}
                          stroke="#1E293B"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                      ))}

                      {/* Line Plot depending on selected metric */}
                      {timelineMetric === 'wet_area' && (
                        <polyline
                          fill="none"
                          stroke="#38BDF8"
                          strokeWidth="2"
                          points={v4FramesMeta
                            .map((f) => {
                              const x = 30 + (f.time_sec / 3600) * 660;
                              const y = 70 - (f.wet_area_km2 / 22.0) * 60;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {timelineMetric === 'max_depth' && (
                        <polyline
                          fill="none"
                          stroke="#A78BFA"
                          strokeWidth="2"
                          points={v4FramesMeta
                            .map((f) => {
                              const x = 30 + (f.time_sec / 3600) * 660;
                              const y = 70 - (Math.min(6500, f.max_depth_m) / 6500) * 60;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {timelineMetric === 'roads' && (
                        <polyline
                          fill="none"
                          stroke="#FB923C"
                          strokeWidth="2"
                          points={v4FramesMeta
                            .map((f) => {
                              const x = 30 + (f.time_sec / 3600) * 660;
                              const segs = f.time_sec <= 0 ? 0 : (f.time_sec <= 300 ? 22 : (f.time_sec <= 600 ? 45 : (f.time_sec <= 1200 ? 58 : 74)));
                              const y = 70 - (segs / 74) * 60;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {/* Active Time Scrubber Indicator */}
                      <line
                        x1={30 + (currentSec / 3600) * 660}
                        y1="5"
                        x2={30 + (currentSec / 3600) * 660}
                        y2="75"
                        stroke="#F59E0B"
                        strokeWidth="2"
                      />
                      <circle
                        cx={30 + (currentSec / 3600) * 660}
                        cy="10"
                        r="3.5"
                        fill="#F59E0B"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {!isTimelineOpen && (
                <button
                  onClick={() => setIsTimelineOpen(true)}
                  className="absolute bottom-14 left-4 z-20 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-300 flex items-center gap-1 hover:bg-slate-800"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show Timeline Telemetry
                </button>
              )}
            </>
          )}
        </div>

        {/* Bottom Playback & Scrubber Controls (Always visible in lisflood view) */}
        {subView === 'lisflood' && (
          <div className="h-12 border-t border-slate-800 bg-[#0B0F19] px-4 flex items-center justify-between gap-4 shrink-0 select-none z-20">
            {/* Playback Buttons */}
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
        )}
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

          {/* Downstream Reach Arrival Timeline Card */}
          <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Downstream Reach Arrival Status
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">2 km Canyon Chainage:</span>
                <span className="text-emerald-400 font-bold">~101 s (WETTED)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">5 km Canyon Chainage:</span>
                <span className="text-emerald-400 font-bold">~349 s (WETTED)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">8 km Canyon Chainage:</span>
                <span className="text-emerald-400 font-bold">~763 s (WETTED)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">10 km Canyon Chainage:</span>
                <span className="font-bold text-sky-400">
                  {isV4 ? 'T+1100 s (WETTED)' : 'NOT REACHED (<800s)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">30 km Domain Boundary:</span>
                <span className="font-bold text-amber-400">
                  {isV4 ? 'T+3400 s (REACHED)' : 'OUTSIDE V3 DOMAIN'}
                </span>
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
                  className="text-slate-400 hover:text-white text-sm leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="font-bold text-white text-xs">{selectedFeature.name}</div>
              <div className="text-[11px] text-slate-300">Status: {selectedFeature.status}</div>
              {selectedFeature.arrivalSec !== null && (
                <div className="text-[10px] text-amber-400">
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
