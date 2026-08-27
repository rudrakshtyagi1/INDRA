import React, { useState, useEffect } from 'react';
import { Mountain, Layers, Gauge, Cpu, CheckCircle2, Play, Sliders, Info, Zap } from 'lucide-react';
import { api } from '../services/api';

export default function ScenarioBuilder({
  presets,
  selectedPreset,
  onSelectPreset,
  onRunSimulation,
  isSimulating
}) {
  const [formData, setFormData] = useState({
    dam_name: 'Tehri Dam (Bhagirathi River, Uttarakhand)',
    dam_type: 'rockfill',
    dam_height_m: 260.5,
    reservoir_volume_m3: 3540000000.0,
    hydraulic_head_m: 260.0,
    crest_length_m: 575.0,
    breach_mode: 'overtopping',
    reach_length_km: 100.0,
    valley_width_m: 450.0,
    bed_slope: 0.0055,
    manning_n: 0.042,
    valley_type: 'mountain_gorge',
    solver_type: 'dual',
    breach_model: 'auto',
  });

  const [breachResult, setBreachResult] = useState(null);
  const [isCalculatingBreach, setIsCalculatingBreach] = useState(false);

  // Sync with selected preset
  useEffect(() => {
    if (selectedPreset) {
      const updated = {
        dam_name: selectedPreset.name,
        dam_type: selectedPreset.dam_type || 'earthen',
        dam_height_m: selectedPreset.dam_height_m || 45.0,
        reservoir_volume_m3: selectedPreset.reservoir_volume_m3 || 5400000.0,
        hydraulic_head_m: selectedPreset.hydraulic_head_m || 40.0,
        crest_length_m: selectedPreset.crest_length_m || 200.0,
        breach_mode: selectedPreset.breach_mode || 'overtopping',
        reach_length_km: selectedPreset.reach_length_km || 25.0,
        valley_width_m: selectedPreset.valley_width_m || 200.0,
        bed_slope: selectedPreset.bed_slope || 0.015,
        manning_n: selectedPreset.manning_n || 0.040,
        valley_type: selectedPreset.valley_type || 'mountain_gorge',
        solver_type: 'dual',
        breach_model: 'auto',
      };
      setFormData(updated);
      recalcBreach(updated);
    }
  }, [selectedPreset]);

  const recalcBreach = async (data) => {
    setIsCalculatingBreach(true);
    try {
      const res = await api.calculateBreach({
        dam_name: data.dam_name,
        dam_type: data.dam_type,
        dam_height_m: Number(data.dam_height_m),
        reservoir_volume_m3: Number(data.reservoir_volume_m3),
        hydraulic_head_m: Number(data.hydraulic_head_m),
        crest_length_m: Number(data.crest_length_m),
        breach_mode: data.breach_mode,
        model_override: data.breach_model,
      });
      setBreachResult(res);
    } catch (err) {
      console.error('Breach calculation error:', err);
    } finally {
      setIsCalculatingBreach(false);
    }
  };

  const handleInputChange = (field, value) => {
    const nextData = { ...formData, [field]: value };
    setFormData(nextData);
    if (['dam_height_m', 'reservoir_volume_m3', 'hydraulic_head_m', 'crest_length_m', 'breach_mode', 'dam_type', 'breach_model'].includes(field)) {
      recalcBreach(nextData);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onRunSimulation({
      preset_id: selectedPreset?.id,
      custom_params: formData,
      solver_type: formData.solver_type,
      breach_model: formData.breach_model,
    });
  };

  // Render SVG Hydrograph Preview
  const renderHydrographSVG = () => {
    if (!breachResult?.breach_hydrograph_time_hrs?.length) return null;
    const times = breachResult.breach_hydrograph_time_hrs;
    const flows = breachResult.breach_hydrograph_discharge_m3s;
    const maxFlow = Math.max(...flows, 10.0);
    const maxTime = Math.max(...times, 1.0);

    const w = 400;
    const h = 140;
    const padding = 25;

    const points = times.map((t, i) => {
      const x = padding + (t / maxTime) * (w - 2 * padding);
      const y = h - padding - (flows[i] / maxFlow) * (h - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative bg-slate-950 p-3 rounded-lg border border-slate-800">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Peak Outflow: <strong className="text-cyan-400">{breachResult.peak_discharge_m3s?.toLocaleString()} m³/s</strong></span>
          <span>Time to Peak: <strong className="text-cyan-400">{breachResult.time_to_peak_hrs} hrs</strong></span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32 overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="#334155" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={h - padding} stroke="#334155" strokeWidth="1" />

          {/* Fill area under curve */}
          <polygon
            points={`${padding},${h - padding} ${points} ${w - padding},${h - padding}`}
            fill="url(#hydroGrad)"
            opacity="0.35"
          />

          {/* Hydrograph Curve */}
          <polyline
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="hydroGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>0 hrs</span>
          <span>Formation Time: {breachResult.breach_formation_time_hrs} hrs</span>
          <span>{maxTime.toFixed(1)} hrs</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner / Preset Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <Mountain className="w-5 h-5 text-cyan-400" />
              <span>Indian Dam & River Reach Benchmarks</span>
            </h2>
            <p className="text-xs text-slate-400">Select a real historical or hypothetical scenario or customize parameters below.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {presets.map((preset) => {
            const isSelected = selectedPreset?.id === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                className={`cursor-pointer p-3.5 rounded-xl border transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-950'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  </div>
                )}
                <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                  {preset.state}
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-1 leading-snug">
                  {preset.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                  {preset.description}
                </p>
                <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    Height: {preset.dam_height_m}m
                  </span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    Vol: {(preset.reservoir_volume_m3 / 1e6).toFixed(1)} Mm³
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form & Configuration */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dam Geometry & Reservoir */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Dam & Reservoir Parameters</span>
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Scenario / Dam Name</label>
            <input
              type="text"
              value={formData.dam_name}
              onChange={(e) => handleInputChange('dam_name', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Dam Structure Type</label>
              <select
                value={formData.dam_type}
                onChange={(e) => handleInputChange('dam_type', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="earthen">Earthen Embankment</option>
                <option value="rockfill">Rockfill Dam</option>
                <option value="concrete_gravity">Concrete Gravity</option>
                <option value="landslide_dam">Landslide-Dammed Lake</option>
                <option value="arch">Arch Dam</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Breach Mode</label>
              <select
                value={formData.breach_mode}
                onChange={(e) => handleInputChange('breach_mode', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="overtopping">Overtopping Failure</option>
                <option value="piping">Internal Piping Erosion</option>
                <option value="instantaneous">Instantaneous Collapse</option>
                <option value="landslide_outburst">Landslide Debris Outburst</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Dam Height (m)</label>
              <input
                type="number"
                step="0.5"
                value={formData.dam_height_m}
                onChange={(e) => handleInputChange('dam_height_m', parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Hydraulic Head (m)</label>
              <input
                type="number"
                step="0.5"
                value={formData.hydraulic_head_m}
                onChange={(e) => handleInputChange('hydraulic_head_m', parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reservoir Storage (m³)</label>
              <input
                type="number"
                step="100000"
                value={formData.reservoir_volume_m3}
                onChange={(e) => handleInputChange('reservoir_volume_m3', parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">{(formData.reservoir_volume_m3 / 1e6).toFixed(2)} Million m³</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Crest Length (m)</label>
              <input
                type="number"
                step="10"
                value={formData.crest_length_m}
                onChange={(e) => handleInputChange('crest_length_m', parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Valley / River Reach Settings */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300">Downstream Reach Setup</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Reach Length (km)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.reach_length_km}
                  onChange={(e) => handleInputChange('reach_length_km', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Bed Slope (m/m)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.bed_slope}
                  onChange={(e) => handleInputChange('bed_slope', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Empirical Breach Mechanics & Hydrograph */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>Breach Mechanics & Outflow</span>
            </h3>
            <span className="text-[11px] text-cyan-400 font-mono">
              {breachResult?.model_used || 'Computing...'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Breach Model Formulation</label>
            <select
              value={formData.breach_model}
              onChange={(e) => handleInputChange('breach_model', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="auto">Auto Select (Recommended)</option>
              <option value="froehlich">Froehlich (2008)</option>
              <option value="macdonald">MacDonald & Langridge-Monopolis (1984)</option>
              <option value="von_thun">Von Thun & Gillette (1990)</option>
              <option value="ritter">Ritter Analytical Solution</option>
              <option value="landslide">Costa & Schuster / Walder (LDOF)</option>
            </select>
          </div>

          {/* Breach Metrics Grid */}
          {breachResult && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Avg Breach Width</span>
                <span className="text-sm font-bold text-slate-100">{breachResult.avg_breach_width_m} m</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Formation Time</span>
                <span className="text-sm font-bold text-slate-100">{breachResult.breach_formation_time_hrs} hrs</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Peak Discharge (Qp)</span>
                <span className="text-sm font-bold text-cyan-400">{breachResult.peak_discharge_m3s?.toLocaleString()} m³/s</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Side Slope (z:1)</span>
                <span className="text-sm font-bold text-slate-100">{breachResult.side_slope_z} : 1</span>
              </div>
            </div>
          )}

          {/* Hydrograph Chart */}
          <div>
            <span className="text-xs font-semibold text-slate-300 block mb-1">Synthesized Inflow Hydrograph</span>
            {renderHydrographSVG()}
          </div>
        </div>

        {/* Right Column: Hydrodynamic Engine Selection & Launch */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Simulation Engine Mode</span>
            </h3>

            <div className="space-y-3">
              {/* Coupled Mode Card */}
              <div
                onClick={() => handleInputChange('solver_type', 'coupled')}
                className={`cursor-pointer p-3 rounded-xl border transition-all ${
                  formData.solver_type === 'coupled'
                    ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-purple-300 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span>SPH → Delft3D Coupled Solver</span>
                  </span>
                  <span className="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded">
                    Coupled Hydrograph
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  SPH resolves violent near-field breach hydraulics ($0–2\text{ km}$), extracting $Q(t)$ at coupling boundary to feed directly into Delft3D FM far-field propagation.
                </p>
              </div>

              {/* Dual Mode Card */}
              <div
                onClick={() => handleInputChange('solver_type', 'dual')}
                className={`cursor-pointer p-3 rounded-xl border transition-all ${
                  formData.solver_type === 'dual'
                    ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Dual Parallel Engine Comparison</span>
                  </span>
                  <span className="text-[10px] bg-cyan-900/60 text-cyan-300 px-1.5 py-0.5 rounded">
                    SPH + Delft3D
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Executes both particle WCSPH and flexible mesh 2D SWE solvers concurrently to generate CSI co-registration and difference heatmaps.
                </p>
              </div>

              {/* SPH Only */}
              <div
                onClick={() => handleInputChange('solver_type', 'sph')}
                className={`cursor-pointer p-3 rounded-xl border transition-all ${
                  formData.solver_type === 'sph'
                    ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">Smoothed Particle Hydrodynamics (SPH)</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Lagrangian</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Mesh-free WCSPH for high-velocity surge fronts, steep Himalayan debris avalanches, and shockwaves.
                </p>
              </div>

              {/* Delft3D Only */}
              <div
                onClick={() => handleInputChange('solver_type', 'delft3d')}
                className={`cursor-pointer p-3 rounded-xl border transition-all ${
                  formData.solver_type === 'delft3d'
                    ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">Delft3D Flexible Mesh / 2D SWE</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Eulerian Mesh</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Conservative Finite Volume Shallow Water Equations with wet/dry front tracking and Manning roughness.
                </p>
              </div>
            </div>
          </div>

          {/* Launch Button */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSimulating}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg transition-all ${
                isSimulating
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 glow-cyan'
              }`}
            >
              <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : 'fill-slate-950'}`} />
              <span>{isSimulating ? 'Running Hydrodynamic Physics...' : 'Launch Simulation Run'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
