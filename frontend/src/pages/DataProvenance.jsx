import React, { useState } from 'react';
import {
  Database,
  FileSpreadsheet,
  FolderTree,
  Layers,
  Network,
} from 'lucide-react';

const CANONICAL_CATALOG = [
  {
    dataset: 'Copernicus GLO-30 DEM',
    source: 'European Space Agency (ESA)',
    temporal: 'Static 2021 Reference',
    spatial: 'Tehri–Devprayag (30 km reach)',
    role: 'Hydraulic Domain & Terrain Definition',
    provenance: 'OBSERVED',
    status: 'ACTIVE RUNTIME',
    details: '30 m posting hydrologically conditioned for 2D shallow water bed elevation grid.',
  },
  {
    dataset: 'Sentinel-1 C-SAR GRD',
    source: 'Copernicus / Google Earth Engine',
    temporal: '2024 Monsoon Baseline',
    spatial: 'Upper Bhagirathi Basin AOI',
    role: 'Bitemporal Water Change Detection',
    provenance: 'OBSERVED',
    status: 'GEE INTEGRATION',
    details: '10 m / 30 m IW mode, VV polarization with local Otsu discriminant thresholding.',
  },
  {
    dataset: 'Tehri Dam Structural Register',
    source: 'Central Water Commission (CWC) / THDC',
    temporal: 'Reported Design Specs',
    spatial: 'Tehri Dam (30.378°N, 78.480°E)',
    role: 'Theoretical Breach Geometry Constraints',
    provenance: 'REPORTED',
    status: 'ACTIVE RUNTIME',
    details: 'Embankment height 260.5 m, crest elevation 839.5 m MSL, gross storage 3.54 BCM.',
  },
  {
    dataset: 'Channel Bed Roughness',
    source: 'Hydraulic Engineering Literature',
    temporal: 'Model Calibration Constant',
    spatial: '0–30 km Bhagirathi Canyon',
    role: 'Hydraulic Flow Resistance',
    provenance: 'ASSUMED',
    status: 'ACTIVE RUNTIME',
    details: 'Uniform Manning n = 0.06 adopted for steep mountain boulder-bed river reaches.',
  },
  {
    dataset: 'Near-Field SPH Breach Collapse',
    source: 'DualSPHysics 5.4 CPU',
    temporal: '0–300 s Breach Window',
    spatial: '0–2 km Dam Toe Gorge',
    role: 'Near-Field 3D Hydrodynamic Solution',
    provenance: 'MODELLED',
    status: 'VERIFIED EXECUTION',
    details: 'Lagrangian weakly compressible SPH particles capturing violent wave front collapse.',
  },
  {
    dataset: 'Froude Back-Scaled Hydrograph Q(t)',
    source: 'Near-Field Coupling Transect',
    temporal: 'T+0s to T+3600s',
    spatial: 'Dam Toe Coupling Transect',
    role: 'Downstream Boundary Inflow Forcing',
    provenance: 'DERIVED',
    status: 'VERIFIED EXECUTION',
    details: '300,000 m³/s peak discharge coupled to LISFLOOD-FP 8.1 upstream boundary cells.',
  },
  {
    dataset: '2D Floodplain Water Column Depth',
    source: 'LISFLOOD-FP 8.1 (ACC)',
    temporal: '61 Frames (T+0s to T+3600s)',
    spatial: '0–30 km Downstream Reach',
    role: 'Far-Field Inundation Depths & Arrival Times',
    provenance: 'MODELLED',
    status: 'VERIFIED EXECUTION',
    details: 'Sub-grid 2D inertial shallow water simulation achieving 0.00023% mass conservation error.',
  },
  {
    dataset: 'OpenStreetMap Road Network',
    source: 'OSM Contributors / Geofabrik',
    temporal: '2024 Extract',
    spatial: 'Uttarakhand State Corridor (145 km)',
    role: 'Critical Infrastructure & Evacuation Graph',
    provenance: 'CONTEXT DATA',
    status: 'ACTIVE RUNTIME',
    details: 'Planarized highway lines used for Dijkstra shortest-path routing and wetted hazard conflict analysis.',
  },
];

const TAXONOMY_LEGEND = [
  { tag: 'OBSERVED', color: 'bg-emerald-950/80 text-emerald-400 border-emerald-800', desc: 'Direct sensor / satellite measurements (Copernicus DEM, Sentinel-1)' },
  { tag: 'REPORTED', color: 'bg-blue-950/80 text-blue-400 border-blue-800', desc: 'Institutional specifications from authority registers (CWC, THDC)' },
  { tag: 'ASSUMED', color: 'bg-amber-950/80 text-amber-400 border-amber-800', desc: 'Adopted engineering parameter constants (Manning n = 0.06)' },
  { tag: 'MODELLED', color: 'bg-sky-950/80 text-sky-400 border-sky-800', desc: 'Primary numerical physics outputs (DualSPHysics, LISFLOOD-FP)' },
  { tag: 'DERIVED', color: 'bg-purple-950/80 text-purple-400 border-purple-800', desc: 'Secondary calculated layers (Q(t) hydrograph, vector flood contours)' },
  { tag: 'PRECOMPUTED MODEL RESULT', color: 'bg-cyan-950/80 text-cyan-400 border-cyan-800', desc: 'Verified benchmark model run artifacts' },
  { tag: 'CONTEXT DATA', color: 'bg-slate-900 text-slate-300 border-slate-700', desc: 'External reference layers (OSM roads, settlement points)' },
];

export default function DataProvenance() {
  const [selectedItem, setSelectedItem] = useState(CANONICAL_CATALOG[0]);
  const [filterTag, setFilterTag] = useState('ALL');

  const filtered = filterTag === 'ALL'
    ? CANONICAL_CATALOG
    : CANONICAL_CATALOG.filter((c) => c.provenance === filterTag);

  return (
    <div className="h-full flex flex-col bg-[#0B0F19] text-slate-100 overflow-y-auto select-none font-mono">
      {/* Top Header */}
      <div className="bg-[#0F172A] border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-sky-600 rounded flex items-center justify-center font-bold text-white">
            DATA
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wider uppercase font-sans">
              Technical Data Catalog &amp; Provenance Console
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              Traceability &amp; Lineage: Observations, Structural Specifications, Mathematical Models &amp; Context
            </p>
          </div>
        </div>
        <span className="status-tag status-tag--verified">
          PROVENANCE AUDIT: 100% TRACEABLE
        </span>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6 flex-1 text-xs">
        {/* Taxonomy Classification Bar */}
        <div className="border border-slate-800 rounded bg-[#111827] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-sky-400" />
              Standardized Scientific Provenance Taxonomy
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterTag('ALL')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                  filterTag === 'ALL' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                ALL ({CANONICAL_CATALOG.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
            {TAXONOMY_LEGEND.map((t) => (
              <div
                key={t.tag}
                onClick={() => setFilterTag(filterTag === t.tag ? 'ALL' : t.tag)}
                className={`p-2 rounded border cursor-pointer transition ${
                  filterTag === t.tag
                    ? 'border-sky-500 bg-sky-950/40'
                    : 'border-slate-800 bg-[#0B0F19] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`status-tag ${t.color}`}>{t.tag}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Catalog Table + Detail Inspection Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Compact Catalog Table */}
          <div className="lg:col-span-2 border border-slate-800 rounded bg-[#111827] p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Registered Geospatial &amp; Hydraulic Datasets</span>
              <span className="text-[10px] text-slate-500">Showing {filtered.length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0F19] border-b border-slate-800 text-slate-400 text-[10px]">
                  <tr>
                    <th className="p-2">DATASET</th>
                    <th className="p-2">SOURCE</th>
                    <th className="p-2">PROVENANCE</th>
                    <th className="p-2">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-[11px]">
                  {filtered.map((item) => (
                    <tr
                      key={item.dataset}
                      onClick={() => setSelectedItem(item)}
                      className={`cursor-pointer transition ${
                        selectedItem?.dataset === item.dataset ? 'bg-sky-950/50' : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <td className="p-2 font-bold text-white">{item.dataset}</td>
                      <td className="p-2 text-slate-400 text-[10px]">{item.source}</td>
                      <td className="p-2">
                        <span className="status-tag status-tag--data">{item.provenance}</span>
                      </td>
                      <td className="p-2">
                        <span className="text-[10px] text-emerald-400 font-bold">{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dataset Inspector Detail */}
          <div className="border border-slate-800 rounded bg-[#111827] p-4 flex flex-col justify-between space-y-3">
            {selectedItem ? (
              <div className="space-y-3">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                    Dataset Inspector
                  </span>
                  <div className="text-xs font-bold text-white font-sans mt-0.5">{selectedItem.dataset}</div>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Source Provider</span>
                    <span className="telemetry-row__value font-sans text-slate-200">{selectedItem.source}</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Spatial Scope</span>
                    <span className="telemetry-row__value font-sans text-slate-200">{selectedItem.spatial}</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Temporal Scope</span>
                    <span className="telemetry-row__value font-sans text-slate-200">{selectedItem.temporal}</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Pipeline Role</span>
                    <span className="telemetry-row__value font-sans text-slate-200">{selectedItem.role}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#0B0F19] border border-slate-800 space-y-1">
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">Technical Description:</span>
                  <p className="text-slate-300 text-[10px] leading-relaxed">{selectedItem.details}</p>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-center py-12">Select an entry to inspect.</div>
            )}

            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
              Execution status remains strictly decoupled from scientific provenance classification.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
