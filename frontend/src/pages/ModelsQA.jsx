import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useRun } from '../context/RunContext';

export default function ModelsQA() {
  const { currentRun } = useRun();

  const MODEL_REGISTRY = [
    {
      id: 'dualsphysics',
      name: 'DualSPHysics 5.4 CPU',
      category: 'Near-Field Hydrodynamics',
      status: 'VERIFIED EXECUTION',
      statusColor: 'emerald',
      description:
        '3D Smoothed Particle Hydrodynamics (SPH) solver capturing non-hydrostatic violent dam-break wave front collapse within 0–2 km gorge.',
      metrics: [
        { label: 'Domain Window', value: '0–2 km Gorge' },
        { label: 'Coupled Peak Q', value: '300,000 m³/s (Froude back-scaled)' },
        { label: 'Physics Formulation', value: 'Weakly Compressible SPH (Wendland kernel)' },
      ],
      provenance: 'MODELLED / NEAR-FIELD SPH RUN',
    },
    {
      id: 'lisflood',
      name: 'LISFLOOD-FP 8.1 (ACC)',
      category: 'Far-Field 2D Hydraulic Propagation',
      status: 'VERIFIED EXECUTION',
      statusColor: 'emerald',
      description:
        '2D sub-grid inertial formulation solving depth-averaged shallow water equations over complex Himalayan valley topography.',
      metrics: [
        { label: 'Domain Reach', value: `${currentRun.domain_km} km` },
        { label: 'Grid Resolution', value: '30 m (Copernicus DEM-derived)' },
        { label: 'Simulation Window', value: `${currentRun.simulation_window_s} s` },
        { label: 'Friction Roughness', value: 'Uniform Manning n = 0.06' },
      ],
      provenance: 'MODELLED / 2D SUB-GRID ACC',
    },
    {
      id: 'v4_numerical_qa',
      name: 'Corrected V4 Extended Run QA',
      category: 'Numerical Stability & Mass Conservation',
      status: 'NUMERICAL QA PASS',
      statusColor: 'emerald',
      description:
        'Rigorous mass balance and boundary geometry verification. The initial V4 run exhibited 29.29% mass balance error due to row/col crop misalignment; Corrected V4 resolved this completely.',
      metrics: [
        { label: 'Mass Conservation Error', value: '0.00023% (PASS)' },
        { label: 'Numerical Max Depth', value: '431.41 m (Benchmark metric)' },
        { label: 'Boundary QA', value: 'PASS (9 valley-floor inflow cells aligned)' },
        { label: 'Temporal Frames', value: '61 real GeoTIFF frames (60s interval)' },
      ],
      provenance: 'VERIFIED POST-PROCESS ARTIFACT',
    },
    {
      id: 'hydrology',
      name: 'Conceptual Event Hydrology',
      category: 'Catchment Rainfall-Runoff',
      status: 'PARTIALLY CALIBRATED / PARAMETER-FITTED',
      statusColor: 'amber',
      description:
        'Conceptual event rainfall-runoff engine incorporating loss separation, Nash linear reservoir cascade, and linear baseflow recession.',
      metrics: [
        { label: 'Runoff Formulation', value: 'Event Loss Separation + Nash Cascade' },
        { label: 'Calibration State', value: 'Parameter-Fitted to Bhagirathi gauge context' },
        { label: 'Breach Coupling', value: 'Separate theoretical source model' },
      ],
      provenance: 'CONCEPTUAL MODEL / PARAMETER FITTED',
    },
    {
      id: 'delft3d',
      name: 'Delft3D-FM Flexible Mesh',
      category: '2D Hydrodynamic Solver',
      status: 'INTEGRATION PATH / EXECUTABLE NOT AVAILABLE',
      statusColor: 'slate',
      description:
        'Integration architectural target for flexible unstructured mesh modelling. Currently blocked by native compilation build complexity in container environment.',
      metrics: [
        { label: 'Execution State', value: 'Executable NOT Available in runtime' },
        { label: 'Output Artifacts', value: 'NONE (Zero synthetic output presented)' },
        { label: 'Architectural Role', value: 'Documented future integration path' },
      ],
      provenance: 'STUB / ARCHITECTURAL TARGET ONLY',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-y-auto">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Models &amp; Numerical Quality Assurance
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Active: {currentRun.shortName}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Truthful accounting of executable solver builds, numerical verification thresholds, and architectural integration stubs.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6 flex-1">
        {/* Verification Summary Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-xs text-emerald-900 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">NUMERICAL INTEGRITY POLICY: </span>
            <p className="leading-relaxed text-emerald-800">
              FloodLab explicitly distinguishes executed physics solvers from unbuilt integration stubs. DualSPHysics and LISFLOOD-FP 8.1 have completed verified container runs. Delft3D-FM is truthfully reported as an unexecuted integration target.
            </p>
          </div>
        </div>

        {/* Solver Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MODEL_REGISTRY.map((model) => (
            <div
              key={model.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {model.category}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5">{model.name}</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0 border ${
                      model.statusColor === 'emerald'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : model.statusColor === 'amber'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {model.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {model.description}
                </p>

                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
                  {model.metrics.map((m) => (
                    <div key={m.label} className="flex justify-between">
                      <span className="text-slate-400">{m.label}:</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-800">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>PROVENANCE:</span>
                <span className="font-semibold text-slate-600">{model.provenance}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Numerical QA Audit Diagnostic Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            LISFLOOD-FP Benchmark Diagnostic Log Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-mono text-[11px]">
                <tr>
                  <th className="p-2.5">Run Identifier</th>
                  <th className="p-2.5">Duration</th>
                  <th className="p-2.5">Domain Reach</th>
                  <th className="p-2.5">Mass Balance Err</th>
                  <th className="p-2.5">Max Numerical Depth</th>
                  <th className="p-2.5">QA Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-800">TEHRI_V4_CORRECTED</td>
                  <td className="p-2.5">3600 s</td>
                  <td className="p-2.5">30 km</td>
                  <td className="p-2.5 text-emerald-600 font-bold">0.00023%</td>
                  <td className="p-2.5 text-blue-600">431.41 m</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      PASS
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-800">TEHRI_V3_BENCHMARK</td>
                  <td className="p-2.5">800 s</td>
                  <td className="p-2.5">15 km</td>
                  <td className="p-2.5 text-slate-400">N/A (Prototype)</td>
                  <td className="p-2.5 text-blue-600">27.2 m</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      PASS
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 opacity-60">
                  <td className="p-2.5 font-bold text-red-800 line-through">TEHRI_V4_INITIAL (Discarded)</td>
                  <td className="p-2.5">3600 s</td>
                  <td className="p-2.5">30 km</td>
                  <td className="p-2.5 text-red-600 font-bold">29.2917%</td>
                  <td className="p-2.5 text-red-600">15,269 m</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                      FAIL (Discarded)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
