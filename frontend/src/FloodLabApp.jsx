import React, { useState } from 'react';
import Navbar from './components/navigation/Navbar';
import Overview from './pages/Overview';
import DamOperations from './pages/DamOperations';
import SimulationLab from './pages/SimulationLab';
import HADRDashboard from './pages/HADRDashboard';
import SatelliteMonitor from './pages/SatelliteMonitor';
import ScenarioComparison from './pages/ScenarioComparison';
import { runSimulation } from './services/simulationApi';

export default function FloodLabApp() {
  const [activePage, setActivePage] = useState('overview');
  const [currentResult, setCurrentResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunSimulation = async (payload) => {
    setIsRunning(true);
    try {
      const res = await runSimulation(payload);
      setCurrentResult(res);
      setActivePage('lab');
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectScenario = (scenarioId) => {
    setActivePage('operations');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <Navbar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1">
        {activePage === 'overview' && (
          <Overview
            onSelectScenario={handleSelectScenario}
            onNavigate={setActivePage}
          />
        )}
        {activePage === 'operations' && (
          <DamOperations
            onRunSimulation={handleRunSimulation}
            isRunning={isRunning}
          />
        )}
        {activePage === 'lab' && <SimulationLab result={currentResult} />}
        {activePage === 'hadr' && <HADRDashboard result={currentResult} />}
        {activePage === 'satellite' && <SatelliteMonitor />}
        {activePage === 'comparison' && <ScenarioComparison />}
      </main>
    </div>
  );
}
