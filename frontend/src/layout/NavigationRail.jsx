import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Globe,
  LayoutDashboard,
  Map,
  Satellite,
  ShieldAlert,
} from 'lucide-react';

export default function NavigationRail({ activeTab, onSelectTab }) {
  const [isHovered, setIsHovered] = useState(false);

  const NAV_ITEMS = [
    { id: 'overview', icon: LayoutDashboard, label: 'Command Center', tag: 'OPS' },
    { id: 'simulation', icon: Map, label: 'Simulation Lab', tag: 'SIM' },
    { id: 'scenarios', icon: Activity, label: 'Scenario Builder', tag: 'SCN' },
    { id: 'exposure', icon: ShieldAlert, label: 'Exposure & Assets', tag: 'EXP' },
    { id: 'damage', icon: FileSpreadsheet, label: 'Damage Assessment', tag: 'DMG' },
    { id: 'hadr', icon: Globe, label: 'HADR Operations', tag: 'HADR' },
    { id: 'satellite', icon: Satellite, label: 'Satellite Monitor', tag: 'SAR' },
    { id: 'models_qa', icon: CheckCircle2, label: 'Models & QA', tag: 'QA' },
    { id: 'data', icon: Database, label: 'Data & Provenance', tag: 'DATA' },
  ];

  return (
    <nav
      className="bg-[#0B0F19] border-r border-slate-800 h-full flex flex-col items-start transition-all duration-200 overflow-hidden shrink-0 z-30 select-none shadow-2xl relative"
      style={{ width: isHovered ? '220px' : '60px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand Header */}
      <div className="h-11 flex items-center px-3.5 w-full shrink-0 border-b border-slate-800">
        <div className="w-7 h-7 bg-sky-600 rounded flex items-center justify-center shrink-0 font-bold text-white text-xs">
          FL
        </div>
        <div className={`ml-3 transition-opacity duration-150 overflow-hidden ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="font-bold text-slate-100 text-xs tracking-wider uppercase">FloodLab</div>
          <div className="text-[9px] text-slate-400 font-mono">C2 GIS Console</div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex-1 w-full py-2 flex flex-col gap-0.5 px-2 overflow-y-auto">
        {NAV_ITEMS.map(({ id, icon: Icon, label, tag }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelectTab(id)}
              className={`flex items-center w-full h-9 px-2 rounded transition-colors overflow-hidden ${
                isActive
                  ? 'bg-sky-950/80 text-sky-400 border border-sky-800 font-bold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 font-medium'
              }`}
              title={!isHovered ? label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`ml-3 text-[11px] tracking-tight whitespace-nowrap transition-opacity flex-1 text-left ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}>
                {label}
              </span>
              {isHovered && (
                <span className="text-[8px] font-mono font-semibold px-1 rounded bg-slate-800 text-slate-400 ml-1">
                  {tag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="p-2.5 w-full border-t border-slate-800 shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap px-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <span className={`text-[10px] font-mono text-slate-400 transition-opacity ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            C2 ENGINE READY
          </span>
        </div>
      </div>
    </nav>
  );
}
