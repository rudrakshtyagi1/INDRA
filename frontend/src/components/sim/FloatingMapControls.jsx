import React, { useState } from 'react';
import {
  Layers,
  Crosshair,
  Navigation,
  ChevronDown,
  Eye,
  EyeOff,
  PanelRight,
  Mountain,
  Compass,
} from 'lucide-react';

const LAYER_DEFS = [
  { key: 'depth_layers',      label: 'Flood Depth Layers' },
  { key: 'wavefront',         label: 'Wave Front Arrival' },
  { key: 'settlements',       label: 'Settlements & Exposure' },
  { key: 'infrastructure',    label: 'Critical Facilities & Shelters' },
  { key: 'admin_exposure',    label: 'District Administrative Boundaries' },
  { key: 'sph_nearfield',     label: 'DualSPHysics Domain (0–2 km)' },
  { key: 'coupling_transect', label: 'Q(t) Coupling Transect' },
];

const CAMERA_PRESETS = [
  { id: 'full_domain', label: 'Full 145 km Domain (Tehri → Bijnor)', center: [29.88, 78.35], zoom: 9 },
  { id: 'mountain_gorge', label: 'Upper Mountain Gorge (0–30 km)', center: [30.33, 78.48], zoom: 12 },
  { id: 'devprayag', label: 'Devprayag Sangam (42 km)', center: [30.146, 78.599], zoom: 13 },
  { id: 'foothills', label: 'Rishikesh – Haridwar Foothills', center: [30.04, 78.23], zoom: 12 },
  { id: 'plains', label: 'Upper Ganga Plains → Bijnor Boundary', center: [29.60, 78.16], zoom: 11 },
];

export default function FloatingMapControls({
  layerVisibility,
  onToggleLayer,
  onFitFlood,
  onFollowFront,
  followFront,
  isInspectorOpen,
  onToggleInspector,
  mapDimension = '2D',
  onToggleDimension,
  onSelectCameraPreset,
}) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  return (
    <div className="absolute bottom-5 left-4 z-10 flex flex-col gap-2.5 items-start select-none">
      
      {/* Playback Mode Label */}
      <div 
        className="floating-control flex flex-col px-3 py-2 text-xs font-semibold text-slate-800 bg-white/95"
        title="Flood extent is progressively revealed using the modelled first-arrival time raster. Instantaneous water depth time-series are not currently loaded."
      >
        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">PLAYBACK MODE</span>
        <span className="text-blue-700">ARRIVAL-TIME-DERIVED PROPAGATION</span>
      </div>

      {/* Layers Menu */}
      <div className="relative">
        <button
          onClick={() => {
            setLayersOpen(!layersOpen);
            setCameraOpen(false);
          }}
          className="floating-control flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition"
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Map Layers</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform ${layersOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Layers Dropdown Menu */}
        {layersOpen && (
          <div className="absolute bottom-full mb-2 left-0 floating-control p-2.5 flex flex-col gap-1.5 min-w-[240px] shadow-2xl z-50">
            <p className="text-xs font-semibold text-[var(--text-secondary)] px-2 py-1 border-b border-[var(--surface-border)]">
              Geospatial Simulation Layers
            </p>
            {LAYER_DEFS.map(({ key, label }) => {
              const visible = layerVisibility[key] !== false;
              return (
                <button
                  key={key}
                  onClick={() => onToggleLayer(key)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-white/5 transition text-left w-full"
                >
                  {visible ? (
                    <Eye className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  )}
                  <span
                    className={`text-xs ${
                      visible ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Camera Presets Menu */}
      <div className="relative">
        <button
          onClick={() => {
            setCameraOpen(!cameraOpen);
            setLayersOpen(false);
          }}
          className="floating-control flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition"
        >
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>Camera Views</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform ${cameraOpen ? 'rotate-180' : ''}`} />
        </button>

        {cameraOpen && (
          <div className="absolute bottom-full mb-2 left-0 floating-control p-2.5 flex flex-col gap-1 min-w-[260px] shadow-2xl z-50">
            <p className="text-xs font-semibold text-[var(--text-secondary)] px-2 py-1 border-b border-[var(--surface-border)]">
              Geographic Camera Presets
            </p>
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  onSelectCameraPreset?.(preset);
                  setCameraOpen(false);
                }}
                className="px-2.5 py-2 rounded-md hover:bg-white/5 transition text-left text-xs font-medium text-[var(--text-primary)]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2D / 3D Himalayan Terrain Toggle */}
      {onToggleDimension && (
        <button
          onClick={onToggleDimension}
          className={`floating-control flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition ${
            mapDimension === '3D'
              ? 'text-purple-300 border-purple-500/60 bg-purple-950/40'
              : 'text-[var(--text-primary)] hover:bg-[var(--surface-3)]'
          }`}
          title="Toggle 2D Operational Map / 3D Himalayan Terrain"
        >
          <Mountain className="w-4 h-4 text-purple-400" />
          <span>{mapDimension === '3D' ? '3D Active' : '2D / 3D Terrain'}</span>
        </button>
      )}

      {/* Fit Flood Extent */}
      <button
        onClick={onFitFlood}
        className="floating-control flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition"
        title="Fit map viewport to full inundation extent"
      >
        <Crosshair className="w-4 h-4 text-blue-400" />
        <span>Fit Extent</span>
      </button>

      {/* Follow Wave Front */}
      <button
        onClick={onFollowFront}
        className={`floating-control flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition ${
          followFront
            ? 'text-cyan-300 border-cyan-500/60 bg-cyan-950/40'
            : 'text-[var(--text-primary)] hover:bg-[var(--surface-3)]'
        }`}
        title="Automatically track the leading flood wave front"
      >
        <Navigation className={`w-4 h-4 ${followFront ? 'text-cyan-400' : 'text-blue-400'}`} />
        <span>{followFront ? 'Tracking Front' : 'Follow Wave'}</span>
      </button>

      {/* Toggle Right Inspector */}
      {onToggleInspector && (
        <button
          onClick={onToggleInspector}
          className={`floating-control flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition ${
            isInspectorOpen
              ? 'text-blue-300 border-blue-500/50'
              : 'text-[var(--text-primary)] hover:bg-[var(--surface-3)]'
          }`}
          title="Toggle Context & Exposure Inspector"
        >
          <PanelRight className="w-4 h-4 text-blue-400" />
          <span>{isInspectorOpen ? 'Hide Panel' : 'Show Panel'}</span>
        </button>
      )}
    </div>
  );
}
