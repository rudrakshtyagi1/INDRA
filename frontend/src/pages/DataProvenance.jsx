import React, { useState } from 'react';
import {
  Database,
  Info,
  PieChart,
  HardDrive,
} from 'lucide-react';

const DATA_OPERATIONS_CATALOG = [
  {
    name: 'Copernicus DEM GLO-30',
    category: 'TERRAIN',
    status: 'AVAILABLE',
    statusClass: 'text-emerald-400 border-emerald-800 bg-emerald-950/60',
    role: 'Hydraulic Bed Topography & Catchment Delineation',
    provenance: 'OBSERVED',
    coverage: '7,300 km² Basin + 30 km Canyon Reach',
    resolution: '30 m raster (EPSG:32644)',
    telemetry: 'Conditioned with stream burning; elevation 450 m to 6,800 m MSL',
  },
  {
    name: 'ECMWF ERA5-Land',
    category: 'METEOROLOGY',
    status: 'AVAILABLE',
    statusClass: 'text-emerald-400 border-emerald-800 bg-emerald-950/60',
    role: 'Hourly Precipitation Forcing for Hydrologic Calibration',
    provenance: 'MODELLED / REANALYSIS',
    coverage: '140 grid cells over Upper Bhagirathi (2024 Monsoon)',
    resolution: '0.1° (~9 km), Hourly',
    telemetry: 'Monsoon Total: 814.66 mm · Peak Intensity: 4.46 mm/hr',
  },
  {
    name: 'CWC Tekhla & Koteshwar Gauges',
    category: 'HYDROLOGY',
    status: 'AVAILABLE',
    statusClass: 'text-emerald-400 border-emerald-800 bg-emerald-950/60',
    role: 'Observed Discharge Reference for Inflow Performance Audit',
    provenance: 'REPORTED',
    coverage: 'Upper Bhagirathi at Tekhla (Gauge #UPP-BHAG-01)',
    resolution: 'Hourly Resampled Mean',
    telemetry: 'Observed Event Peak: 852.93 m³/s (31 Jul 2024 21:00 UTC)',
  },
  {
    name: 'ESA WorldCover 2021',
    category: 'LAND_COVER',
    status: 'AVAILABLE',
    statusClass: 'text-emerald-400 border-emerald-800 bg-emerald-950/60',
    role: 'Land Cover Classification & Roughness Zoning',
    provenance: 'OBSERVED',
    coverage: 'Complete Bhagirathi / Bhilangna Watershed',
    resolution: '10 m Posting (Sentinel-1/2)',
    telemetry: 'Tree: 58.13% · Cropland: 29.11% · Grassland: 6.93% · Built: 3.59%',
  },
  {
    name: 'HydroSHEDS HydroBASINS (L8/L10)',
    category: 'HYDROGRAPHY',
    status: 'AVAILABLE',
    statusClass: 'text-emerald-400 border-emerald-800 bg-emerald-950/60',
    role: 'Catchment Delineation Verification Standard',
    provenance: 'DERIVED',
    coverage: 'Pfafstetter Subbasin Polygons',
    resolution: 'Standard Topographic Drainage Units',
    telemetry: 'IoU Level 10 = 0.9643 · IoU Level 8 = 0.9438',
  },
  {
    name: 'HydroSHEDS HydroRIVERS',
    category: 'HYDROGRAPHY',
    status: 'AVAILABLE',
    statusClass: 'text-emerald-400 border-emerald-800 bg-emerald-950/60',
    role: 'River Centerline Routing & Reach Orders',
    provenance: 'DERIVED',
    coverage: '4,677 River Reaches in Basin',
    resolution: 'Stream Orders 1 to 6',
    telemetry: '4,677 validated segments; confirms Bhagirathi canyon corridor',
  },
  {
    name: 'OpenStreetMap (Geofabrik)',
    category: 'INFRASTRUCTURE',
    status: 'AVAILABLE',
    statusClass: 'text-emerald-400 border-emerald-800 bg-emerald-950/60',
    role: 'Critical Infrastructure, Valley Roads, Healthcare, Bridges',
    provenance: 'REPORTED',
    coverage: 'Uttarakhand State Transportation Graph',
    resolution: 'Vector Lines & Polygons',
    telemetry: '74 road segments inside 30 km reach; zero settlements in gorge',
  },
  {
    name: 'Sentinel-1 SAR (GEE / Copernicus)',
    category: 'REMOTE_SENSING',
    status: 'PROVIDER STANDBY',
    statusClass: 'text-amber-400 border-amber-800 bg-amber-950/60',
    role: 'Bitemporal Microwave Surface Water Change Surveillance',
    provenance: 'OBSERVED',
    coverage: 'Tehri Dam Catchment AOI',
    resolution: '10 m IW GRD (Dual-Pol VV/VH)',
    telemetry: 'GEE Standby: Historical analysis pipeline active; live tokens optional',
  },
];

const LAND_COVER_CLASSES = [
  { name: 'Tree Cover', pct: 58.13, color: 'bg-emerald-500', hex: '#10B981' },
  { name: 'Cropland', pct: 29.11, color: 'bg-amber-500', hex: '#F59E0B' },
  { name: 'Grassland', pct: 6.93, color: 'bg-lime-500', hex: '#84CC16' },
  { name: 'Built-Up / Urban', pct: 3.59, color: 'bg-rose-500', hex: '#EF4444' },
  { name: 'Permanent Water', pct: 1.08, color: 'bg-sky-500', hex: '#38BDF8' },
  { name: 'Bare / Sparse', pct: 0.75, color: 'bg-yellow-600', hex: '#CA8A04' },
  { name: 'Shrubland', pct: 0.37, color: 'bg-purple-500', hex: '#A855F7' },
  { name: 'Herbaceous Wetland', pct: 0.03, color: 'bg-cyan-500', hex: '#06B6D4' },
];

export default function DataProvenance() {
  const getTabFromUrl = () => {
    if (typeof window === 'undefined') return 'catalog';
    let t = new URLSearchParams(window.location.search).get('sub');
    if (t && ['catalog', 'catchment'].includes(t)) return t;
    if (window.location.hash.includes('?')) {
      t = new URLSearchParams(window.location.hash.split('?')[1]).get('sub');
      if (t && ['catalog', 'catchment'].includes(t)) return t;
    }
    return 'catalog';
  };
  const [activeTab, setActiveTab] = useState(getTabFromUrl);

  return (
    <div className="flex flex-col h-full w-full bg-[#0B0F19] text-slate-200 overflow-hidden font-mono text-xs">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-[#111827] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-sky-400" />
          <div>
            <h1 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Data Operations &amp; Catchment Preprocessing Workstation
            </h1>
            <div className="text-[10px] text-slate-400">
              Technical Dataset Registry · API Observability · Catchment Delineation &amp; Land Cover Composition
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded border border-slate-700 bg-slate-900 p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1 rounded text-[10px] font-bold transition ${
                activeTab === 'catalog'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              DATASETS &amp; API CATALOG
            </button>
            <button
              onClick={() => setActiveTab('catchment')}
              className={`px-3 py-1 rounded text-[10px] font-bold transition ${
                activeTab === 'catchment'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CATCHMENT &amp; LAND COVER
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'catalog' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            {/* API Observability Status Bar */}
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-slate-200 text-xs">API OBSERVABILITY &amp; AUTHENTICATION INTEGRITY:</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span>SECRETS EXPOSED: <strong className="text-emerald-400">ZERO (NONE)</strong></span>
                <span>·</span>
                <span>AUTH TOKENS: <strong className="text-emerald-400">SAFE ENVIRONMENT ENCLAVE</strong></span>
                <span>·</span>
                <span>PUBLIC ENDPOINTS: <strong className="text-sky-400">READ-ONLY CATALOG</strong></span>
              </div>
            </div>

            {/* Datasets Table */}
            <div className="border border-slate-800 rounded bg-[#111827] overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#0B0F19] border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Dataset Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Role in FloodLab</th>
                    <th className="py-2.5 px-3">Resolution / Coverage</th>
                    <th className="py-2.5 px-3">Provenance</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-[11px]">
                  {DATA_OPERATIONS_CATALOG.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-4 font-bold text-white">
                        <div>{d.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{d.telemetry}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">{d.category}</td>
                      <td className="py-2.5 px-3 text-slate-300">{d.role}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        <div>{d.resolution}</div>
                        <div className="text-[10px] text-slate-500">{d.coverage}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-sky-400">{d.provenance}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${d.statusClass}`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'catchment' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Catchment Delineation Verification Banner */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-[#111827] border border-slate-800 rounded">
                <div className="text-[10px] text-slate-500 uppercase">Delineated Catchment Area</div>
                <div className="text-base font-bold text-sky-400 mt-1">7,300.30 km²</div>
                <div className="text-[10px] text-slate-400 mt-0.5">pywatershed / Copernicus DEM</div>
              </div>

              <div className="p-4 bg-[#111827] border border-slate-800 rounded">
                <div className="text-[10px] text-slate-500 uppercase">CWC Official Comparison</div>
                <div className="text-base font-bold text-emerald-400 mt-1">~7,287.00 km²</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Area Difference = 0.18%</div>
              </div>

              <div className="p-4 bg-[#111827] border border-slate-800 rounded">
                <div className="text-[10px] text-slate-500 uppercase">HydroBASINS Validation (IoU)</div>
                <div className="text-base font-bold text-sky-400 mt-1">L10: 0.964 · L08: 0.944</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Topographic boundary agreement</div>
              </div>

              <div className="p-4 bg-[#111827] border border-slate-800 rounded">
                <div className="text-[10px] text-slate-500 uppercase">HydroRIVERS Stream Network</div>
                <div className="text-base font-bold text-violet-400 mt-1">4,677 Reaches</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Orders 1–6 river network</div>
              </div>
            </div>

            {/* Land Cover Composition Visual */}
            <div className="p-5 bg-[#111827] border border-slate-800 rounded">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-sky-400" />
                    ESA WorldCover 2021 — Watershed Land-Cover Composition
                  </h3>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    10m Sentinel-1/2 Surface Classification Context (Upper Bhagirathi &amp; Bhilangna Basins)
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-400">
                  CONTEXT / PREPROCESSING DATA ONLY
                </span>
              </div>

              {/* Stacked Horizontal Bar */}
              <div className="h-6 w-full rounded overflow-hidden flex border border-slate-700 mb-5">
                {LAND_COVER_CLASSES.map((c) => (
                  <div
                    key={c.name}
                    className={`${c.color} h-full transition-all relative group`}
                    style={{ width: `${c.pct}%` }}
                    title={`${c.name}: ${c.pct}%`}
                  />
                ))}
              </div>

              {/* Class Breakdown Grid */}
              <div className="grid grid-cols-4 gap-3">
                {LAND_COVER_CLASSES.map((c) => (
                  <div key={c.name} className="p-3 bg-[#0B0F19] border border-slate-800 rounded flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded ${c.color} inline-block shrink-0`} />
                      <span className="text-slate-300 text-[11px]">{c.name}</span>
                    </div>
                    <span className="font-bold text-white">{c.pct.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Information Card */}
            <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded flex items-start gap-2.5">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300 leading-relaxed">
                <span className="font-bold text-slate-100">LAND COVER ROLE IN HYDRODYNAMIC PIPELINE: </span>
                Tree cover (58.13%) and cropland (29.11%) dominate the steep Himalayan slopes, governing the SCS-CN infiltration loss rate (CN = 78) in the hydrology engine.
                The downstream canyon bed is characterized by rock, boulders, and steep gorge channels, adopting an assumed Manning roughness of n = 0.06 in LISFLOOD-FP 8.1.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
