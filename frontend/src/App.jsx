import React, { useState, useEffect } from 'react';
import { RunProvider } from './context/RunContext';
import WorkspaceShell from './layout/WorkspaceShell';
import Overview from './pages/Overview';
import PhysicsPipeline from './pages/PhysicsPipeline';
import HydrologyLab from './pages/HydrologyLab';
import SimulationLab from './pages/SimulationLab';
import ScenariosWorkspace from './pages/ScenariosWorkspace';
import Exposure from './pages/Exposure';
import DamageAssessment from './pages/DamageAssessment';
import HADRDashboard from './pages/HADRDashboard';
import SatelliteMonitor from './pages/SatelliteMonitor';
import ModelsQA from './pages/ModelsQA';
import DataProvenance from './pages/DataProvenance';
import GuidedScienceTour from './components/guided/GuidedScienceTour';

export default function App() {
  const getInitialTab = () => {
    let hash = window.location.hash.replace('#', '');
    if (hash.includes('?')) hash = hash.split('?')[0];
    if (hash) return hash;
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  };

  const getInitialTour = () => {
    if (typeof window === 'undefined') return false;
    if (window.location.hash.includes('tour=true') || window.location.hash === '#tour') return true;
    if (new URLSearchParams(window.location.search).get('tour') === 'true') return true;
    return false;
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [simTimeMin, setSimTimeMin] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(getInitialTour);

  const setActiveTab = (tab) => {
    window.location.hash = tab;
    setActiveTabState(tab);
  };

  useEffect(() => {
    const onHashChange = () => {
      let h = window.location.hash.replace('#', '');
      if (h.includes('tour=true') || h === 'tour') setIsTourOpen(true);
      if (h.includes('?')) h = h.split('?')[0];
      if (h) setActiveTabState(h);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview onNavigate={setActiveTab} onOpenTour={() => setIsTourOpen(true)} />;
      case 'physics':
      case 'pipeline':
        return <PhysicsPipeline onNavigate={setActiveTab} />;
      case 'hydrology':
        return <HydrologyLab />;
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
        return <Overview onNavigate={setActiveTab} onOpenTour={() => setIsTourOpen(true)} />;
    }
  };

  return (
    <RunProvider>
      <WorkspaceShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenTour={() => setIsTourOpen(true)}
      >
        {renderPage()}
        <GuidedScienceTour
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          onNavigate={setActiveTab}
        />
      </WorkspaceShell>
    </RunProvider>
  );
}
