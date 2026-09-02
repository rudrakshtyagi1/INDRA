
import React, { useState } from 'react';
import WorkspaceShell from './layout/WorkspaceShell';
import Overview from './pages/Overview';
import SimulationLab from './pages/SimulationLab';
import HADRDashboard from './pages/HADRDashboard';
import ScenariosWorkspace from './pages/ScenariosWorkspace';
import ScenarioComparison from './pages/ScenarioComparison';
import Exposure from './pages/Exposure';
import DataProvenance from './pages/DataProvenance';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [simTimeMin, setSimTimeMin] = useState(0);

  const renderPage = () => {
    switch (activeTab) {
      case 'overview': return <Overview onNavigate={setActiveTab} />;
      case 'simulation': return <SimulationLab initialTimeMin={simTimeMin} onTimeChange={setSimTimeMin} onNavigateToHadr={() => setActiveTab('hadr')} />;
      case 'scenarios': return <ScenariosWorkspace onNavigate={setActiveTab} />;
      case 'comparison': return <ScenarioComparison />;
      case 'hadr': return <HADRDashboard />;
      case 'exposure': return <Exposure />;
      case 'data': return <DataProvenance />;
      default: return <Overview onNavigate={setActiveTab} />;
    }
  };

  return (
    <WorkspaceShell activeTab={activeTab} onSelectTab={setActiveTab}>
      {renderPage()}
    </WorkspaceShell>
  );
}
