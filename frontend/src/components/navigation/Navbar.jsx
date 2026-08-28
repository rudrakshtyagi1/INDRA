import React from 'react';
import { Waves, Shield, Activity, Satellite, Layers, BarChart2 } from 'lucide-react';

export default function Navbar({ activePage, onNavigate }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Waves },
    { id: 'operations', label: 'Dam Operations', icon: Shield },
    { id: 'lab', label: 'Simulation Lab', icon: Activity },
    { id: 'hadr', label: 'HADR Dashboard', icon: Shield },
    { id: 'satellite', label: 'Satellite Monitor', icon: Satellite },
    { id: 'comparison', label: 'Model Comparison', icon: BarChart2 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('overview')}>
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight block text-base">FloodLab</span>
            <span className="text-[10px] text-slate-400 font-mono block -mt-1">Hydrodynamic Digital Twin</span>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
