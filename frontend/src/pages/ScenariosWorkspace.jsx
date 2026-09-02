import React, { useState, useEffect } from 'react';
import {
  Layers, Plus, FileText, CheckCircle2, AlertTriangle, AlertCircle,
  Upload, X, Play, Clock, ArrowRight, ArrowLeft, RefreshCw, BarChart2
} from 'lucide-react';
import ExportMenu from '../components/ExportMenu';

export default function ScenariosWorkspace({ onNavigate }) {
  const [view, setView] = useState('registry'); // registry, wizard, run_details
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);

  // Wizard State
  const [step, setStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    source_type: '',
    name: '', river: '', dam_name: '', state: '', latitude: '', longitude: '',
    dem_type: 'existing', dem_filename: '', dem_file: null,
    hydro_type: 'upload', hydro_filename: '', hydrograph_timestamps: [], hydrograph_discharges: [],
    // Engineered Dam Break
    dam_height: '', reservoir_storage: '', breach_width: '', breach_time: '',
    // Natural River Blockage
    impounded_volume_m3: '', blockage_height_m: '', blockage_breach_width_m: '',
    failure_duration_s: '', upstream_water_depth_m: '',
    // Controlled Release
    release_start_time_s: 0, release_ramp_up_s: '', peak_release_m3s: '',
    release_hold_s: 0, release_ramp_down_s: '',
    // Simulation Controls
    duration: 3600, interval: 60, near_solver: 'DualSPHysics', far_solver: 'LISFLOOD-FP'
  });

  const [validationResult, setValidationResult] = useState(null);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [createdScenarioId, setCreatedScenarioId] = useState(null);

  // Boundary State
  const [boundaryResult, setBoundaryResult] = useState(null);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState(null);

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scenarios');
      if (!res.ok) throw new Error('Failed to load scenarios');
      const data = await res.json();
      setScenarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'registry') fetchScenarios();
  }, [view]);

  const handleCreateScenario = async () => {
    setWizardLoading(true);
    setError(null);
    try {
      const scenario_id = `scen_${Date.now()}`;
      const inputConfig = {
        dem_type: wizardData.dem_type,
        dem_filename: wizardData.dem_filename,
        simulation_duration_s: parseInt(wizardData.duration, 10),
        output_interval_s: parseInt(wizardData.interval, 10),
        near_field_solver: wizardData.near_solver,
        far_field_solver: wizardData.far_solver,
      };

      if (wizardData.hydro_type === 'upload' && wizardData.hydrograph_timestamps.length > 0) {
        inputConfig.hydrograph_timestamps = wizardData.hydrograph_timestamps;
        inputConfig.hydrograph_discharges = wizardData.hydrograph_discharges;
      }

      if (wizardData.source_type === 'ENGINEERED_DAM_BREAK') {
        if (wizardData.dam_height) inputConfig.dam_height = parseFloat(wizardData.dam_height);
        if (wizardData.reservoir_storage) inputConfig.reservoir_storage = parseFloat(wizardData.reservoir_storage);
        if (wizardData.breach_width) inputConfig.breach_width = parseFloat(wizardData.breach_width);
        if (wizardData.breach_time) inputConfig.breach_time = parseFloat(wizardData.breach_time);
      } else if (wizardData.source_type === 'NATURAL_RIVER_BLOCKAGE') {
        if (wizardData.impounded_volume_m3) inputConfig.impounded_volume_m3 = parseFloat(wizardData.impounded_volume_m3);
        if (wizardData.blockage_height_m) inputConfig.blockage_height_m = parseFloat(wizardData.blockage_height_m);
        if (wizardData.blockage_breach_width_m) inputConfig.blockage_breach_width_m = parseFloat(wizardData.blockage_breach_width_m);
        if (wizardData.failure_duration_s) inputConfig.failure_duration_s = parseFloat(wizardData.failure_duration_s);
        if (wizardData.upstream_water_depth_m) inputConfig.upstream_water_depth_m = parseFloat(wizardData.upstream_water_depth_m);
      } else if (wizardData.source_type === 'CONTROLLED_RELEASE') {
        inputConfig.release_start_time_s = parseFloat(wizardData.release_start_time_s || 0);
        if (wizardData.release_ramp_up_s) inputConfig.release_ramp_up_s = parseFloat(wizardData.release_ramp_up_s);
        if (wizardData.peak_release_m3s) inputConfig.peak_release_m3s = parseFloat(wizardData.peak_release_m3s);
        inputConfig.release_hold_s = parseFloat(wizardData.release_hold_s || 0);
        if (wizardData.release_ramp_down_s) inputConfig.release_ramp_down_s = parseFloat(wizardData.release_ramp_down_s);
      }

      const payload = {
        scenario_id,
        name: wizardData.name,
        source_type: wizardData.source_type,
        river_dam_metadata: {
          dam_name: wizardData.dam_name,
          river: wizardData.river,
          state: wizardData.state,
          latitude: parseFloat(wizardData.latitude),
          longitude: parseFloat(wizardData.longitude)
        },
        input_configuration: inputConfig,
        provenance: "USER_CONFIGURED"
      };

      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || 'Failed to create scenario');
      }

      const valRes = await fetch(`/api/scenarios/${scenario_id}/validate`, { method: 'POST' });
      const valData = await valRes.json();
      setValidationResult(valData);
      setCreatedScenarioId(scenario_id);
      setStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setWizardLoading(false);
    }
  };

  const handleGenerateBoundary = async () => {
    if (!createdScenarioId) return;
    setBoundaryLoading(true);
    setBoundaryError(null);
    try {
      const res = await fetch(`/api/scenarios/${createdScenarioId}/boundary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Failed to generate boundary hydrograph');
      }
      const data = await res.json();
      setBoundaryResult(data);
    } catch (err) {
      setBoundaryError(err.message);
    } finally {
      setBoundaryLoading(false);
    }
  };

  const handleCreateRun = async (scenarioId) => {
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/runs`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create run');
      const run = await res.json();
      setSelectedRun(run);
      setView('run_details');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHydroCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setWizardData(prev => ({ ...prev, hydro_filename: file.name }));
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const times = [];
      const discharges = [];
      for (let i = 0; i < lines.length; i++) {
        if (i === 0 && isNaN(parseFloat(lines[i].split(',')[0]))) continue;
        const [t, q] = lines[i].split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(t) && !isNaN(q)) {
          times.push(t);
          discharges.push(q);
        }
      }
      setWizardData(prev => ({
        ...prev,
        hydrograph_timestamps: times,
        hydrograph_discharges: discharges
      }));
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden text-slate-800">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Generalized Scenario Builder</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physics-based Hydrodynamic Scenario Configuration &amp; Run Engine (DualSPHysics &rarr; LISFLOOD-FP)
          </p>
        </div>
        {view === 'registry' && (
          <button
            onClick={() => {
              setStep(1);
              setValidationResult(null);
              setBoundaryResult(null);
              setBoundaryError(null);
              setCreatedScenarioId(null);
              setView('wizard');
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Scenario
          </button>
        )}
        {view !== 'registry' && (
          <button
            onClick={() => setView('registry')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Registry
          </button>
        )}
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {view === 'registry' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Loading scenarios...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {scenarios.map((scen) => (
                  <div key={scen.scenario_id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          {scen.source_type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {scen.scenario_id}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mb-1">{scen.name}</h3>
                      <p className="text-xs text-slate-500 mb-4">
                        {scen.river_dam_metadata?.dam_name || 'Generic Dam'} &middot; {scen.river_dam_metadata?.river} River ({scen.river_dam_metadata?.state})
                      </p>

                      <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600 mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Provenance:</span>
                          <span className="font-mono text-[11px] font-semibold text-slate-700">{scen.provenance}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Solvers:</span>
                          <span className="font-mono text-[11px]">
                            {scen.input_configuration?.near_field_solver} &rarr; {scen.input_configuration?.far_field_solver}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Duration / Int:</span>
                          <span className="font-mono text-[11px]">
                            {scen.input_configuration?.simulation_duration_s}s / {scen.input_configuration?.output_interval_s}s
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleCreateRun(scen.scenario_id)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1.5 rounded-lg text-xs font-semibold transition"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Execute Run
                      </button>
                      <ExportMenu
                        type="extent"
                        scenarioId={scen.scenario_id}
                        label="Export"
                        buttonClassName="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'wizard' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-xs p-6">
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
              {[
                { s: 1, label: 'Source Type' },
                { s: 2, label: 'Metadata' },
                { s: 3, label: 'Boundary & Physics' },
                { s: 4, label: 'Solver Setup' },
                { s: 5, label: 'Validation & Ready' },
              ].map(({ s, label }) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {step > s ? '✓' : s}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${step === s ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Source Type */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Select Hydrodynamic Hazard Source Type</h2>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'ENGINEERED_DAM_BREAK', title: 'Engineered Dam Break', desc: 'Failure of concrete, earth, or rockfill dam structure. DualSPHysics near-field coupling.' },
                    { id: 'NATURAL_RIVER_BLOCKAGE', title: 'Natural River Blockage / Landslide Dam (GLOF/LDOF)', desc: 'Breaching of landslide dams or moraine dam outburst floods.' },
                    { id: 'CONTROLLED_RELEASE', title: 'Extreme Spillway / Controlled Emergency Release', desc: 'Operational reservoir gate releases causing critical downstream bank exceedance.' }
                  ].map(({ id, title, desc }) => (
                    <div
                      key={id}
                      onClick={() => setWizardData(prev => ({ ...prev, source_type: id }))}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        wizardData.source_type === id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 mb-1">{title}</div>
                      <div className="text-xs text-slate-500">{desc}</div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 flex justify-end">
                  <button
                    disabled={!wizardData.source_type}
                    onClick={() => setStep(2)}
                    className="bg-blue-600 disabled:bg-slate-200 text-white px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
                  >
                    Next: Metadata <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: River Dam Metadata */}
            {step === 2 && (
              <div className="space-y-4 text-xs">
                <h2 className="text-sm font-bold text-slate-900">River &amp; Geographic Context</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Scenario Display Name *</label>
                    <input
                      type="text"
                      value={wizardData.name}
                      onChange={e => setWizardData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Tehri Dam Extreme Piping Failure"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Structure / Blockage Name</label>
                    <input
                      type="text"
                      value={wizardData.dam_name}
                      onChange={e => setWizardData(prev => ({ ...prev, dam_name: e.target.value }))}
                      placeholder="e.g. Tehri Dam"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">River Basin / River</label>
                    <input
                      type="text"
                      value={wizardData.river}
                      onChange={e => setWizardData(prev => ({ ...prev, river: e.target.value }))}
                      placeholder="e.g. Bhagirathi"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">State / Province</label>
                    <input
                      type="text"
                      value={wizardData.state}
                      onChange={e => setWizardData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="e.g. Uttarakhand"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Latitude (DD) *</label>
                    <input
                      type="number"
                      step="any"
                      value={wizardData.latitude}
                      onChange={e => setWizardData(prev => ({ ...prev, latitude: e.target.value }))}
                      placeholder="e.g. 30.378"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Longitude (DD) *</label>
                    <input
                      type="number"
                      step="any"
                      value={wizardData.longitude}
                      onChange={e => setWizardData(prev => ({ ...prev, longitude: e.target.value }))}
                      placeholder="e.g. 78.480"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button onClick={() => setStep(1)} className="text-slate-600 px-4 py-2 rounded-lg border border-slate-200">
                    Back
                  </button>
                  <button
                    disabled={!wizardData.name || !wizardData.latitude || !wizardData.longitude}
                    onClick={() => setStep(3)}
                    className="bg-blue-600 disabled:bg-slate-200 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    Next: Boundary &amp; Physics <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Boundary & Physics */}
            {step === 3 && (
              <div className="space-y-4 text-xs">
                <h2 className="text-sm font-bold text-slate-900">Boundary &amp; Source Configuration</h2>

                {/* Optional CSV Hydrograph Upload */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    Option A: Upload Hydrograph Q(t) [CSV: time_sec, discharge_m3s]
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    If provided, uploaded hydrograph takes precedence over theoretical formula generation.
                  </p>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleHydroCSV}
                    className="text-xs file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {wizardData.hydrograph_timestamps.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-600 ml-2">
                      Loaded {wizardData.hydrograph_timestamps.length} points
                    </span>
                  )}
                </div>

                {/* Option B: Source Type Parameters */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                  <div className="font-semibold text-slate-800">
                    Option B: Theoretical Source Parameters ({wizardData.source_type})
                  </div>

                  {wizardData.source_type === 'ENGINEERED_DAM_BREAK' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Dam Height (m) *</label>
                        <input
                          type="number"
                          value={wizardData.dam_height}
                          onChange={e => setWizardData(prev => ({ ...prev, dam_height: e.target.value }))}
                          placeholder="260.5"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Reservoir Storage (m&sup3;) *</label>
                        <input
                          type="number"
                          value={wizardData.reservoir_storage}
                          onChange={e => setWizardData(prev => ({ ...prev, reservoir_storage: e.target.value }))}
                          placeholder="3.54e9"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Avg Breach Width (m) *</label>
                        <input
                          type="number"
                          value={wizardData.breach_width}
                          onChange={e => setWizardData(prev => ({ ...prev, breach_width: e.target.value }))}
                          placeholder="248.5"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Breach Formation Time (hrs) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={wizardData.breach_time}
                          onChange={e => setWizardData(prev => ({ ...prev, breach_time: e.target.value }))}
                          placeholder="1.85"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                    </div>
                  )}

                  {wizardData.source_type === 'NATURAL_RIVER_BLOCKAGE' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Impounded Volume (m&sup3;) *</label>
                        <input
                          type="number"
                          value={wizardData.impounded_volume_m3}
                          onChange={e => setWizardData(prev => ({ ...prev, impounded_volume_m3: e.target.value }))}
                          placeholder="50000000"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Blockage Height (m) *</label>
                        <input
                          type="number"
                          value={wizardData.blockage_height_m}
                          onChange={e => setWizardData(prev => ({ ...prev, blockage_height_m: e.target.value }))}
                          placeholder="45"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Blockage Breach Width (m) *</label>
                        <input
                          type="number"
                          value={wizardData.blockage_breach_width_m}
                          onChange={e => setWizardData(prev => ({ ...prev, blockage_breach_width_m: e.target.value }))}
                          placeholder="60"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Failure Duration (s) *</label>
                        <input
                          type="number"
                          value={wizardData.failure_duration_s}
                          onChange={e => setWizardData(prev => ({ ...prev, failure_duration_s: e.target.value }))}
                          placeholder="900"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                    </div>
                  )}

                  {wizardData.source_type === 'CONTROLLED_RELEASE' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Release Start Time (s)</label>
                        <input
                          type="number"
                          value={wizardData.release_start_time_s}
                          onChange={e => setWizardData(prev => ({ ...prev, release_start_time_s: e.target.value }))}
                          placeholder="0"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Ramp-Up Duration (s) *</label>
                        <input
                          type="number"
                          value={wizardData.release_ramp_up_s}
                          onChange={e => setWizardData(prev => ({ ...prev, release_ramp_up_s: e.target.value }))}
                          placeholder="600"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Peak Release (m&sup3;/s) *</label>
                        <input
                          type="number"
                          value={wizardData.peak_release_m3s}
                          onChange={e => setWizardData(prev => ({ ...prev, peak_release_m3s: e.target.value }))}
                          placeholder="2500"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Hold Duration (s)</label>
                        <input
                          type="number"
                          value={wizardData.release_hold_s}
                          onChange={e => setWizardData(prev => ({ ...prev, release_hold_s: e.target.value }))}
                          placeholder="0"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-slate-600 mb-1">Ramp-Down Duration (s) *</label>
                        <input
                          type="number"
                          value={wizardData.release_ramp_down_s}
                          onChange={e => setWizardData(prev => ({ ...prev, release_ramp_down_s: e.target.value }))}
                          placeholder="900"
                          className="w-full border border-slate-200 rounded p-1.5 bg-slate-50"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-between">
                  <button onClick={() => setStep(2)} className="text-slate-600 px-4 py-2 rounded-lg border border-slate-200">
                    Back
                  </button>
                  <button onClick={() => setStep(4)} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2">
                    Next: Solvers &amp; DEM <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Solver Setup */}
            {step === 4 && (
              <div className="space-y-4 text-xs">
                <h2 className="text-sm font-bold text-slate-900">Solvers &amp; Execution Limits</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Near-Field Solver</label>
                    <select
                      value={wizardData.near_solver}
                      onChange={e => setWizardData(prev => ({ ...prev, near_solver: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50"
                    >
                      <option value="DualSPHysics">DualSPHysics v5.2 (Lagrangian SPH)</option>
                      <option value="Parametric">Parametric Breach Estimation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Far-Field Solver</label>
                    <select
                      value={wizardData.far_solver}
                      onChange={e => setWizardData(prev => ({ ...prev, far_solver: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50"
                    >
                      <option value="LISFLOOD-FP">LISFLOOD-FP 8.1 (Sub-grid / ACC)</option>
                      <option value="Delft3D-FM">Delft3D-FM (Integration Path Only)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Simulation Duration (s) *</label>
                    <input
                      type="number"
                      value={wizardData.duration}
                      onChange={e => setWizardData(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Temporal Frame Interval (s) *</label>
                    <input
                      type="number"
                      value={wizardData.interval}
                      onChange={e => setWizardData(prev => ({ ...prev, interval: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button onClick={() => setStep(3)} className="text-slate-600 px-4 py-2 rounded-lg border border-slate-200">
                    Back
                  </button>
                  <button
                    disabled={wizardLoading}
                    onClick={handleCreateScenario}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    {wizardLoading ? 'Validating...' : 'Validate & Create Scenario'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Validation & Ready */}
            {step === 5 && validationResult && (
              <div className="space-y-4 text-xs">
                <h2 className="text-sm font-bold text-slate-900">Validation &amp; Boundary Generation</h2>

                {/* Validation Status Card */}
                <div className={`p-4 rounded-xl border ${
                  validationResult.status === 'PASS' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                  validationResult.status === 'WARNING' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                  'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm mb-2">
                    {validationResult.status === 'PASS' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    {validationResult.status === 'WARNING' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                    {validationResult.status === 'FAIL' && <AlertCircle className="w-5 h-5 text-red-600" />}
                    Validation Result: {validationResult.status}
                  </div>
                  {validationResult.errors?.length > 0 && (
                    <div className="space-y-1 mb-2">
                      <div className="font-semibold text-red-800">Blocking Errors:</div>
                      {validationResult.errors.map((e, idx) => (
                        <div key={idx} className="text-red-700 ml-2">&bull; {e}</div>
                      ))}
                    </div>
                  )}
                  {validationResult.warnings?.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-semibold text-amber-800">Warnings:</div>
                      {validationResult.warnings.map((w, idx) => (
                        <div key={idx} className="text-amber-700 ml-2">&bull; {w}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phase 6 Boundary Hydrograph Engine */}
                {validationResult.status !== 'FAIL' && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <BarChart2 className="w-4 h-4 text-blue-600" />
                          Phase 6 Source Boundary Hydrograph Engine
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Generates and validates Q(t) boundary files for solver execution.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateBoundary}
                        disabled={boundaryLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        {boundaryLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Generate Boundary
                      </button>
                    </div>

                    {boundaryError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-[11px]">
                        {boundaryError}
                      </div>
                    )}

                    {boundaryResult && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Method:</span>
                          <span className="font-mono text-slate-800">{boundaryResult.generation_method}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                          <div>
                            <span className="text-slate-500">Peak Discharge:</span>
                            <span className="font-mono font-bold text-slate-900 ml-1">
                              {boundaryResult.statistics?.peak_discharge_m3s?.toLocaleString()} m&sup3;/s
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Time to Peak:</span>
                            <span className="font-mono font-bold text-slate-900 ml-1">
                              {boundaryResult.statistics?.time_to_peak_sec} s
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Total Volume:</span>
                            <span className="font-mono font-bold text-slate-900 ml-1">
                              {boundaryResult.statistics?.total_released_volume_m3?.toLocaleString()} m&sup3;
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Points:</span>
                            <span className="font-mono font-bold text-slate-900 ml-1">
                              {boundaryResult.statistics?.point_count}
                            </span>
                          </div>
                        </div>

                        {boundaryResult.assumptions?.length > 0 && (
                          <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-0.5">
                            <span className="font-semibold text-slate-600 uppercase tracking-wider text-[9px]">Assumptions:</span>
                            {boundaryResult.assumptions.map((a, i) => (
                              <div key={i}>&bull; {a}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 flex justify-between">
                  <button onClick={() => setStep(4)} className="text-slate-600 px-4 py-2 rounded-lg border border-slate-200">
                    Back
                  </button>
                  <button
                    disabled={validationResult.status === 'FAIL'}
                    onClick={() => {
                      if (createdScenarioId) handleCreateRun(createdScenarioId);
                    }}
                    className="bg-emerald-600 disabled:bg-slate-200 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Create &amp; Launch Run
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'run_details' && selectedRun && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Run Dispatched: {selectedRun.run_id}</h2>
                <p className="text-[11px] text-slate-500">Scenario: {selectedRun.scenario_id}</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100 font-mono text-[11px]">
                {selectedRun.status}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">QA Status:</span>
                <span className="font-mono font-bold text-amber-600">{selectedRun.qa_status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Boundary Status:</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedRun.solver_configuration?.boundary_status || 'READY'}
                </span>
              </div>
              {selectedRun.input_paths && Object.entries(selectedRun.input_paths).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}:</span>
                  <span className="font-mono text-[10px] text-slate-700 truncate max-w-xs">{v}</span>
                </div>
              ))}
            </div>

            <p className="text-slate-500 text-[11px]">
              Run workspace created at <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">data/runs/{selectedRun.scenario_id}/{selectedRun.run_id}</code>.
            </p>

            <div className="pt-2 flex justify-between">
              <button onClick={() => setView('registry')} className="text-slate-600 px-4 py-2 rounded-lg border border-slate-200">
                Back to Scenarios
              </button>
              <button
                onClick={() => {
                  if (onNavigate) onNavigate('simulation');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5"
              >
                Go to Simulation Lab <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
