import os

# --- 1. App.jsx ---
app_code = """
import React, { useState } from 'react';
import WorkspaceShell from './layout/WorkspaceShell';
import Overview from './pages/Overview';
import SimulationLab from './pages/SimulationLab';
import HADRDashboard from './pages/HADRDashboard';
import ScenarioComparison from './pages/ScenarioComparison';
import Infrastructure from './pages/Infrastructure';
import DataProvenance from './pages/DataProvenance';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [simTimeMin, setSimTimeMin] = useState(0);

  const renderPage = () => {
    switch (activeTab) {
      case 'overview': return <Overview onNavigate={setActiveTab} />;
      case 'simulation': return <SimulationLab initialTimeMin={simTimeMin} onTimeChange={setSimTimeMin} onNavigateToHadr={() => setActiveTab('hadr')} />;
      case 'scenarios': return <ScenarioComparison />;
      case 'hadr': return <HADRDashboard />;
      case 'infrastructure': return <Infrastructure />;
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
"""

with open("frontend/src/App.jsx", "w") as f:
    f.write(app_code)


# --- 2. NavigationRail.jsx ---
nav_code = """
import React, { useState } from 'react';
import { Activity, Map, LayoutTemplate, ShieldAlert, Database, Building2 } from 'lucide-react';

export default function NavigationRail({ activeTab, onSelectTab }) {
  const [isHovered, setIsHovered] = useState(false);

  const NAV_ITEMS = [
    { id: 'overview', icon: LayoutTemplate, label: 'Overview' },
    { id: 'simulation', icon: Map, label: 'Simulation Lab' },
    { id: 'scenarios', icon: Activity, label: 'Scenarios' },
    { id: 'hadr', icon: ShieldAlert, label: 'HADR Operations' },
    { id: 'infrastructure', icon: Building2, label: 'Infrastructure' },
    { id: 'data', icon: Database, label: 'Data & Provenance' },
  ];

  return (
    <div 
      className="bg-white border-r border-slate-200 h-full flex flex-col items-start transition-all duration-300 overflow-hidden shrink-0 shadow-sm z-50 relative"
      style={{ width: isHovered ? '240px' : '64px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-14 flex items-center px-4 w-full shrink-0 border-b border-slate-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm">FL</span>
        </div>
        <span className="ml-3 font-bold text-slate-800 tracking-tight whitespace-nowrap opacity-100 transition-opacity">
          FloodLab V2
        </span>
      </div>
      
      <div className="flex-1 w-full py-4 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelectTab(id)}
              className={`flex items-center w-full h-10 px-2.5 rounded-lg transition-colors overflow-hidden ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`ml-3 text-sm font-semibold whitespace-nowrap ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="p-4 w-full border-t border-slate-100">
         <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
            <span className="text-xs font-semibold text-slate-500">System Active</span>
         </div>
      </div>
    </div>
  );
}
"""

with open("frontend/src/layout/NavigationRail.jsx", "w") as f:
    f.write(nav_code)

# --- 3. WorkspaceShell.jsx ---
shell_code = """
import React from 'react';
import NavigationRail from './NavigationRail';

export default function WorkspaceShell({ activeTab, onSelectTab, children }) {
  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      <NavigationRail activeTab={activeTab} onSelectTab={onSelectTab} />
      <div className="flex-1 h-full relative flex flex-col min-w-0">
        {/* We removed the bulky top bar to maximize map area. The pages will render their own minimal breadcrumbs if needed. */}
        <main className="flex-1 h-full w-full relative overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
"""
with open("frontend/src/layout/WorkspaceShell.jsx", "w") as f:
    f.write(shell_code)

# --- 4. DataProvenance.jsx ---
data_page = """
import React from 'react';
import { Database, ShieldCheck, FileCheck } from 'lucide-react';

export default function DataProvenance() {
  const sources = [
    { source: 'Copernicus GLO-30', purpose: 'Terrain Definition & Channel Topography', time: 'Static', space: 'Global', type: 'Remote Sensing', status: 'USED' },
    { source: 'ERA5-Land', purpose: 'Catchment Rainfall Forcing', time: 'Hourly', space: '9 km', type: 'Reanalysis', status: 'USED' },
    { source: 'CWC Tekhla', purpose: 'Hydrologic QA / Boundary condition validation', time: 'Daily', space: 'Point', type: 'Observed Gauge', status: 'USED' },
    { source: 'CWC Koteshwar', purpose: 'Downstream QA', time: 'Daily', space: 'Point', type: 'Observed Gauge', status: 'USED' },
    { source: 'HydroRIVERS', purpose: 'River routing context', time: 'Static', space: 'Global', type: 'Geospatial', status: 'USED' },
    { source: 'ESA WorldCover', purpose: 'Land-cover context / Roughness estimation', time: '2021', space: '10 m', type: 'Remote Sensing', status: 'USED' },
    { source: 'OpenStreetMap', purpose: 'Infrastructure, Roads, HADR Routing', time: 'Dynamic', space: 'Global', type: 'Open Geospatial', status: 'USED' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Data & Provenance</h1>
        <p className="text-slate-500">FloodLab core is physics-based. It does not use ML training for hydrodynamic prediction. All inputs are derived from physical observables or numerical solvers.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800">Verified V3 Data Pipeline</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Purpose</th>
                <th className="px-6 py-3">Time Coverage</th>
                <th className="px-6 py-3">Spatial Coverage</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map(s => (
                <tr key={s.source} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.source}</td>
                  <td className="px-6 py-4 text-slate-600">{s.purpose}</td>
                  <td className="px-6 py-4 text-slate-600">{s.time}</td>
                  <td className="px-6 py-4 text-slate-600">{s.space}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-mono">{s.type}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md tracking-wider">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
"""
with open("frontend/src/pages/DataProvenance.jsx", "w") as f:
    f.write(data_page)

