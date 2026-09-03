import React, { useState } from 'react';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  X,
  Database,
  CloudRain,
  Waves,
  Activity,
  Scale,
  Map,
  ShieldAlert,
  Globe,
  Satellite,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

const TOUR_STEPS = [
  {
    step: 1,
    title: 'Data Ingestion & Himalayan Basin Setup',
    icon: Database,
    tab: 'data',
    realArtifact: 'Copernicus GLO-30 DEM (30m) & ERA5-Land Reanalysis',
    provenance: 'OBSERVED / REPORTED',
    description:
      'FloodLab ingests hydrologically conditioned 30m DEM elevation grids, delineating the 7,300.30 km² Tehri catchment with 0.18% area agreement against CWC telemetry.',
    keyMetric: 'Catchment Area: 7,300.30 km² · 4,677 HydroRIVERS reaches',
  },
  {
    step: 2,
    title: 'Catchment Hydrology Engine',
    icon: CloudRain,
    tab: 'hydrology',
    realArtifact: 'CWC Tekhla Observed vs SCS-CN Modelled Event Timeseries',
    provenance: 'MODELLED (Partially Calibrated)',
    description:
      'Forced with ERA5-Land 140-cell hourly rainfall for the 2024 monsoon event. Parameter-fitted with SCS-CN infiltration (CN=78) and Nash 2-reservoir cascade.',
    keyMetric: 'Peak Flow: 866.81 m³/s (+1.63% error vs CWC observed 852.93 m³/s)',
  },
  {
    step: 3,
    title: 'Theoretical Breach Mechanics Benchmark',
    icon: Waves,
    tab: 'simulation',
    view: 'breach',
    realArtifact: 'breach_boundary_hydrograph.csv (Froehlich 2008)',
    provenance: 'ASSUMED THEORETICAL BENCHMARK',
    description:
      'Implements empirical Froehlich (2008) embankment breach equations. Evaluates reservoir potential release under synthetic hypsometry.',
    keyMetric: 'Froehlich Base Peak: 723,705 m³/s (Width: 220m, Formation: 2.0h)',
  },
  {
    step: 4,
    title: 'DualSPHysics 5.4 CPU Near-Field SPH',
    icon: Activity,
    tab: 'simulation',
    view: 'sph',
    realArtifact: '41 Binary VTK Frames (PartFluid_*.vtk, 21,846 fluid particles)',
    provenance: 'PRECOMPUTED MODEL RESULT (DualSPHysics 5.4)',
    description:
      '3D Lagrangian particle hydrodynamics solving the initial violent canyon plunge (0–2 km). Confirmed 0.0% particle bookkeeping residual across 2,871 particles.',
    keyMetric: 'Model Peak Discharge: 3.0 m³/s at x=20m (Max velocity: 10.3 m/s)',
  },
  {
    step: 5,
    title: 'Froude Similarity Coupling Engine',
    icon: Scale,
    tab: 'simulation',
    view: 'coupling',
    realArtifact: 'dualsphysics_to_delft3d_boundary_prototype_equivalent.csv',
    provenance: 'DERIVED COUPLING',
    description:
      'Applies Froude kinematic similarity (scale length 100, discharge scale 100,000) to translate near-field SPH discharge into 2D far-field boundary inflow.',
    keyMetric: 'Coupled Boundary Peak Q: 300,000 m³/s (58.5% peak canyon attenuation)',
  },
  {
    step: 6,
    title: 'LISFLOOD-FP 8.1 2D Far-Field Propagation',
    icon: Map,
    tab: 'simulation',
    view: 'lisflood',
    realArtifact: '61 Real Depth GeoTIFF Frames (depth_0000.tif to depth_0060.tif)',
    provenance: 'PRECOMPUTED MODEL RESULT (LISFLOOD-FP 8.1)',
    description:
      'Solves 2D shallow water inertial equations on a 30m grid across the 30 km canyon reach to Devprayag confluence over a 3600-second window.',
    keyMetric: 'Mass Balance Error: 0.00023% (NUMERICAL QA PASS)',
  },
  {
    step: 7,
    title: 'Temporal Inundation & Wave Propagation',
    icon: Map,
    tab: 'simulation',
    view: 'lisflood',
    realArtifact: 'v4_frames_meta.json (Exact Frame Cell & Area Sums)',
    provenance: 'PRECOMPUTED MODEL RESULT',
    description:
      'Flood wave visibly advances from 0.00 km² at T+0s to 21.81 km² (24,230 wet cells) at T+3600s, reaching the 30 km domain boundary.',
    keyMetric: 'Final Wetted Extent: 21.807 km² · Chainage arrival at 8 km: ~763s',
  },
  {
    step: 8,
    title: 'Downstream Infrastructure Exposure',
    icon: ShieldAlert,
    tab: 'exposure',
    realArtifact: 'OSM Infrastructure & Road Network Spatial Intersect',
    provenance: 'DERIVED (OSM Intersect)',
    description:
      'Time-resolved spatial intersection with OpenStreetMap transport networks. Identifies 60.819 km of submerged gorge roads with earliest disruption at T+120s.',
    keyMetric: 'Road Inundation: 60.819 km (74 segments) · Zero settlements in reach',
  },
  {
    step: 9,
    title: 'HADR Evacuation Routing Analysis',
    icon: Globe,
    tab: 'hadr',
    realArtifact: 'Hazard-Weighted Dijkstra Network Optimization',
    provenance: 'DERIVED (Graph Optimization)',
    description:
      'Dijkstra pathfinding reveals that the normal 132 km canyon route is blocked by 6 submerged road segments, and no passable bypass exists under V4.',
    keyMetric: 'Route Status: NOT FEASIBLE UNDER CURRENT SCENARIO (Distance = —)',
  },
  {
    step: 10,
    title: 'Sentinel-1 Observation & Numerical QA',
    icon: CheckCircle2,
    tab: 'models_qa',
    realArtifact: 'Numerical Convergence & Solver Verification Matrix',
    provenance: 'OBSERVED / VERIFIED QA',
    description:
      'Rigorous truth-in-advertising standard: logs all solver decisions, explains why Delft3D-FM is an architectural alternative rather than executed, and audits numerical mass balance.',
    keyMetric: 'QA Status: PASS (0.00023% Mass Conservation Error)',
  },
];

export default function GuidedScienceTour({ isOpen, onClose, onNavigate }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  if (!isOpen) return null;

  const current = TOUR_STEPS[currentIdx];
  const Icon = current.icon;

  const handleNext = () => {
    if (currentIdx < TOUR_STEPS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleJump = () => {
    if (onNavigate && current.tab) {
      onNavigate(current.tab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none font-mono">
      <div className="bg-[#111827] border border-sky-600/80 rounded-lg max-w-xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Top Header */}
        <div className="p-3.5 border-b border-slate-800 bg-[#0B0F19] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-slate-100 text-xs uppercase tracking-wider">
              GUIDED SCIENCE TOUR // PRECOMPUTED BENCHMARK REVIEW
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Label */}
        <div className="px-4 py-1.5 bg-sky-950/40 border-b border-sky-800/40 text-[10px] text-sky-300 flex justify-between">
          <span>STEP {current.step} OF 10: {current.title}</span>
          <span className="text-slate-400">NOT A LIVE SIMULATION · VERIFIED ARTIFACTS ONLY</span>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded bg-sky-950 border border-sky-800 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">{current.title}</h3>
              <div className="text-[10px] text-slate-400">
                PROVENANCE: <strong className="text-slate-200">{current.provenance}</strong>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed font-sans bg-[#0B0F19] p-3 rounded border border-slate-800">
            {current.description}
          </p>

          <div className="p-3 bg-[#0B0F19] border border-sky-800/60 rounded space-y-1.5 text-[11px]">
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Verified Source Artifact:</span>
              <span className="text-sky-300 font-semibold">{current.realArtifact}</span>
            </div>
            <div className="border-t border-slate-800/80 pt-1">
              <span className="text-slate-500 uppercase text-[10px] block">Key Scientific Metric:</span>
              <span className="text-emerald-400 font-bold">{current.keyMetric}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 border-t border-slate-800 bg-[#0B0F19] flex items-center justify-between shrink-0 text-xs">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <button
            onClick={handleJump}
            className="px-3 py-1.5 rounded border border-sky-600 bg-sky-950/80 text-sky-300 hover:bg-sky-900 font-bold flex items-center gap-1.5 transition"
          >
            <span>Open Artifact Workspace</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentIdx === TOUR_STEPS.length - 1}
            className="px-3 py-1.5 rounded bg-sky-600 text-white font-bold hover:bg-sky-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition"
          >
            Next
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
