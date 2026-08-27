import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ScenarioBuilder from './components/ScenarioBuilder';
import SimulationViewer from './components/SimulationViewer';
import DualComparisonView from './components/DualComparisonView';
import DamageAssessmentPanel from './components/DamageAssessmentPanel';
import GEEMonitorPanel from './components/GEEMonitorPanel';
import HydrologyPanel from './components/HydrologyPanel';
import UncertaintyPanel from './components/UncertaintyPanel';
import ElevationProfileModal from './components/ElevationProfileModal';
import ExportModal from './components/ExportModal';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('builder');
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDemOpen, setIsDemOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Load initial preset scenarios
  useEffect(() => {
    api.getPresets()
      .then((data) => {
        setPresets(data.scenarios || []);
        if (data.scenarios?.length > 0) {
          setSelectedPreset(data.scenarios[0]);
          // Automatically run initial simulation on Tehri Dam for instant out-of-the-box demonstration
          handleRunSimulation({
            preset_id: data.scenarios[0].id,
            solver_type: 'coupled',
          });
        }
      })
      .catch((err) => console.error('Failed to load presets:', err));
  }, []);

  const handleSelectPreset = (presetId) => {
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setSelectedPreset(found);
    }
  };

  const handleRunSimulation = async (payload) => {
    setIsSimulating(true);
    try {
      const res = await api.runSimulation(payload);
      setSimulationResult(res);
      // Auto switch to viewer if on builder
      if (activeTab === 'builder' || activeTab === 'hydrology') {
        setActiveTab('viewer');
      }
    } catch (err) {
      console.error('Simulation execution failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplyInflowToSimulation = (hydroResult) => {
    // Route catchment inflow hydrograph into dam breach simulation
    handleRunSimulation({
      preset_id: selectedPreset?.id || 'tehri_dam_bhagirathi',
      solver_type: 'coupled',
      custom_params: {
        ...(selectedPreset || {}),
        inflow_hydrograph_m3s: hydroResult.inflow_hydrograph_m3s,
        inflow_hydrograph_times_hrs: hydroResult.time_series_hrs,
      },
    });
  };

  const handleTriggerScenarioFromLake = (alertData) => {
    // Generate custom landslide dam outburst scenario from GEE detected lake
    const customParams = {
      name: `Outburst Flood - ${alertData.zone_name}`,
      dam_name: `Detected Landslide Dam (${alertData.zone_name})`,
      dam_type: 'landslide_dam',
      breach_mode: 'landslide_outburst',
      dam_height_m: alertData.estimated_depth_m || 30.0,
      reservoir_volume_m3: alertData.estimated_volume_m3 || 1500000.0,
      hydraulic_head_m: alertData.estimated_depth_m || 28.0,
      crest_length_m: 140.0,
      reach_length_km: 25.0,
      valley_width_m: 150.0,
      bed_slope: 0.025,
      manning_n: 0.048,
      valley_type: 'mountain_gorge',
      state: 'Uttarakhand / Himalaya',
      lat: alertData.coordinates?.[0]?.[1] || 30.485,
      lon: alertData.coordinates?.[0]?.[0] || 79.738,
    };

    handleRunSimulation({
      custom_params: customParams,
      solver_type: 'dual',
      breach_model: 'landslide',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPreset={selectedPreset}
        presets={presets}
        onSelectPreset={handleSelectPreset}
        onOpenDem={() => setIsDemOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        isSimulating={isSimulating}
        onQuickRun={() =>
          handleRunSimulation({
            preset_id: selectedPreset?.id,
            solver_type: 'coupled',
          })
        }
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'builder' && (
          <ScenarioBuilder
            presets={presets}
            selectedPreset={selectedPreset}
            onSelectPreset={handleSelectPreset}
            onRunSimulation={handleRunSimulation}
            isSimulating={isSimulating}
          />
        )}

        {activeTab === 'hydrology' && (
          <HydrologyPanel onApplyInflowToSimulation={handleApplyInflowToSimulation} />
        )}

        {activeTab === 'viewer' && (
          <SimulationViewer
            simulationResult={simulationResult}
            selectedPreset={selectedPreset}
            onOpenDamage={() => setActiveTab('damage')}
            onOpenComparison={() => setActiveTab('comparison')}
          />
        )}

        {activeTab === 'uncertainty' && (
          <UncertaintyPanel selectedPreset={selectedPreset} />
        )}

        {activeTab === 'comparison' && (
          <DualComparisonView simulationResult={simulationResult} />
        )}

        {activeTab === 'damage' && (
          <DamageAssessmentPanel
            simulationResult={simulationResult}
            onOpenExport={() => setIsExportOpen(true)}
          />
        )}

        {activeTab === 'gee' && (
          <GEEMonitorPanel onTriggerScenarioFromLake={handleTriggerScenarioFromLake} />
        )}
      </main>

      {/* Modals */}
      <ElevationProfileModal
        isOpen={isDemOpen}
        onClose={() => setIsDemOpen(false)}
        selectedPreset={selectedPreset}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        simulationResult={simulationResult}
        selectedPreset={selectedPreset}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        HydroBreach &bull; Next-Gen Dam Break, Landslide-Lake Outburst & Flash Flood Simulation Framework for HADR &bull; Dual SPH & Delft3D Physics
      </footer>
    </div>
  );
}
