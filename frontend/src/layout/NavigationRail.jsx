import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  Map,
  Satellite,
  ShieldAlert,
} from 'lucide-react';

export default function NavigationRail({ activeTab, onSelectTab }) {
  const [isHovered, setIsHovered] = useState(false);

  const NAV_ITEMS = [
    { id: 'overview', icon: LayoutDashboard, label: 'Command Center' },
    { id: 'simulation', icon: Map, label: 'Simulation Lab' },
    { id: 'scenarios', icon: Activity, label: 'Scenario Builder' },
    { id: 'exposure', icon: ShieldAlert, label: 'Exposure & Assets' },
    { id: 'damage', icon: FileSpreadsheet, label: 'Damage Assessment' },
    { id: 'hadr', icon: ShieldAlert, label: 'HADR Operations' },
    { id: 'satellite', icon: Satellite, label: 'Satellite Monitor' },
    { id: 'models_qa', icon: CheckCircle2, label: 'Models & Numerical QA' },
    { id: 'data', icon: Database, label: 'Data & Provenance' },
  ];

  return (
    <div
      className="bg-white border-r border-slate-200 h-full flex flex-col items-start transition-all duration-300 overflow-hidden shrink-0 shadow-xs z-30 select-none relative"
      style={{ width: isHovered ? '240px' : '64px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand */}
      <div className="h-14 flex items-center px-4 w-full shrink-0 border-b border-slate-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm tracking-tight">FL</span>
        </div>
        <div className={`ml-3 transition-opacity duration-200 overflow-hidden ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="font-bold text-slate-900 text-sm tracking-tight whitespace-nowrap">FloodLab</div>
          <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Hydrodynamic GIS Platform</div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 w-full py-3 flex flex-col gap-1 px-2.5 overflow-y-auto">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelectTab(id)}
              className={`flex items-center w-full h-10 px-2.5 rounded-lg transition-colors overflow-hidden ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
              title={!isHovered ? label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`ml-3 text-xs tracking-tight whitespace-nowrap transition-opacity ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer system status */}
      <div className="p-3 w-full border-t border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap px-1 py-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className={`text-[11px] font-semibold text-slate-500 transition-opacity ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            SIH Benchmark Ready
          </span>
        </div>
      </div>
    </div>
  );
}
