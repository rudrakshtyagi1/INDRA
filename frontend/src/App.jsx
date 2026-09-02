import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('overview');
  const [simTimeMin, setSimTimeMin] = useState(0);

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
