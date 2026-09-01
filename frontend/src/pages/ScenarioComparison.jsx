import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Terminal, RefreshCw } from 'lucide-react';
import { PROTOTYPE_METADATA } from '../data/prototype/tehriPrototypeRun';

const DOMAIN_TABS = [
  { id: 'sph', label: 'DualSPHysics', subtitle: 'Near-field 0–2 km', color: '#22d3ee' },
  { id: 'delft3d', label: 'Delft3D FM', subtitle: 'Far-field 2–100 km', color: '#3b82f6' },
  { id: 'diff', label: 'Co-Registration Difference', subtitle: 'Transect audit', color: '#a855f7' },
];

function SphDiagram() {
  return (
    <svg viewBox="0 0 480 280" className="w-full h-full">
      <rect x="0" y="0" width="480" height="280" fill="#06080f" />
      {/* Valley walls */}
      <path d="M 0,40 L 80,200 L 400,200 L 480,40" fill="none" stroke="#1e293b" strokeWidth="2" />
      {/* Particles */}
      {[
        [80,180,6,'#ef4444'], [100,175,5,'#ef4444'], [120,172,5,'#f97316'],
        [145,168,5,'#f97316'], [170,165,5,'#fbbf24'], [200,160,5,'#fbbf24'],
        [230,162,5,'#3b82f6'], [260,158,5,'#3b82f6'], [290,160,5,'#60a5fa'],
        [320,162,5,'#93c5fd'], [350,165,5,'#bfdbfe'], [380,168,4,'#dbeafe'],
      ].map(([cx, cy, r, fill], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={fill} opacity="0.85" />
      ))}
      {/* Wave front */}
      <path d="M 390,140 C 392,155 395,165 398,178" stroke="#22d3ee" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Coupling transect */}
      <line x1="420" y1="30" x2="420" y2="220" stroke="#a855f7" strokeWidth="2" strokeDasharray="6,4" />
      <text x="424" y="250" fill="#a855f7" fontSize="10" fontFamily="monospace">Transect x=2km</text>
      {/* Labels */}
      <text x="10" y="25" fill="#22d3ee" fontSize="11" fontFamily="monospace" fontWeight="600">DualSPHysics 3D SPH · Lagrangian Domain (0–2 km)</text>
      <text x="10" y="265" fill="#475569" fontSize="9" fontFamily="monospace">PROTOTYPE SCHEMATIC · Live solver coupling in standby</text>
    </svg>
  );
}

function Delft3dDiagram() {
  return (
    <svg viewBox="0 0 480 280" className="w-full h-full">
      <rect x="0" y="0" width="480" height="280" fill="#06080f" />
      {/* Mesh grid */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={`h${i}`} x1={30} y1={40 + i * 18} x2={450} y2={40 + i * 18}
          stroke="#1e293b" strokeWidth="1" />
      ))}
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={`v${i}`} x1={30 + i * 22} y1={40} x2={30 + i * 22} y2={250}
          stroke="#1e293b" strokeWidth="1" />
      ))}
      {/* Flood fill */}
      <polygon
        points="30,210 60,180 100,160 150,145 200,135 260,130 320,140 370,155 420,170 450,190 450,250 30,250"
        fill="#1d4ed8" fillOpacity="0.45" stroke="#3b82f6" strokeWidth="1.5"
      />
      {/* River channel */}
      <path
        d="M 200,40 C 210,80 205,120 210,150 C 215,180 210,220 205,250"
        stroke="#1e3a8a" strokeWidth="8" fill="none" opacity="0.7"
      />
      {/* Inflow boundary */}
      <line x1="30" y1="40" x2="30" y2="250" stroke="#a855f7" strokeWidth="3" strokeDasharray="6,4" />
      <text x="35" y="60" fill="#a855f7" fontSize="10" fontFamily="monospace">Inflow Q(t)</text>
      <text x="10" y="25" fill="#3b82f6" fontSize="11" fontFamily="monospace" fontWeight="600">Delft3D FM 2D SWE · Eulerian Mesh (2–145 km)</text>
      <text x="10" y="265" fill="#475569" fontSize="9" fontFamily="monospace">PROTOTYPE SCHEMATIC · Precomputed hydrodynamic routing</text>
    </svg>
  );
}

function DiffDiagram() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#06080f] p-6 text-center">
      <div className="max-w-md p-6 rounded-2xl bg-[var(--surface-2)] border border-[var(--surface-border)] flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Terminal className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-[var(--text-primary)]">
            Co-Registration Matrix Standby
          </h4>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed">
            Live inter-model spatial difference grid will be generated when DualSPHysics SPH particles and Delft3D Flexible Mesh cells execute concurrent cross-domain coupling.
          </p>
        </div>
        <span className="status-pill status-pill--prototype text-[8.5px]">
          SOLVER NOT EXECUTED · DATA UNAVAILABLE
        </span>
      </div>
    </div>
  );
}

export default function ScenarioComparison({ simulationResult, selectedPreset, onRunSimulation, isSimulating }) {
  const [activeDomain, setActiveDomain] = useState('sph');
  const meta = PROTOTYPE_METADATA;
  const metrics = meta.comparisonMetrics;

  const renderDiagram = () => {
    switch (activeDomain) {
      case 'sph': return <SphDiagram />;
      case 'delft3d': return <Delft3dDiagram />;
      case 'diff': return <DiffDiagram />;
    }
  };

  return (
    <div className="w-full h-full flex overflow-hidden bg-[var(--surface-0)]">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Label bar */}
        <div className="h-9 px-5 flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface-1)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
              Coupling Architecture Preview · DualSPHysics (0–2 km) → Delft3D FM (2–145 km)
            </span>
            <span className="status-pill status-pill--prototype">PROTOTYPE SCHEMATIC</span>
          </div>
          {/* Domain selector */}
          <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-lg p-1 border border-[var(--surface-border)]">
            {DOMAIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDomain(tab.id)}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold transition ${
                  activeDomain === tab.id
                    ? 'bg-[var(--surface-3)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Domain diagram — fills remaining */}
        <div className="flex-1 overflow-hidden relative p-4">
          <motion.div
            key={activeDomain}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full rounded-xl border border-[var(--surface-border)] overflow-hidden"
          >
            {renderDiagram()}
          </motion.div>

          {/* Active domain label */}
          <div className="absolute bottom-7 left-7 z-10">
            {DOMAIN_TABS.filter((t) => t.id === activeDomain).map((tab) => (
              <div key={tab.id} className="floating-control px-3 py-2">
                <p style={{ color: tab.color }} className="text-xs font-bold">{tab.label}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{tab.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right metrics inspector */}
      <div style={{ width: 'var(--inspector-width)', flexShrink: 0 }} className="border-l border-[var(--surface-border)] overflow-y-auto bg-[var(--surface-2)]">
        <div className="px-4 pt-4 pb-2 border-b border-[var(--surface-border)]">
          <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-1">
            Verification Metrics
          </p>
          <p className="text-xs font-semibold text-[var(--text-primary)]">Spatial Co-Registration Audit</p>
        </div>

        <div className="px-4 py-3 space-y-0.5 border-b border-[var(--surface-border)]">
          {[
            { l: 'Critical Success Index (CSI)', v: 'DATA UNAVAILABLE', thresh: 'Requires live coupled run', prov: 'SOLVER NOT EXECUTED' },
            { l: 'Probability of Detection (POD)', v: 'DATA UNAVAILABLE', thresh: 'Wet pixel TPR', prov: 'SOLVER NOT EXECUTED' },
            { l: 'False Alarm Ratio (FAR)', v: 'DATA UNAVAILABLE', thresh: 'Over-prediction ratio', prov: 'SOLVER NOT EXECUTED' },
            { l: 'Depth MAE (Δh)', v: 'DATA UNAVAILABLE', thresh: 'Mean absolute depth error', prov: 'SOLVER NOT EXECUTED' },
            { l: 'Peak Discharge Diff (ΔQp)', v: 'DATA UNAVAILABLE', thresh: 'Coupling transect conservation', prov: 'SOLVER NOT EXECUTED' },
          ].map(({ l, v, thresh, prov }) => (
            <div key={l} className="py-2.5 border-b border-[var(--surface-border)] last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-[var(--text-secondary)] leading-tight">{l}</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{thresh}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-mono font-bold text-[var(--text-muted)] tabular-nums">{v}</p>
                  <p className="text-[8px] text-[var(--text-muted)] font-mono mt-0.5">{prov}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Benchmark status */}
        <div className="px-4 py-4">
          <div className="rounded-xl p-3 bg-[var(--surface-3)] border border-[var(--surface-border)]">
            <p className="text-xs font-bold font-mono text-[var(--warning)] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[var(--warning)]" />
              <span>{metrics.benchmarkStatus}</span>
            </p>
            <p className="text-[9.5px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              {metrics.notes}
            </p>
          </div>
        </div>

        {/* Scientific Disclosure */}
        <div className="px-4 pb-4">
          <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">
            Tehri Dam breach scenario uses precomputed hydrodynamic wave envelopes. Formal inter-solver co-registration error metrics are not fabricated and will be computed upon live execution.
          </p>
        </div>
      </div>
    </div>
  );
}
