import os

sim_lab = """
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, Map, Layers, LayoutPanelLeft } from 'lucide-react';
import L from 'leaflet';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';

const SPEEDS = [1, 2, 5];

export default function SimulationLab({ initialTimeMin = 0, onTimeChange, onNavigateToHadr }) {
  const [currentTimeMin, setCurrentTimeMin] = useState(initialTimeMin);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeLayer, setActiveLayer] = useState('arrival'); // 'arrival' | 'max_depth'
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    basemap: null,
    floodFrame: null,
    maxDepth: null
  });

  const maxTimeMin = 13.33;
  const isFinished = currentTimeMin >= maxTimeMin;

  const handleTimeChange = (t) => {
    setCurrentTimeMin(t);
    onTimeChange?.(t);
  };

  // Playback Loop
  useEffect(() => {
    let raf;
    let last;
    const tick = (now) => {
      if (!last) last = now;
      const elapsed = now - last;
      if (elapsed >= (100 / playbackSpeed)) {
        last = now;
        setCurrentTimeMin((prev) => {
          if (prev >= 13.33) {
            setIsPlaying(false);
            return 13.33;
          }
          const next = Math.min(13.33, prev + 0.166);
          onTimeChange?.(next);
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    if (isPlaying) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, playbackSpeed]);

  // Init Map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [30.33, 78.49],
      zoom: 12,
      zoomControl: false,
    });
    
    // Light professional basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);
    mapInstanceRef.current = map;

    // Load max_depth_v3.tif initially but hide it
    fetch('/data/processed/tehri_simulations/lisflood_fp/outputs/v3_geometry_corrected/rasters/max_depth_v3.tif')
      .then(res => res.arrayBuffer())
      .then(buf => parseGeoraster(buf))
      .then(georaster => {
        const layer = new GeoRasterLayer({
          georaster,
          opacity: 0,
          resolution: 256,
          pixelValuesToColorFn: (v) => {
            const depth = v[0];
            if (depth <= 0 || depth === georaster.noDataValue) return null;
            if (depth < 0.5) return '#93c5fd';
            if (depth < 2.0) return '#3b82f6';
            if (depth < 5.0) return '#2563eb';
            if (depth < 10.0) return '#1d4ed8';
            return '#1e3a8a';
          }
        });
        layer.addTo(map);
        layersRef.current.maxDepth = layer;
      });

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update Dynamic Arrival Frame
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeLayer === 'max_depth') {
      if (layersRef.current.floodFrame) map.removeLayer(layersRef.current.floodFrame);
      if (layersRef.current.maxDepth) layersRef.current.maxDepth.setOpacity(0.8);
      return;
    }

    // Otherwise 'arrival' playback
    if (layersRef.current.maxDepth) layersRef.current.maxDepth.setOpacity(0);

    const currentT = Math.round(currentTimeMin * 60);
    const snapped = Math.max(0, Math.min(800, Math.round(currentT / 50.0) * 50));

    fetch(`/api/scenarios/v3/frames/${snapped}`)
      .then(res => res.json())
      .then(geoJson => {
        if (!mapInstanceRef.current || activeLayer !== 'arrival') return;
        if (layersRef.current.floodFrame) map.removeLayer(layersRef.current.floodFrame);

        const layer = L.geoJSON(geoJson, {
          style: { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.8, weight: 0.5, opacity: 1 }
        });
        layer.addTo(map);
        layersRef.current.floodFrame = layer;
      })
      .catch(() => {});
  }, [currentTimeMin, activeLayer]);

  const currentSec = Math.round(currentTimeMin * 60);
  const roadEdges = currentSec <= 0 ? 0 : currentSec <= 300 ? 31 : currentSec <= 600 ? 49 : 52;
  const pct = Math.round((currentTimeMin / maxTimeMin) * 100);

  return (
    <div className="flex w-full h-full relative">
      {/* MAP */}
      <div className="flex-1 relative bg-slate-100">
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Legend / Info Top Right */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
          <div className="bg-white/95 backdrop-blur shadow-sm border border-slate-200 rounded-lg p-3 pointer-events-auto">
            <h3 className="text-xs font-bold text-slate-800 mb-1">WHAT-IF HYDRODYNAMIC BENCHMARK</h3>
            <p className="text-[10px] text-slate-500 font-mono uppercase">PHYSICAL VALIDATION NOT AVAILABLE</p>
          </div>
          
          {activeLayer === 'max_depth' && (
             <div className="bg-white/95 backdrop-blur shadow-sm border border-slate-200 rounded-lg p-3 pointer-events-auto mt-2">
                <p className="text-xs font-bold text-slate-800 mb-2">Maximum Modelled Depth</p>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <div className="w-4 h-4 bg-blue-300"></div> &lt; 0.5m
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono mt-1">
                  <div className="w-4 h-4 bg-blue-500"></div> 0.5 - 2.0m
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono mt-1">
                  <div className="w-4 h-4 bg-blue-600"></div> 2.0 - 5.0m
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono mt-1">
                  <div className="w-4 h-4 bg-blue-700"></div> 5.0 - 10.0m
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono mt-1">
                  <div className="w-4 h-4 bg-blue-900"></div> &gt; 10.0m
                </div>
             </div>
          )}
        </div>

        {/* Layer Controls Bottom Left */}
        <div className="absolute bottom-16 left-4 z-[400] bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
          <button 
            onClick={() => setActiveLayer('arrival')}
            className={`px-4 py-3 text-xs font-semibold text-left transition flex items-center justify-between min-w-[200px] border-b border-slate-100 ${activeLayer === 'arrival' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Arrival-Time Propagation
            {activeLayer === 'arrival' && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
          </button>
          <button 
            onClick={() => setActiveLayer('max_depth')}
            className={`px-4 py-3 text-xs font-semibold text-left transition flex items-center justify-between ${activeLayer === 'max_depth' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Maximum Depth Raster
            {activeLayer === 'max_depth' && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
          </button>
        </div>

        {/* Playback Timeline Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-[400] flex items-center px-4 gap-4">
          <button onClick={() => { if(isFinished) setCurrentTimeMin(0); setIsPlaying(!isPlaying); }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white shrink-0">
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>
          <button onClick={() => { setIsPlaying(false); setCurrentTimeMin(0); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 border border-slate-200 shrink-0">
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 shrink-0">
            <span className="text-xs font-mono font-bold text-slate-800">T+{currentSec}s</span>
          </div>

          <div className="flex-1 relative mx-4 flex items-center">
             <input
                type="range"
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer outline-none"
                min={0} max={maxTimeMin} step={0.05} value={currentTimeMin}
                onChange={e => handleTimeChange(Number(e.target.value))}
                style={{ background: `linear-gradient(to right, #2563EB 0%, #2563EB ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)` }}
             />
             <div className="absolute w-full top-3 flex justify-between pointer-events-none px-1 text-[10px] font-mono text-slate-400">
               <span>0s</span>
               <span style={{position:'absolute', left:'12.5%'}}>101s (~2km)</span>
               <span style={{position:'absolute', left:'37.5%'}}>300s</span>
               <span style={{position:'absolute', left:'43.6%'}}>349s (~5km)</span>
               <span style={{position:'absolute', left:'75%'}}>600s</span>
               <span style={{position:'absolute', left:'95.3%'}}>763s (~8km)</span>
               <span>800s</span>
             </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-200 rounded shrink-0">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => setPlaybackSpeed(s)} className={`px-2 py-1 text-xs font-mono font-bold rounded ${playbackSpeed === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{s}x</button>
            ))}
          </div>
        </div>
      </div>

      {/* INSPECTOR RIGHT */}
      {isInspectorOpen ? (
        <div className="w-[320px] h-full bg-white border-l border-slate-200 flex flex-col shadow-xl z-[410] relative">
          <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 shrink-0 bg-slate-50">
            <span className="font-bold text-sm text-slate-800">Analytics Inspector</span>
            <button onClick={() => setIsInspectorOpen(false)} className="text-slate-400 hover:text-slate-800"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Exposure Profile</h3>
              <div className="flex justify-between items-end mb-1">
                <span className="text-3xl font-light text-slate-800 tracking-tight">{roadEdges}</span>
                <span className="text-xs font-semibold text-slate-500 mb-1">Road Segments</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">Total modelled exposed roads: 38.788 km. Actual unavailable segments increase as timeline advances.</p>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Critical Assets</h3>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm"><span className="text-slate-600">Settlements</span><span className="font-mono text-slate-800">0</span></div>
                 <div className="flex justify-between text-sm"><span className="text-slate-600">Healthcare</span><span className="font-mono text-slate-800">0</span></div>
                 <div className="flex justify-between text-sm"><span className="text-slate-600">Bridges</span><span className="font-mono text-slate-800">0</span></div>
                 <div className="flex justify-between text-sm"><span className="text-slate-600">Power Stations</span><span className="font-mono text-slate-800">0</span></div>
               </div>
               <p className="text-[10px] text-slate-400 leading-tight mt-3">No critical assets intersected within the 800s window.</p>
            </div>
            
            <div className="mt-auto">
               <button onClick={onNavigateToHadr} className="w-full py-2.5 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg border border-blue-100 hover:bg-blue-100 transition">
                 Open HADR Operations
               </button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsInspectorOpen(true)}
          className="absolute top-4 right-4 z-[410] bg-white border border-slate-200 shadow-lg p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        >
          <LayoutPanelLeft className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
"""
with open("frontend/src/pages/SimulationLab.jsx", "w") as f:
    f.write(sim_lab)

