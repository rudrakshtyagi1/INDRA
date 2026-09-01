import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Play,
  Pause,
  RotateCcw,
  Layers,
  MapPin,
  Clock,
  Compass,
  Maximize2,
  Minimize2,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { createBasemapLayer } from '../../utils/mapTiles';
import { formatMinutes } from '../../utils/formatters';
import { RIVER_CENTERLINE, getFloodTimestepData } from '../../data/prototype/tehriPrototypeFlood';
import { PROTOTYPE_SETTLEMENTS, getSettlementStatus } from '../../data/prototype/tehriPrototypeSettlements';
import { PROTOTYPE_METADATA } from '../../data/prototype/tehriPrototypeRun';

export const CORRIDOR_STATIONS = PROTOTYPE_SETTLEMENTS.map((s) => ({
  id: s.id,
  name: s.name,
  lat: s.lat,
  lon: s.lon,
  km: s.kmFromDam,
  arrivalMin: s.arrivalMin,
  depth: s.peakDepthM,
  type: s.type,
  pop: s.population,
}));

export const RIVER_CORRIDOR_COORDS = RIVER_CENTERLINE.map((p) => [p.lat, p.lon]);

export default function GeospatialSimulationMap({
  currentTimeMin = 60,
  onTimeChange,
  isPlaying,
  onTogglePlay,
  onReset,
  playbackSpeed = 1,
  onSpeedChange,
  scenarioParams = {},
  isFullScreen = false,
  onToggleFullScreen,
  onNavigateToHadr,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    riverLine: null,
    sphCircle: null,
    couplingLine: null,
    floodDeepPoly: null,
    floodModPoly: null,
    floodShallowPoly: null,
    wavefrontMarker: null,
    markers: [],
  });

  const [viewMode, setViewMode] = useState('immediate'); // 'immediate' | 'corridor' | 'basin'
  const [followWavefront, setFollowWavefront] = useState(false);
  const [showLayerDrawer, setShowLayerDrawer] = useState(false);

  // Toggleable Layers
  const [layerVisibility, setLayerVisibility] = useState({
    depth_layers: true,
    sph_nearfield: true,
    coupling_transect: true,
    delft3d_farfield: true,
    wavefront: true,
    settlements: true,
  });

  const toggleLayer = (key) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.340, 78.490],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    createBasemapLayer(map).addTo(map);
    mapInstanceRef.current = map;

    // Background River Centerline
    const riverCoords = RIVER_CENTERLINE.map((p) => [p.lat, p.lon]);
    const riverLine = L.polyline(riverCoords, {
      color: '#0284c7',
      weight: 2.5,
      opacity: 0.6,
      dashArray: '3,3',
    }).addTo(map);
    layersRef.current.riverLine = riverLine;

    // DualSPHysics Near-Field Domain (0–2km Circle)
    const sphCircle = L.circle([30.378, 78.481], {
      radius: 2000,
      color: '#06b6d4',
      fillColor: '#06b6d4',
      fillOpacity: 0.2,
      weight: 1.5,
      dashArray: '4,4',
    }).addTo(map);
    sphCircle.bindTooltip('DualSPHysics 3D Near-Field Domain (0–2.0 km)', {
      permanent: false,
      direction: 'top',
    });
    layersRef.current.sphCircle = sphCircle;

    // Coupling Transect (x = 2.0 km)
    const couplingLine = L.polyline(
      [
        [30.368, 78.465],
        [30.368, 78.495],
      ],
      {
        color: '#c084fc',
        weight: 3,
        dashArray: '5,4',
      }
    ).addTo(map);
    couplingLine.bindTooltip('Coupling Transect Q(t) [x = 2.0 km]', {
      permanent: false,
      direction: 'top',
    });
    layersRef.current.couplingLine = couplingLine;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. View Mode Pan/Zoom
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (viewMode === 'immediate') {
      map.flyTo([30.335, 78.495], 12, { duration: 0.8 });
    } else if (viewMode === 'corridor') {
      map.flyTo([30.160, 78.380], 10, { duration: 0.8 });
    } else if (viewMode === 'basin') {
      map.flyTo([30.250, 78.400], 9, { duration: 0.8 });
    }
  }, [viewMode]);

  // 3. Dynamic Inundation Wave, Graduated Depth, and Wavefront Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Sync static layers
    if (layersRef.current.sphCircle) {
      if (layerVisibility.sph_nearfield) map.addLayer(layersRef.current.sphCircle);
      else map.removeLayer(layersRef.current.sphCircle);
    }
    if (layersRef.current.couplingLine) {
      if (layerVisibility.coupling_transect) map.addLayer(layersRef.current.couplingLine);
      else map.removeLayer(layersRef.current.couplingLine);
    }

    // Clear old flood polygons & wavefront
    if (layersRef.current.floodDeepPoly) {
      map.removeLayer(layersRef.current.floodDeepPoly);
      layersRef.current.floodDeepPoly = null;
    }
    if (layersRef.current.floodModPoly) {
      map.removeLayer(layersRef.current.floodModPoly);
      layersRef.current.floodModPoly = null;
    }
    if (layersRef.current.floodShallowPoly) {
      map.removeLayer(layersRef.current.floodShallowPoly);
      layersRef.current.floodShallowPoly = null;
    }
    if (layersRef.current.wavefrontMarker) {
      map.removeLayer(layersRef.current.wavefrontMarker);
      layersRef.current.wavefrontMarker = null;
    }

    const timestepData = getFloodTimestepData(currentTimeMin);

    if (currentTimeMin > 0 && layerVisibility.depth_layers) {
      // 1. Shallow Inundation Boundary (< 0.5m)
      const shallowPoly = L.polygon(timestepData.shallowPolygon, {
        color: '#7dd3fc',
        fillColor: '#0284c7',
        fillOpacity: 0.2,
        weight: 1,
      }).addTo(map);
      layersRef.current.floodShallowPoly = shallowPoly;

      // 2. Moderate Inundation Envelope (0.5 – 3.0 m)
      const modPoly = L.polygon(timestepData.moderatePolygon, {
        color: '#38bdf8',
        fillColor: '#0284c7',
        fillOpacity: 0.5,
        weight: 1.2,
      }).addTo(map);
      layersRef.current.floodModPoly = modPoly;

      // 3. Deep Core Flood Channel (> 3.0 m)
      const deepPoly = L.polygon(timestepData.deepPolygon, {
        color: '#0369a1',
        fillColor: '#0c4a6e',
        fillOpacity: 0.8,
        weight: 1.5,
      }).addTo(map);
      layersRef.current.floodDeepPoly = deepPoly;

      // 4. Advancing Wavefront Marker
      if (layerVisibility.wavefront && timestepData.leadingPoint) {
        const lp = timestepData.leadingPoint;
        const wfIcon = L.divIcon({
          className: 'custom-wavefront-icon',
          html: `
            <div style="
              background: #f59e0b;
              color: #020617;
              font-size: 10px;
              font-weight: 800;
              font-family: monospace;
              border-radius: 9999px;
              padding: 2px 8px;
              box-shadow: 0 0 16px rgba(245, 158, 11, 0.8);
              border: 1.5px solid #ffffff;
              display: flex;
              align-items: center;
              gap: 4px;
              white-space: nowrap;
            ">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff; display: inline-block; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              <span>WAVE FRONT (T+${currentTimeMin}m &bull; ${lp.km.toFixed(1)} km)</span>
            </div>
          `,
          iconSize: [160, 24],
          iconAnchor: [80, 12],
        });

        const wfMarker = L.marker([lp.lat, lp.lon], { icon: wfIcon }).addTo(map);
        layersRef.current.wavefrontMarker = wfMarker;

        if (followWavefront) {
          map.panTo([lp.lat, lp.lon], { animate: true });
        }
      }
    }

    // 5. Update Settlement Markers
    layersRef.current.markers.forEach((m) => map.removeLayer(m));
    layersRef.current.markers = [];

    if (layerVisibility.settlements) {
      PROTOTYPE_SETTLEMENTS.forEach((st) => {
        const status = getSettlementStatus(st, currentTimeMin);

        let markerColor = '#64748b';
        let markerBg = 'rgba(15, 23, 42, 0.95)';

        if (status.state === 'INUNDATED') {
          markerColor = '#ef4444';
          markerBg = 'rgba(239, 68, 68, 0.2)';
        } else if (status.state === 'THREATENED') {
          markerColor = '#f59e0b';
          markerBg = 'rgba(245, 158, 11, 0.2)';
        } else {
          markerColor = '#10b981';
          markerBg = 'rgba(16, 185, 129, 0.15)';
        }

        const customIcon = L.divIcon({
          className: 'custom-station-icon',
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 5px;
              background: rgba(15, 23, 42, 0.95);
              border: 1.5px solid ${markerColor};
              border-radius: 9999px;
              padding: 2px 7px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            ">
              <span style="
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: ${markerColor};
                display: inline-block;
              "></span>
              <span style="
                color: #f8fafc;
                font-size: 10px;
                font-weight: 700;
                font-family: monospace;
                white-space: nowrap;
              ">${st.name}</span>
            </div>
          `,
          iconSize: [130, 22],
          iconAnchor: [65, 11],
        });

        const marker = L.marker([st.lat, st.lon], { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4;">
            <strong>${st.name} (${st.kmFromDam} km)</strong><br/>
            Status: <strong style="color: ${markerColor};">${status.label}</strong><br/>
            Peak Depth: <strong>${st.peakDepthM} m</strong><br/>
            ${st.population > 0 ? `Population: <strong>${st.population.toLocaleString()}</strong><br/>` : ''}
            Arrival Time: <strong>T+${st.arrivalMin} min</strong><br/>
            ${st.safeShelter ? `Safe Shelter: <strong>${st.safeShelter}</strong>` : ''}
          </div>
        `);

        layersRef.current.markers.push(marker);
      });
    }
  }, [currentTimeMin, layerVisibility, followWavefront]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 flex flex-col justify-between ${
        isFullScreen ? 'h-full flex-1' : 'h-[520px]'
      }`}
    >
      {/* 1. Leaflet Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* 2. Top-Left: Operational Scope Selector */}
      <div className="relative z-10 p-4 flex flex-wrap items-center justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-950/95 backdrop-blur border border-slate-800 p-1 rounded-xl shadow-lg">
          <button
            onClick={() => setViewMode('immediate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'immediate'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            IMMEDIATE IMPACT
          </button>
          <button
            onClick={() => setViewMode('corridor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'corridor'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DOWNSTREAM CORRIDOR
          </button>
          <button
            onClick={() => setViewMode('basin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'basin'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FULL BASIN
          </button>
        </div>

        {/* Right Tools: Follow Wavefront, Layers, and Fullscreen */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setFollowWavefront(!followWavefront)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition flex items-center gap-1.5 shadow-lg ${
              followWavefront
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-950/95 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Follow Front</span>
          </button>

          <button
            onClick={() => setShowLayerDrawer(!showLayerDrawer)}
            className="px-3 py-1.5 rounded-xl bg-slate-950/95 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Layers</span>
          </button>

          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-2 rounded-xl bg-slate-950/95 border border-slate-800 text-slate-300 hover:text-white transition shadow-lg"
              title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen Simulation Mode'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Layer Control Dropdown Popover */}
      {showLayerDrawer && (
        <div className="absolute top-16 right-4 z-20 bg-slate-950/95 backdrop-blur border border-slate-800 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2.5 w-64 font-mono">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-slate-300 font-bold">
            <span>SIMULATION LAYERS</span>
            <button onClick={() => setShowLayerDrawer(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          {[
            { id: 'depth_layers', label: 'Flood Depth Zones (Delft3D)' },
            { id: 'sph_nearfield', label: 'SPH Near-Field (0–2.0 km)' },
            { id: 'coupling_transect', label: 'Coupling Transect (x=2km)' },
            { id: 'wavefront', label: 'Advancing Wave Front' },
            { id: 'settlements', label: 'Threatened Settlements' },
          ].map((l) => (
            <label key={l.id} className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span>{l.label}</span>
              <input
                type="checkbox"
                checked={layerVisibility[l.id]}
                onChange={() => toggleLayer(l.id)}
                className="accent-cyan-400 cursor-pointer rounded"
              />
            </label>
          ))}
        </div>
      )}

      {/* 3. Floating Bottom-Left: Map Legend Overlay */}
      <div className="relative z-10 px-4 pb-20 pointer-events-none">
        <div className="pointer-events-auto inline-flex flex-col gap-1.5 bg-slate-950/90 backdrop-blur border border-slate-800 p-3 rounded-xl shadow-lg text-[11px] font-mono">
          <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-800/80">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
              Inundation Depth Legend
            </span>
            <span className="text-[9px] text-cyan-400 font-bold">PROTOTYPE DEPTH</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-sky-400/50 inline-block" />
              <span className="text-slate-300">&lt; 0.5 m (Shallow)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block" />
              <span className="text-slate-300">0.5 – 3.0 m (Moderate)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-sky-900 inline-block" />
              <span className="text-slate-300">&gt; 3.0 m (Deep Channel)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              <span className="text-cyan-300">SPH Near-Field (0–2km)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Scrubber & Playback Control Bar */}
      <div className="relative z-10 bg-slate-950/95 backdrop-blur border-t border-slate-800/90 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Play/Pause & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-md shadow-cyan-500/20"
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-slate-950" />}
          </button>
          <button
            onClick={onReset}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Reset to T+0h"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Time Display */}
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-200 font-bold">
              T+{formatMinutes(currentTimeMin)} ({(currentTimeMin / 60).toFixed(2)}h)
            </span>
          </div>
        </div>

        {/* Scrubbing Slider (0h to 3h / 180 min) */}
        <div className="flex-1 min-w-[240px] flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400">T+0m</span>
          <input
            type="range"
            min="0"
            max="180"
            step="1"
            value={currentTimeMin}
            onChange={(e) => onTimeChange(parseInt(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-400">T+180m</span>
        </div>

        {/* Playback Speed Toggles */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`px-2.5 py-1 rounded-lg transition ${
                playbackSpeed === speed
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
