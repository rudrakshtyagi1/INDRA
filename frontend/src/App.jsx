import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/navigation/Sidebar';
import Topbar from './components/navigation/Topbar';
import Overview from './pages/Overview';
import DamOperations from './pages/DamOperations';
import SimulationLab from './pages/SimulationLab';
import HADRDashboard from './pages/HADRDashboard';
import SatelliteMonitor from './pages/SatelliteMonitor';
import ScenarioComparison from './pages/ScenarioComparison';
import ScenarioDrawer from './components/scenarios/ScenarioDrawer';
import ElevationProfileModal from './components/ElevationProfileModal';
import ExportModal from './components/ExportModal';
import { api, FALLBACK_PRESETS } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [presets, setPresets] = useState(FALLBACK_PRESETS);
  const [selectedPreset, setSelectedPreset] = useState(FALLBACK_PRESETS[0]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Full-Screen Visualization Modes
  const [isFullScreenSimOpen, setIsFullScreenSimOpen] = useState(false);
  const [isFullScreenHadrOpen, setIsFullScreenHadrOpen] = useState(false);

  // Modals & Drawers State
  const [isScenarioDrawerOpen, setIsScenarioDrawerOpen] = useState(false);
  const [isDemModalOpen, setIsDemModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Load initial preset scenarios from backend on mount
  useEffect(() => {
    api.getPresets()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.scenarios || [];
        if (list.length > 0) {
          setPresets(list);
          setSelectedPreset(list[0]);
          handleRunSimulation({
            scenario_id: list[0].id,
            preset_id: list[0].id,
            solver_type: 'coupled',
          }, false); // don't open fullscreen on initial mount
        }
      })
      .catch((err) => console.error('Failed to load presets:', err));
  }, []);

  const handleSelectPreset = (presetId) => {
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setSelectedPreset(found);
      if (
        simulationResult &&
        simulationResult.scenario_id !== found.id &&
        simulationResult.scenario_params?.id !== found.id
      ) {
        setSimulationResult(null);
      }
    }
  };

  const handleRunSimulation = async (payload = {}, openFullScreen = true) => {
    setIsSimulating(true);
    if (openFullScreen) {
      setActiveTab('simulation');
      setIsFullScreenSimOpen(true);
    }
    try {
      const scenarioId =
        payload.scenario_id || payload.preset_id || selectedPreset?.id || 'tehri_dam_bhagirathi';
      const runPayload = {
        ...payload,
        scenario_id: scenarioId,
        preset_id: scenarioId,
        solver_type: payload.solver_type || 'coupled',
      };
      const res = await api.runSimulation(runPayload);
      setSimulationResult(res);
    } catch (err) {
      console.error('Simulation execution failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTriggerScenarioFromLake = (alertData) => {
    const customParams = {
      id: `outburst_${alertData.alert_id || 'custom'}`,
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

    setSelectedPreset(customParams);
    setSimulationResult(null);

    handleRunSimulation({
      scenario_id: customParams.id,
      custom_params: customParams,
      solver_type: 'coupled',
      breach_model: 'landslide',
    }, true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row font-sans selection:bg-cyan-500 selection:text-slate-950 antialiased">
      {/* 1. Left Fixed Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenDem={() => setIsDemModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Topbar */}
        <Topbar
          selectedPreset={selectedPreset}
          presets={presets}
          onSelectPreset={handleSelectPreset}
          simulationResult={simulationResult}
          isSimulating={isSimulating}
          onRunSimulation={() =>
            handleRunSimulation({
              scenario_id: selectedPreset?.id,
              preset_id: selectedPreset?.id,
              solver_type: 'coupled',
            }, true)
          }
          onOpenScenarioDrawer={() => setIsScenarioDrawerOpen(true)}
          onOpenDem={() => setIsDemModalOpen(true)}
          onOpenExport={() => setIsExportModalOpen(true)}
        />

        {/* Page Content with Subtle Transitions */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {activeTab === 'overview' && (
                <Overview
                  selectedPreset={selectedPreset}
                  simulationResult={simulationResult}
                  onNavigate={setActiveTab}
                  onRunSimulation={() =>
                    handleRunSimulation({
                      scenario_id: selectedPreset?.id,
                      preset_id: selectedPreset?.id,
                      solver_type: 'coupled',
                    }, true)
                  }
                  isSimulating={isSimulating}
                />
              )}

              {activeTab === 'operations' && (
                <DamOperations
                  selectedPreset={selectedPreset}
                  simulationResult={simulationResult}
                  onOpenScenarioDrawer={() => setIsScenarioDrawerOpen(true)}
                  onRunSimulation={(payload) => handleRunSimulation(payload, true)}
                  isSimulating={isSimulating}
                />
              )}

              {activeTab === 'simulation' && (
                <SimulationLab
                  simulationResult={simulationResult}
                  selectedPreset={selectedPreset}
                  onRunSimulation={() =>
                    handleRunSimulation({
                      scenario_id: selectedPreset?.id,
                      preset_id: selectedPreset?.id,
                      solver_type: 'coupled',
                    }, false)
                  }
                  isSimulating={isSimulating}
                  isFullScreenMode={isFullScreenSimOpen}
                  onToggleFullScreen={() => setIsFullScreenSimOpen(!isFullScreenSimOpen)}
                />
              )}

              {activeTab === 'hadr' && (
                <HADRDashboard
                  selectedPreset={selectedPreset}
                  simulationResult={simulationResult}
                  onOpenExport={() => setIsExportModalOpen(true)}
                  isFullScreenMode={isFullScreenHadrOpen}
                  onToggleFullScreen={() => setIsFullScreenHadrOpen(!isFullScreenHadrOpen)}
                />
              )}

              {activeTab === 'satellite' && (
                <SatelliteMonitor
                  onTriggerScenarioFromLake={handleTriggerScenarioFromLake}
                />
              )}

              {activeTab === 'comparison' && (
                <ScenarioComparison
                  simulationResult={simulationResult}
                  selectedPreset={selectedPreset}
                  onRunSimulation={() =>
                    handleRunSimulation({
                      scenario_id: selectedPreset?.id,
                      preset_id: selectedPreset?.id,
                      solver_type: 'coupled',
                    }, true)
                  }
                  isSimulating={isSimulating}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. Sliding Drawers & Modals */}
      <ScenarioDrawer
        isOpen={isScenarioDrawerOpen}
        onClose={() => setIsScenarioDrawerOpen(false)}
        selectedPreset={selectedPreset}
        presets={presets}
        onSelectPreset={handleSelectPreset}
        onRunSimulation={(payload) => handleRunSimulation(payload, true)}
        isSimulating={isSimulating}
      />

      <ElevationProfileModal
        isOpen={isDemModalOpen}
        onClose={() => setIsDemModalOpen(false)}
        selectedPreset={selectedPreset}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        simulationResult={simulationResult}
        selectedPreset={selectedPreset}
      />
    </div>
  );
}
