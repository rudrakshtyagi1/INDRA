import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Network,
  XCircle,
} from 'lucide-react';

export default function ModelsQA() {

  const EXECUTION_CHAIN = [
    { name: '1. Hydrology', desc: 'Loss separation + Nash cascade', status: 'PARTIALLY CALIBRATED' },
    { name: '2. Theoretical Breach', desc: 'Froehlich parametric geometry', status: 'THEORETICAL' },
    { name: '3. DualSPHysics 5.4', desc: '0–2 km SPH breach collapse', status: 'VERIFIED EXECUTION' },
    { name: '4. Froude Q(t)', desc: '300k m³/s back-scaled transect', status: 'DERIVED' },
    { name: '5. LISFLOOD-FP 8.1', desc: '30 km 2D sub-grid inertial solver', status: 'VERIFIED EXECUTION' },
    { name: '6. Exposure & HADR', desc: 'OSM overlay & Dijkstra routing', status: 'DERIVED' },
  ];

  const SOLVER_MATRIX = [
    {
      name: 'DualSPHysics 5.4 CPU',
      role: 'Near-Field Breach Hydraulics (0–2 km)',
      status: 'VERIFIED EXECUTION',
      statusClass: 'status-tag--verified',
      physics: 'Lagrangian SPH (Wendland kernel, Weakly Compressible)',
      artifacts: 'Surface elevation & discharge transect at dam toe',
      limitations: 'Computationally prohibitive for 30–145 km basin propagation',
      whyActive: 'Captures 3D non-hydrostatic vertical acceleration at breach opening.',
    },
    {
      name: 'LISFLOOD-FP 8.1',
      role: 'Far-Field 2D Inundation Propagation (0–30 km)',
      status: 'VERIFIED EXECUTION',
      statusClass: 'status-tag--verified',
      physics: '2D Sub-Grid Inertial Shallow Water Equations (Bates et al. 2010)',
      artifacts: '61 temporal depth GeoTIFFs, max_depth, arrival_time',
      limitations: 'Depth-averaged ACC build does not write vector velocity field',
      whyActive: 'Verified locally; lightweight raster floodplain solver appropriate for rapid scenario execution; robust mass conservation (0.00023% error).',
    },
    {
      name: 'Delft3D-FM Flexible Mesh',
      role: 'Alternative Far-Field Hydrodynamic Engine',
      status: 'INTEGRATION PATH AVAILABLE / EXECUTABLE NOT AVAILABLE',
      statusClass: 'status-tag--alert',
      physics: 'Unstructured 2D/3D shallow water solver',
      artifacts: 'NONE — ZERO MODEL OUTPUT GENERATED',
      limitations: 'Native Linux compilation blocked by container build complexity and Fortran/C++ toolchain dependencies',
      whyActive: 'Documented integration target only. Architecture prepared, but solver execution is currently blocked.',
    },
    {
      name: 'HEC-RAS 2D (Reference)',
      role: 'Benchmarking Alternative',
      status: 'METHODOLOGY ALTERNATIVE / NOT INTEGRATED',
      statusClass: 'status-tag--neutral',
      physics: 'Diffusion Wave / Full Dynamic Wave 2D',
      artifacts: 'NONE',
      limitations: 'Proprietary Windows GUI native build, not containerized',
      whyActive: 'Evaluated during architecture review as benchmark reference; not selected for automated container execution.',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0B0F19] text-slate-100 overflow-y-auto select-none">
      {/* Top Bar */}
      <div className="bg-[#0F172A] border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-sky-600 rounded flex items-center justify-center font-bold text-white">
            QA
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wider uppercase font-sans">
              Models &amp; Numerical Quality Assurance Console
            </h1>
            <p className="text-[10px] text-slate-400">
              Solver Execution Audits, Numerical Convergence Verification &amp; Architectural Stubs
            </p>
          </div>
        </div>
        <span className="status-tag status-tag--verified">
          CORRECTED V4: NUMERICAL QA PASS (0.00023% MASS ERROR)
        </span>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6 flex-1 text-xs">
        {/* Execution Chain */}
        <div className="border border-slate-800 rounded-lg bg-[#111827] p-4 space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-[10px] font-mono">
            <Network className="w-4 h-4" />
            Physics Execution Chain &amp; Coupling Lineage
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {EXECUTION_CHAIN.map((step, idx) => (
              <React.Fragment key={step.name}>
                <div className="flex-none bg-[#0B0F19] border border-slate-800 rounded p-2.5 min-w-[140px] space-y-1">
                  <div className="text-[11px] font-bold text-white">{step.name}</div>
                  <div className="text-[9px] text-slate-400 leading-tight">{step.desc}</div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-900 text-sky-400 border border-slate-800">
                    {step.status}
                  </span>
                </div>
                {idx < EXECUTION_CHAIN.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Solver Comparison Matrix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              Solver Verification Matrix
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">
              Truth-in-Advertising Standard Enforced
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SOLVER_MATRIX.map((s) => (
              <div
                key={s.name}
                className="border border-slate-800 rounded-lg bg-[#111827] p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white font-sans">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.role}</div>
                    </div>
                    <span className={`status-tag ${s.statusClass}`}>{s.status}</span>
                  </div>

                  <div className="space-y-1 border-t border-slate-800/80 pt-2 text-[11px]">
                    <div className="telemetry-row">
                      <span className="telemetry-row__label">Formulation</span>
                      <span className="telemetry-row__value font-sans text-slate-300">{s.physics}</span>
                    </div>
                    <div className="telemetry-row">
                      <span className="telemetry-row__label">Artifacts</span>
                      <span className="telemetry-row__value font-sans text-slate-300">{s.artifacts}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#0B0F19] border border-slate-800 text-[10px] space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[9px] block">Operational Rationale:</span>
                    <p className="text-slate-300 leading-snug">{s.whyActive}</p>
                    {s.limitations && (
                      <p className="text-slate-500 pt-0.5 leading-snug">
                        <strong className="text-slate-400">Limitation:</strong> {s.limitations}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Explicit Why LISFLOOD-FP is Active & Why Delft3D is Blocked */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-emerald-900/60 rounded-lg bg-emerald-950/20 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Why LISFLOOD-FP 8.1 is Active
            </div>
            <ul className="list-disc list-inside text-[11px] text-emerald-200/90 space-y-1 leading-relaxed">
              <li><strong>Verified Locally:</strong> Precompiled and executed directly inside Linux Docker environment.</li>
              <li><strong>Lightweight Raster Solver:</strong> 2D sub-grid inertial ACC formulation handles complex 30 m Himalayan canyon grids without mesh tangling.</li>
              <li><strong>Verified Mass Conservation:</strong> Corrected V4 run achieved 0.00023% mass conservation error across 3600 seconds.</li>
              <li><strong>Full Temporal Integration:</strong> Outputs 61 real temporal depth GeoTIFF frames directly consumed by the simulation engine.</li>
            </ul>
          </div>

          <div className="border border-red-900/60 rounded-lg bg-red-950/20 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs uppercase font-mono">
              <XCircle className="w-4 h-4 shrink-0" />
              Why Delft3D-FM is Not Currently Executed
            </div>
            <ul className="list-disc list-inside text-[11px] text-red-200/90 space-y-1 leading-relaxed">
              <li><strong>Executable Not Available:</strong> Delft3D Flexible Mesh is an integration target; no native binary is bundled in the container.</li>
              <li><strong>Build Toolchain Complexity:</strong> Requires complex NetCDF, MPI, and Fortran runtime stacks that blocked lightweight container compilation.</li>
              <li><strong>Zero Fabricated Data:</strong> The system maintains strict scientific integrity—no synthetic Delft3D results are ever rendered.</li>
              <li><strong>Integration Path Preserved:</strong> The schema and boundary export contracts are fully documented for future native deployment.</li>
            </ul>
          </div>
        </div>

        {/* Benchmark Diagnostic Log */}
        <div className="border border-slate-800 rounded-lg bg-[#111827] p-4 space-y-3 font-mono">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Numerical QA Audit Telemetry Log</span>
            <span className="text-[10px] text-slate-500">Benchmark Checksum: PASS</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0F19] border-b border-slate-800 text-slate-400 text-[10px]">
                <tr>
                  <th className="p-2">RUN</th>
                  <th className="p-2">DURATION</th>
                  <th className="p-2">DOMAIN</th>
                  <th className="p-2">MASS BALANCE ERR</th>
                  <th className="p-2">NUMERICAL MAX DEPTH</th>
                  <th className="p-2">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px]">
                <tr>
                  <td className="p-2 font-bold text-white">TEHRI_V4_CORRECTED</td>
                  <td className="p-2 text-slate-300">3600 s</td>
                  <td className="p-2 text-slate-300">30 km</td>
                  <td className="p-2 text-emerald-400 font-bold">0.00023%</td>
                  <td className="p-2 text-sky-400">431.41 m</td>
                  <td className="p-2"><span className="status-tag status-tag--verified">PASS</span></td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-white">TEHRI_V3_BENCHMARK</td>
                  <td className="p-2 text-slate-300">800 s</td>
                  <td className="p-2 text-slate-300">15 km</td>
                  <td className="p-2 text-slate-500">N/A (Prototype)</td>
                  <td className="p-2 text-sky-400">27.20 m</td>
                  <td className="p-2"><span className="status-tag status-tag--verified">PASS</span></td>
                </tr>
                <tr className="opacity-50">
                  <td className="p-2 font-bold text-red-400 line-through">TEHRI_V4_INITIAL (Discarded)</td>
                  <td className="p-2">3600 s</td>
                  <td className="p-2">30 km</td>
                  <td className="p-2 text-red-400 font-bold">29.2917%</td>
                  <td className="p-2 text-red-400">15,269 m</td>
                  <td className="p-2"><span className="status-tag status-tag--alert">FAIL (Discarded)</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
