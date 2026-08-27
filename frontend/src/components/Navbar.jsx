import React from 'react';
import { Waves, Activity, SplitSquareVertical, AlertTriangle, Satellite, Mountain, Download, Play, CloudRain, Dice5 } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  selectedPreset,
  presets,
  onSelectPreset,
  onOpenDem,
  onOpenExport,
  isSimulating,
  onQuickRun
}) {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                  FLOODLAB
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                  SIH 2026 PS 26161
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Tehri Dam Decision-Support Platform</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'builder'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Mountain className="w-3.5 h-3.5" />
              <span>Scenario Builder</span>
            </button>

            <button
              onClick={() => setActiveTab('hydrology')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'hydrology'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>SCS-CN Hydrology</span>
            </button>

            <button
              onClick={() => setActiveTab('viewer')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'viewer'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Hydrodynamics</span>
            </button>

            <button
              onClick={() => setActiveTab('uncertainty')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'uncertainty'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Dice5 className="w-3.5 h-3.5" />
              <span>Uncertainty</span>
            </button>

            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>SPH vs Delft3D</span>
            </button>

            <button
              onClick={() => setActiveTab('damage')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'damage'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>HADR Evacuation</span>
            </button>

            <button
              onClick={() => setActiveTab('gee')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'gee'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Sentinel-1 SAR</span>
            </button>
          </nav>

          {/* Quick Actions & Preset Selector */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedPreset?.id || ''}
              onChange={(e) => onSelectPreset(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-cyan-500"
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.length > 32 ? p.name.substring(0, 30) + '...' : p.name}
                </option>
              ))}
            </select>

            <button
              onClick={onOpenDem}
              title="View River DEM & Cross Sections"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 border border-slate-700 transition"
            >
              <Mountain className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenExport}
              title="Export Shapefile / KML / Reports"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 border border-slate-700 transition"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onQuickRun}
              disabled={isSimulating}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md transition ${
                isSimulating
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold glow-cyan'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : 'fill-slate-950'}`} />
              <span>{isSimulating ? 'Simulating...' : 'Run Scenario'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
