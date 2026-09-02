
import React, { useState } from 'react';
import { Activity, Map, LayoutTemplate, Building2, Database, ShieldAlert } from 'lucide-react';

export default function NavigationRail({ activeTab, onSelectTab }) {
  const [isHovered, setIsHovered] = useState(false);

  const NAV_ITEMS = [
    { id: 'overview', icon: LayoutTemplate, label: 'Overview' },
    { id: 'simulation', icon: Map, label: 'Simulation Lab' },
    { id: 'scenarios', icon: Activity, label: 'Scenarios' },
    { id: 'hadr', icon: ShieldAlert, label: 'HADR Operations' },
    { id: 'exposure', icon: ShieldAlert, label: 'Exposure' },
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
