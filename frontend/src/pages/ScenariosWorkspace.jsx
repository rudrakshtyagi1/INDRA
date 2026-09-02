import React, { useState, useEffect } from 'react';
import { Layers, Plus, FileText, CheckCircle2, AlertTriangle, AlertCircle, Upload, X, Play, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
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
    dam_height: '', reservoir_storage: '', breach_width: '', breach_time: '',
    duration: 3600, interval: 60, near_solver: 'DualSPHysics', far_solver: 'LISFLOOD-FP'
  });
  
  const [validationResult, setValidationResult] = useState(null);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [createdScenarioId, setCreatedScenarioId] = useState(null);

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
    try {
      const scenario_id = `scen_${Date.now()}`;
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
        input_configuration: {
           dem_type: wizardData.dem_type,
           dem_filename: wizardData.dem_filename,
           dem_crs: wizardData.dem_filename ? "EPSG:4326" : "", // Mocked extraction
           hydrology_type: wizardData.hydro_type,
           hydrograph_filename: wizardData.hydro_filename,
           hydrograph_timestamps: wizardData.hydrograph_timestamps,
           hydrograph_discharges: wizardData.hydrograph_discharges,
           dam_height: parseFloat(wizardData.dam_height),
           reservoir_storage: parseFloat(wizardData.reservoir_storage),
           simulation_duration_s: parseInt(wizardData.duration),
           output_interval_s: parseInt(wizardData.interval),
           near_field_solver: wizardData.near_solver,
           far_field_solver: wizardData.far_solver
        },
        provenance: "USER_CREATED"
      };

      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Creation failed');
      
      const valRes = await fetch(`/api/scenarios/${scenario_id}/validate`, { method: 'POST' });
      const valData = await valRes.json();
      setValidationResult(valData);
      setCreatedScenarioId(scenario_id);
      setStep(8); // Review step
    } catch (err) {
      setValidationResult({ status: 'FAIL', errors: [err.message], warnings: [] });
      setStep(8);
    } finally {
      setWizardLoading(false);
    }
  };

  const handleCreateRun = async () => {
    setWizardLoading(true);
    try {
      const res = await fetch(`/api/scenarios/${createdScenarioId}/runs`, { method: 'POST' });
      const data = await res.json();
      setSelectedRun(data);
      setView('run_details');
    } catch (err) {
      alert("Run creation failed: " + err.message);
    } finally {
      setWizardLoading(false);
    }
  };

  const handleHydroUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
       setWizardData({...wizardData, hydro_filename: file.name, hydrograph_timestamps: [0, 3600], hydrograph_discharges: [100, 250]}); // mock parsed
    }
  };

  const handleDemUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
       setWizardData({...wizardData, dem_filename: file.name, dem_file: file});
    }
  };

  const renderRegistry = () => (
    <div className="flex flex-col h-full bg-slate-50 p-8 overflow-y-auto">
      <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3"><Layers className="w-8 h-8 text-blue-600" /> Scenario Registry</h1>
           <p className="text-slate-500 mt-1">Manage physical inundation boundaries and create execution configurations.</p>
        </div>
        <button onClick={() => { setStep(1); setValidationResult(null); setCreatedScenarioId(null); setView('wizard'); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 cursor-pointer shadow-sm transition">
          <Plus className="w-5 h-5" /> NEW SCENARIO
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading registry...</div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 font-bold"><AlertCircle /> {error}</div>
      ) : scenarios.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
           <Layers className="w-12 h-12 mb-4 opacity-20" />
           <p>No scenarios found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
               <tr><th className="px-6 py-4">Scenario</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Location</th><th className="px-6 py-4">Provenance</th><th className="px-6 py-4">Actions</th></tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {scenarios.map(s => (
                 <tr key={s.scenario_id} className="hover:bg-slate-50 transition">
                   <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.scenario_id}</div>
                   </td>
                   <td className="px-6 py-4 text-xs font-semibold text-slate-600">{s.source_type.replace(/_/g, ' ')}</td>
                   <td className="px-6 py-4 text-sm text-slate-600">{s.river_dam_metadata?.river} / {s.river_dam_metadata?.dam_name}</td>
                   <td className="px-6 py-4">
                      {s.scenario_id === 'TEHRI_V3_BENCHMARK' ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase">VERIFIED BENCHMARK</span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">{s.provenance}</span>
                      )}
                   </td>
                   <td className="px-6 py-4 flex gap-2">
                      <button 
                        onClick={() => {
                          if (s.scenario_id === 'TEHRI_V3_BENCHMARK') onNavigate('simulation');
                          else alert("View logic for custom runs to be implemented.");
                        }} 
                        className="text-xs bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 px-3 py-1.5 rounded font-bold cursor-pointer transition"
                      >
                        OPEN
                      </button>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderWizard = () => (
    <div className="flex flex-col h-full bg-slate-100">
      <div className="bg-white h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
         <div className="font-bold text-slate-800 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" /> Scenario Builder</div>
         <button onClick={() => setView('registry')} className="text-slate-400 hover:text-slate-800 cursor-pointer p-1"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar steps */}
        <div className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {['Type', 'Location', 'Terrain', 'Hydrology', 'Specifics', 'Solvers', 'Numerics', 'Review'].map((s, i) => (
             <div key={s} className={`flex items-center gap-3 text-sm font-bold ${step === i + 1 ? 'text-blue-600' : step > i + 1 ? 'text-emerald-500' : 'text-slate-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${step === i + 1 ? 'border-blue-600 bg-blue-50' : step > i + 1 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                  {step > i + 1 ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                </div>
                {s}
             </div>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="max-w-3xl w-full mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-8 min-h-[500px] flex flex-col relative">
            
            {/* STEPS CONTENT */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Select Scenario Type</h2>
                <div className="grid gap-4">
                  {[
                    { id: 'ENGINEERED_DAM_BREAK', title: 'Engineered Dam Break', desc: 'Simulate structural failure of concrete, gravity, or earthfill dams.' },
                    { id: 'NATURAL_RIVER_BLOCKAGE', title: 'Natural River Blockage', desc: 'Glacial lake outburst (GLOF) or landslide dam failure mechanics.' },
                    { id: 'CONTROLLED_RELEASE', title: 'Controlled Release', desc: 'Operational spillway routing and downstream hazard mapping.' }
                  ].map(t => (
                    <div key={t.id} onClick={() => setWizardData({...wizardData, source_type: t.id})} className={`p-4 border-2 rounded-xl cursor-pointer transition ${wizardData.source_type === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}>
                      <h3 className="font-bold text-slate-800 mb-1">{t.title}</h3>
                      <p className="text-sm text-slate-500">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Location & Identity</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Scenario Name</label><input type="text" className="w-full border border-slate-300 p-2 rounded" value={wizardData.name} onChange={e => setWizardData({...wizardData, name: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">River Name</label><input type="text" className="w-full border border-slate-300 p-2 rounded" value={wizardData.river} onChange={e => setWizardData({...wizardData, river: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Dam / Blockage Name</label><input type="text" className="w-full border border-slate-300 p-2 rounded" value={wizardData.dam_name} onChange={e => setWizardData({...wizardData, dam_name: e.target.value})} /></div>
                  <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">State / Region</label><input type="text" className="w-full border border-slate-300 p-2 rounded" value={wizardData.state} onChange={e => setWizardData({...wizardData, state: e.target.value})} /></div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Latitude (Dec Degrees)</label>
                     <input type="number" step="0.0001" className="w-full border border-slate-300 p-2 rounded" value={wizardData.latitude} onChange={e => setWizardData({...wizardData, latitude: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Longitude (Dec Degrees)</label>
                     <div className="flex gap-2">
                       <input type="number" step="0.0001" className="w-full border border-slate-300 p-2 rounded" value={wizardData.longitude} onChange={e => setWizardData({...wizardData, longitude: e.target.value})} />
                       
                     </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Terrain / DEM Input</h2>
                <div className="flex gap-4 mb-6">
                   <button className="px-4 py-2 text-sm font-bold border-b-2 border-blue-600 text-blue-700">Upload DEM</button>
                   <button className="px-4 py-2 text-sm font-bold border-b-2 border-transparent text-slate-400 cursor-not-allowed" title="Upcoming Feature">Fetch Remote Data</button>
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
                   <Upload className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                   <p className="text-sm text-slate-600 font-bold mb-2">Select GeoTIFF File</p>
                   <input type="file" accept=".tif,.tiff" onChange={handleDemUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                {wizardData.dem_file && (
                   <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-mono">
                      <div>File: {wizardData.dem_filename}</div>
                      <div>Size: {(wizardData.dem_file.size / 1024 / 1024).toFixed(2)} MB</div>
                      <div className="text-[10px] mt-2 opacity-70">Will be fully validated by backend CRS inspector.</div>
                   </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Hydrology Input</h2>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 mb-4">
                   <p className="text-sm text-slate-600 font-bold mb-2">Upload Q(t) Hydrograph (CSV)</p>
                   <p className="text-xs text-slate-500 mb-4">Required columns: <span className="font-mono">time (seconds)</span>, <span className="font-mono">discharge (m3/s)</span></p>
                   <input type="file" accept=".csv" onChange={handleHydroUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                {wizardData.hydro_filename && (
                   <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 font-mono flex items-center justify-between">
                     <span>{wizardData.hydro_filename}</span>
                     <span className="text-[10px] bg-blue-100 px-2 py-1 rounded">ATTACHED</span>
                   </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Scenario-Specific Inputs</h2>
                {wizardData.source_type === 'ENGINEERED_DAM_BREAK' ? (
                   <div className="grid grid-cols-2 gap-4">
                     <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Dam Height (m)</label><input type="number" className="w-full border border-slate-300 p-2 rounded" value={wizardData.dam_height} onChange={e => setWizardData({...wizardData, dam_height: e.target.value})} /></div>
                     <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Reservoir Storage (m³)</label><input type="number" className="w-full border border-slate-300 p-2 rounded" value={wizardData.reservoir_storage} onChange={e => setWizardData({...wizardData, reservoir_storage: e.target.value})} /></div>
                     <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Breach Width (m)</label><input type="number" className="w-full border border-slate-300 p-2 rounded" value={wizardData.breach_width} onChange={e => setWizardData({...wizardData, breach_width: e.target.value})} /></div>
                     <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Breach Time (hrs)</label><input type="number" step="0.1" className="w-full border border-slate-300 p-2 rounded" value={wizardData.breach_time} onChange={e => setWizardData({...wizardData, breach_time: e.target.value})} /></div>
                   </div>
                ) : (
                   <div className="p-8 text-center text-slate-500 italic border border-slate-200 rounded-lg">Select Engineered Dam Break to see parameters for this prototype phase.</div>
                )}
              </div>
            )}

            {step === 6 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Solver Configuration</h2>
                <div className="space-y-6">
                   <div>
                     <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Near-Field Solver</label>
                     <select className="w-full border border-slate-300 p-3 rounded bg-slate-50 font-bold text-slate-800" value={wizardData.near_solver} onChange={e => setWizardData({...wizardData, near_solver: e.target.value})}>
                       <option value="DualSPHysics">DualSPHysics (AVAILABLE)</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Far-Field Solver</label>
                     <select className="w-full border border-slate-300 p-3 rounded font-bold text-slate-800" value={wizardData.far_solver} onChange={e => setWizardData({...wizardData, far_solver: e.target.value})}>
                       <option value="LISFLOOD-FP">LISFLOOD-FP 8.1 (AVAILABLE)</option>
                       <option value="Delft3D-FM">Delft3D-FM (INTEGRATION PATH)</option>
                     </select>
                     {wizardData.far_solver === 'Delft3D-FM' && (
                        <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> This solver will fail validation in the current pipeline.</div>
                     )}
                   </div>
                </div>
              </div>
            )}

            {step === 7 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Numerical Settings</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex justify-between">Simulation Duration (s) <span className="text-blue-500">USER CONFIGURABLE</span></label>
                     <input type="number" className="w-full border border-slate-300 p-2 rounded" value={wizardData.duration} onChange={e => setWizardData({...wizardData, duration: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex justify-between">Output Interval (s) <span className="text-blue-500">USER CONFIGURABLE</span></label>
                     <input type="number" className="w-full border border-slate-300 p-2 rounded" value={wizardData.interval} onChange={e => setWizardData({...wizardData, interval: e.target.value})} />
                  </div>
                  <div className="col-span-2 mt-4 p-4 bg-slate-50 border border-slate-200 rounded">
                     <p className="text-xs text-slate-500 font-bold mb-2">DEFAULT ASSUMPTIONS</p>
                     <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                        <li>Grid Resolution: Extracted dynamically from DEM input</li>
                        <li>Manning Roughness: 0.042 (Mountain Gorge Default)</li>
                        <li>Domain Corridor: Auto-clipped to thalweg buffers</li>
                     </ul>
                  </div>
                </div>
              </div>
            )}

            {step === 8 && (
              <div className="flex flex-col h-full">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Review & Validate</h2>
                
                {!validationResult ? (
                   <div className="flex-1 flex flex-col items-center justify-center">
                     <p className="text-slate-500 mb-4">Ready to submit configuration to backend.</p>
                     <button onClick={handleCreateScenario} disabled={wizardLoading} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-slate-900 transition flex items-center gap-2">
                       {wizardLoading ? 'VALIDATING...' : 'VALIDATE CONFIGURATION'}
                     </button>
                   </div>
                ) : (
                   <div className="flex-1 flex flex-col gap-4">
                      {/* Validation Banner */}
                      <div className={`p-4 rounded-lg border-2 flex items-start gap-3 ${validationResult.status === 'PASS' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : validationResult.status === 'WARNING' ? 'bg-amber-50 border-amber-400 text-amber-800' : 'bg-red-50 border-red-400 text-red-800'}`}>
                         {validationResult.status === 'PASS' ? <CheckCircle2 className="w-6 h-6 mt-0.5 shrink-0" /> : <AlertTriangle className="w-6 h-6 mt-0.5 shrink-0" />}
                         <div>
                            <h3 className="font-bold text-lg">VALIDATION {validationResult.status}</h3>
                            {validationResult.errors.length > 0 && (
                               <ul className="mt-2 list-disc list-inside text-sm">
                                 {validationResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                               </ul>
                            )}
                            {validationResult.warnings.length > 0 && (
                               <ul className="mt-2 list-disc list-inside text-sm opacity-80">
                                 {validationResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                               </ul>
                            )}
                         </div>
                      </div>

                      {/* Summary */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-2 font-mono">
                         <div className="flex justify-between"><span className="text-slate-500">Scenario</span><span className="font-bold">{wizardData.name} ({wizardData.source_type})</span></div>
                         <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="font-bold">{wizardData.latitude}, {wizardData.longitude}</span></div>
                         <div className="flex justify-between"><span className="text-slate-500">Solver Pipeline</span><span className="font-bold">{wizardData.near_solver} &rarr; {wizardData.far_solver}</span></div>
                         <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-bold">{wizardData.duration}s</span></div>
                      </div>

                      <div className="mt-auto flex gap-4">
                         <button onClick={() => setStep(1)} className="flex-1 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50">EDIT CONFIGURATION</button>
                         {validationResult.status !== 'FAIL' && (
                            <button onClick={handleCreateRun} disabled={wizardLoading} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">
                              {wizardLoading ? 'CREATING...' : 'CREATE RUN'}
                            </button>
                         )}
                      </div>
                   </div>
                )}
              </div>
            )}

            {/* Wizard Navigation */}
            {step < 8 && (
              <div className="absolute bottom-8 left-8 right-8 flex justify-between">
                 <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-4 py-2 border border-slate-200 text-slate-500 rounded font-bold disabled:opacity-30 flex items-center gap-2 hover:bg-slate-50">
                    <ArrowLeft className="w-4 h-4" /> BACK
                 </button>
                 <button onClick={() => setStep(step + 1)} className="px-6 py-2 bg-slate-800 text-white rounded font-bold flex items-center gap-2 hover:bg-slate-900 shadow-sm">
                    NEXT <ArrowRight className="w-4 h-4" />
                 </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );

  const renderRunDetails = () => (
    <div className="flex flex-col h-full bg-slate-50 p-8 items-center justify-center">
       <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 p-6 text-white text-center">
             <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <CheckCircle2 className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-bold mb-1">CONFIGURED & VALIDATED</h2>
             <p className="text-blue-100 text-sm">Execution sandbox provisioned.</p>
          </div>
          
          <div className="p-8 space-y-6">
             <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Run ID</div>
                <div className="font-mono font-bold text-slate-800 text-right">{selectedRun?.run_id}</div>
                
                <div className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Scenario ID</div>
                <div className="font-mono font-bold text-slate-800 text-right">{selectedRun?.scenario_id}</div>
                
                <div className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Current Status</div>
                <div className="text-right"><span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-full uppercase tracking-wider">{selectedRun?.status || 'READY'}</span></div>
                
                <div className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Output Availability</div>
                <div className="font-mono text-slate-400 text-right text-xs">PENDING EXECUTION</div>
             </div>

             <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-start gap-3">
                <InfoIcon />
                <div>
                   <h4 className="font-bold text-slate-800 text-sm">RUN READY FOR EXECUTION</h4>
                   <p className="text-xs text-slate-600 mt-1">Live solver execution is paused in this prototype phase. The backend directory structure and control plane are successfully tracking this configuration.</p>
                </div>
             </div>

             <ExportMenu runId={selectedRun?.run_id} products={["inundation_extent", "max_depth", "arrival_time", "exposed_roads", "exposed_settlements", "exposed_healthcare", "exposed_bridges", "exposed_power", "normal_route", "hazard_aware_route", "exposure_summary"]} />
             <button onClick={() => { setView('registry'); fetchScenarios(); }} className="w-full mt-2 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition">
                RETURN TO REGISTRY
             </button>
          </div>
       </div>
    </div>
  );

  return (
    <>
      {view === 'registry' && renderRegistry()}
      {view === 'wizard' && renderWizard()}
      {view === 'run_details' && renderRunDetails()}
    </>
  );
}

function InfoIcon() {
  return <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />;
}
