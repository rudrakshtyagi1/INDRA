import React, { useState, useEffect } from 'react';
import {
  Mountain,
  Layers,
  Gauge,
  Cpu,
  CheckCircle2,
  Play,
  RefreshCw,
  Info,
} from 'lucide-react';
import Drawer from '../common/Drawer';
import ProvenanceBadge from '../common/ProvenanceBadge';
import { api } from '../../services/api';
import { formatFinite } from '../../utils/units';

export default function ScenarioDrawer({
  isOpen,
  onClose,
  selectedPreset,
  presets = [],
  onSelectPreset,
  onRunSimulation,
  isSimulating,
}) {
  const [activeTab, setActiveTab] = useState('geometry');
  const [formData, setFormData] = useState({
    dam_name: 'Tehri Dam (Bhagirathi River)',
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
    solver_type: 'coupled',
    breach_model: 'auto',
  });

  const [breachResult, setBreachResult] = useState(null);
  const [isCalculatingBreach, setIsCalculatingBreach] = useState(false);

  useEffect(() => {
    if (selectedPreset) {
      const updated = {
        dam_name: selectedPreset.name || selectedPreset.dam_name || 'Tehri Dam',
        dam_type: selectedPreset.dam_type || 'rockfill',
        dam_height_m: selectedPreset.dam_height_m || 260.5,
        reservoir_volume_m3: selectedPreset.reservoir_volume_m3 || 3540000000.0,
        hydraulic_head_m: selectedPreset.hydraulic_head_m || 260.0,
        crest_length_m: selectedPreset.crest_length_m || 575.0,
        breach_mode: selectedPreset.breach_mode || 'overtopping',
        reach_length_km: selectedPreset.reach_length_km || 100.0,
        valley_width_m: selectedPreset.valley_width_m || 450.0,
        bed_slope: selectedPreset.bed_slope || 0.0055,
        manning_n: selectedPreset.manning_n || 0.042,
        valley_type: selectedPreset.valley_type || 'mountain_gorge',
        solver_type: 'coupled',
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
    if (
      [
        'dam_height_m',
        'reservoir_volume_m3',
        'hydraulic_head_m',
        'crest_length_m',
        'breach_mode',
        'dam_type',
        'breach_model',
      ].includes(field)
    ) {
      recalcBreach(nextData);
    }
  };

  const handleRun = () => {
    onRunSimulation({
      scenario_id: selectedPreset?.id,
      preset_id: selectedPreset?.id,
      custom_params: formData,
      solver_type: formData.solver_type,
      breach_model: formData.breach_model,
    });
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Scenario & Solver Configuration"
      subtitle="Configure physical dam parameters, empirical breach formulations, and solver parameters."
      width="max-w-2xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={isSimulating}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs flex items-center gap-2 transition disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Solver...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Execute Scenario</span>
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Preset Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Base Scenario Preset
          </label>
          <select
            value={selectedPreset?.id || ''}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500 transition"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.river || 'Himalayan Basin'})
              </option>
            ))}
          </select>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-2">
          {[
            { id: 'geometry', label: 'Dam & Reservoir', icon: Mountain },
            { id: 'hydraulics', label: 'Valley & Friction', icon: Layers },
            { id: 'breach', label: 'Breach Mechanics', icon: Gauge },
            { id: 'solver', label: 'Solvers & Coupling', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition ${
                  isActive
                    ? 'border-cyan-400 text-cyan-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Dam & Reservoir Geometry */}
        {activeTab === 'geometry' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Dam Structure Name</label>
              <input
                type="text"
                value={formData.dam_name}
                onChange={(e) => handleInputChange('dam_name', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Dam Type <ProvenanceBadge level="REPORTED" />
                </label>
                <select
                  value={formData.dam_type}
                  onChange={(e) => handleInputChange('dam_type', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="rockfill">Embankment (Earth / Rockfill)</option>
                  <option value="concrete_gravity">Concrete Gravity Dam</option>
                  <option value="arch_dam">Concrete Arch Dam</option>
                  <option value="landslide_dam">Natural Landslide Dam</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Structural Height ($h_d$) [m]
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.dam_height_m}
                  onChange={(e) => handleInputChange('dam_height_m', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Hydraulic Head ($h_w$) [m]
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.hydraulic_head_m}
                  onChange={(e) => handleInputChange('hydraulic_head_m', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Reservoir Storage (Vw) [m³]
                </label>
                <input
                  type="number"
                  step="1000000"
                  value={formData.reservoir_volume_m3}
                  onChange={(e) => handleInputChange('reservoir_volume_m3', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {formatFinite(formData.reservoir_volume_m3 / 1e9, 2)} BCM
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hydraulics & Valley Friction */}
        {activeTab === 'hydraulics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Reach Length [km]
                </label>
                <input
                  type="number"
                  value={formData.reach_length_km}
                  onChange={(e) => handleInputChange('reach_length_km', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Mean Valley Width [m]
                </label>
                <input
                  type="number"
                  value={formData.valley_width_m}
                  onChange={(e) => handleInputChange('valley_width_m', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Bed Slope (S0) [m/m]
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.bed_slope}
                  onChange={(e) => handleInputChange('bed_slope', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Manning Friction Roughness (n) <ProvenanceBadge level="ASSUMED" />
                </label>
                <input
                  type="number"
                  step="0.002"
                  value={formData.manning_n}
                  onChange={(e) => handleInputChange('manning_n', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Breach Mechanics */}
        {activeTab === 'breach' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Breach Mode</label>
                <select
                  value={formData.breach_mode}
                  onChange={(e) => handleInputChange('breach_mode', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="overtopping">Overtopping Failure</option>
                  <option value="piping">Internal Erosion / Piping</option>
                  <option value="instantaneous">Instantaneous Collapse (Ritter)</option>
                  <option value="landslide_outburst">Landslide Outburst</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Breach Formulation</label>
                <select
                  value={formData.breach_model}
                  onChange={(e) => handleInputChange('breach_model', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="auto">Auto-Select (Froehlich 2008)</option>
                  <option value="froehlich">Froehlich (2008)</option>
                  <option value="macdonald">MacDonald &amp; Langridge (1984)</option>
                  <option value="von_thun">Von Thun &amp; Gillette (1990)</option>
                  <option value="ritter">Ritter (1892) Instantaneous</option>
                </select>
              </div>
            </div>

            {/* Dynamic Breach Calculation Card */}
            {breachResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    Empirical Breach Estimates ({breachResult.model_used})
                  </span>
                  <ProvenanceBadge level="MODELLED" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Breach Width</span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {formatFinite(breachResult.avg_breach_width_m, 1)} m
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Formation Time</span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {formatFinite(breachResult.breach_formation_time_hrs, 2)} hrs
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Peak Qp</span>
                    <span className="text-xs font-mono font-bold text-red-400">
                      {formatFinite(breachResult.peak_discharge_m3s, 0)} m³/s
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Solver & Coupling */}
        {activeTab === 'solver' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Hydrodynamic Solver Architecture</label>
              <select
                value={formData.solver_type}
                onChange={(e) => handleInputChange('solver_type', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="coupled">Coupled: DualSPHysics (Near) → Q(t) → Delft3D FM (Far)</option>
                <option value="sph">DualSPHysics 3D Particle Solver Only</option>
                <option value="delft3d">Delft3D Flexible Mesh SWE Solver Only</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
              <span className="font-semibold text-slate-300 block">Coupling Transect Interface:</span>
              <p className="font-mono text-[11px] text-cyan-400">
                Q(t) = ∫ v·n dA (x = 2.0 km)
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Volumetric mass flux extracted from Lagrangian SPH particle transects is resampled into uniform D-Flow FM boundary conditions (.ext / .tim) with strict mass conservation checks.
              </p>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
