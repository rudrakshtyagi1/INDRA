import React, { useState, useEffect } from 'react';
import { RunProvider } from './context/RunContext';
import WorkspaceShell from './layout/WorkspaceShell';
import Overview from './pages/Overview';
import SimulationLab from './pages/SimulationLab';
import ScenariosWorkspace from './pages/ScenariosWorkspace';
import Exposure from './pages/Exposure';
import DamageAssessment from './pages/DamageAssessment';
import HADRDashboard from './pages/HADRDashboard';
import SatelliteMonitor from './pages/SatelliteMonitor';
import ModelsQA from './pages/ModelsQA';
import DataProvenance from './pages/DataProvenance';

export default function App() {
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) return hash;
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [simTimeMin, setSimTimeMin] = useState(0);

  const setActiveTab = (tab) => {
    window.location.hash = tab;
    setActiveTabState(tab);
  };

  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.replace('#', '');
      if (h) setActiveTabState(h);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview onNavigate={setActiveTab} />;
      case 'simulation':
        return (
          <SimulationLab
            initialTimeMin={simTimeMin}
            onTimeChange={setSimTimeMin}
            onNavigateToHadr={() => setActiveTab('hadr')}
          />
        );
      case 'scenarios':
        return <ScenariosWorkspace onNavigate={setActiveTab} />;
      case 'exposure':
        return <Exposure />;
      case 'damage':
        return <DamageAssessment />;
      case 'hadr':
        return <HADRDashboard />;
      case 'satellite':
        return <SatelliteMonitor />;
      case 'models_qa':
        return <ModelsQA />;
      case 'data':
        return <DataProvenance />;
      default:
        return <Overview onNavigate={setActiveTab} />;
    }
  };

  return (
    <RunProvider>
      <WorkspaceShell activeTab={activeTab} onSelectTab={setActiveTab}>
        {renderPage()}
      </WorkspaceShell>
    </RunProvider>
  );
}
