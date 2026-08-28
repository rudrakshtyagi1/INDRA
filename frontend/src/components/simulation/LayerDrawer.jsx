import React from 'react';
import { Eye, EyeOff, Layers, Waves, Navigation, MapPin } from 'lucide-react';
import Drawer from '../common/Drawer';

export default function LayerDrawer({
  isOpen,
  onClose,
  activeLayers = {},
  onToggleLayer,
}) {
  const LAYER_DEFS = [
    {
      id: 'water_depth',
      name: 'Water Depth (h) Contours',
      desc: '2D continuous water depth color-mapped from shallow (0.3m) to catastrophic (>15m).',
      category: 'Hydrodynamics',
      color: '#38bdf8',
    },
    {
      id: 'velocity_vectors',
      name: 'Velocity Vectors & Streamlines',
      desc: 'Flow velocity magnitude and directional momentum vectors across river corridor.',
      category: 'Hydrodynamics',
      color: '#ef4444',
    },
    {
      id: 'sph_particles',
      name: 'SPH Near-Field Particles (0–2 km)',
      desc: 'Lagrangian SPH 3D fluid particles rendered strictly in the dam-axis near-field.',
      category: 'Near-Field Solver',
      color: '#06b6d4',
    },
    {
      id: 'coupling_transect',
      name: 'Coupling Interface Transect (x = 2.0 km)',
      desc: 'Transverse flux extraction plane where Q(t) = ∫ v·n dA is computed for D-Flow FM.',
      category: 'Coupling Interface',
      color: '#a855f7',
    },
    {
      id: 'delft3d_farfield',
      name: 'Delft3D Flexible Mesh Far-Field (2–100 km)',
      desc: 'Unstructured flexible mesh Eulerian 2D shallow-water inundation grid.',
      category: 'Far-Field Solver',
      color: '#10b981',
    },
    {
      id: 'settlements',
      name: 'Settlements & Population Exposure',
      desc: 'Downstream villages, pilgrimage nodes, and municipal centres with risk categorisation.',
      category: 'HADR Exposure',
      color: '#f59e0b',
    },
    {
      id: 'road_traversability',
      name: 'Road Network & Evacuation Lifelines',
      desc: 'NH-58 and district highway accessibility color-coded by water depth thresholds.',
      category: 'HADR Exposure',
      color: '#ec4899',
    },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Simulation Layer Visibility"
      subtitle="Toggle hydrodynamic contours, near-field/far-field domains, and GIS infrastructure overlays."
      width="max-w-md"
    >
      <div className="space-y-3">
        {LAYER_DEFS.map((layer) => {
          const isVisible = activeLayers[layer.id] !== false;
          return (
            <div
              key={layer.id}
              onClick={() => onToggleLayer(layer.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                isVisible
                  ? 'bg-slate-950 border-slate-700/80 shadow-xs'
                  : 'bg-slate-950/40 border-slate-800/50 opacity-60'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="text-xs font-semibold text-slate-100">{layer.name}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{layer.desc}</p>
                <span className="text-[10px] font-mono text-cyan-400 block pt-0.5">
                  {layer.category}
                </span>
              </div>

              <button
                className={`p-1.5 rounded-lg transition shrink-0 ${
                  isVisible ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-500 bg-slate-900'
                }`}
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}
