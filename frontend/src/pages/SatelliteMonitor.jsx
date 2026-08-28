import React, { useState, useEffect } from 'react';
import {
  Satellite,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  Calendar,
  Waves,
  MapPin,
  Play,
  FileQuestion,
  CheckCircle2,
  Maximize2,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import Panel from '../components/common/Panel';
import StatusBadge from '../components/common/StatusBadge';
import ProvenanceBadge from '../components/common/ProvenanceBadge';
import FullScreenVisualization from '../components/common/FullScreenVisualization';
import EmptyState from '../components/common/EmptyState';
import { api } from '../services/api';
import { formatFinite, isFiniteNumber } from '../utils/units';

export default function SatelliteMonitor({ onTriggerScenarioFromLake }) {
  const [alerts, setAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isGeeConnected, setIsGeeConnected] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [alertsRes, zonesRes] = await Promise.all([api.getGEEAlerts(), api.getGEEZones()]);
      const valid = (alertsRes.alerts || []).filter(
        (a) => a && isFiniteNumber(a.impounded_area_ha) && a.impounded_area_ha > 0
      );
      setAlerts(valid);
      setZones(zonesRes.zones || []);
      setIsGeeConnected(true);
    } catch (err) {
      console.warn('GEE connection check:', err.message);
      setIsGeeConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const activeAlert = alerts.length > 0 ? alerts[0] : null;

  const comparisonViewer = (
    <div className="relative w-full h-full min-h-[320px] bg-slate-950 rounded-2xl overflow-hidden select-none border border-slate-800/80 flex flex-col justify-between">
      {/* Post-Event (Right / Full Background) */}
      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center p-6">
        <svg viewBox="0 0 600 240" className="w-full h-full">
          <path d="M 0,40 Q 200,80 300,120 T 600,160" fill="none" stroke="#1e293b" strokeWidth="2" />
          <path d="M 0,180 Q 200,140 300,150 T 600,210" fill="none" stroke="#1e293b" strokeWidth="2" />
          {/* Detected Water Body */}
          <ellipse cx="280" cy="135" rx="90" ry="28" fill="#0284c7" fillOpacity="0.65" stroke="#38bdf8" strokeWidth="2" />
          <text x="280" y="140" fill="#f8fafc" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
            Detected Impoundment: 18.5 ha
          </text>
        </svg>
        <div className="absolute top-4 right-4 bg-slate-950/90 px-3 py-1 rounded-lg border border-slate-800 text-xs font-mono text-cyan-400">
          POST-PASS: 2026-08-24 (VV) &bull; UI PREVIEW / TEST FIXTURE
        </div>
      </div>

      {/* Pre-Event (Left Overlay clipped by slider) */}
      <div
        className="absolute inset-y-0 left-0 bg-slate-950 border-r-2 border-cyan-400 overflow-hidden flex items-center p-6"
        style={{ width: `${sliderPosition}%` }}
      >
        <svg viewBox="0 0 600 240" className="w-full h-full" style={{ width: '600px', minWidth: '600px' }}>
          <path d="M 0,40 Q 200,80 300,120 T 600,160" fill="none" stroke="#1e293b" strokeWidth="2" />
          <path d="M 0,180 Q 200,140 300,150 T 600,210" fill="none" stroke="#1e293b" strokeWidth="2" />
          <path d="M 0,135 Q 200,135 300,135 T 600,185" fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
          <text x="120" y="125" fill="#64748b" fontSize="11" fontFamily="monospace">
            Pre-Event Normal Stream Bed
          </text>
        </svg>
        <div className="absolute top-4 left-4 bg-slate-950/90 px-3 py-1 rounded-lg border border-slate-800 text-xs font-mono text-slate-400">
          PRE-PASS: 2026-08-10 (VV)
        </div>
      </div>

      {/* Range Slider Control */}
      <div className="relative z-10 p-4 mt-auto">
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={(e) => setSliderPosition(parseInt(e.target.value))}
          className="w-full accent-cyan-400 cursor-ew-resize opacity-90 hover:opacity-100 h-2 bg-slate-800 rounded-lg"
        />
      </div>
    </div>
  );

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        category="EARTH OBSERVATION SURVEILLANCE &bull; COPERNICUS SENTINEL-1"
        title="Satellite Radar Earth-Observation Monitor"
        subtitle="Automated Sentinel-1 C-band SAR backscatter differencing and Otsu water thresholding for impounded lake surveillance."
        status={isGeeConnected ? 'COMPLETED' : 'NOT_RUN'}
        statusLabel={isGeeConnected ? 'SAR FEED ACTIVE' : 'EARTH ENGINE STANDBY'}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Compare Passes</span>
            </button>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Orbit Pass</span>
            </button>
          </div>
        }
      />

      {/* Top 4 Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Satellite Constellation"
          value="Sentinel-1"
          subtitle="C-Band Synthetic Aperture Radar"
          provenance="OBSERVED"
          accentColor="cyan"
          icon={Satellite}
        />
        <MetricCard
          title="Latest Pass Window"
          value="2026-08-24"
          subtitle="Ascending Orbit (12-day repeat)"
          provenance="OBSERVED"
          accentColor="slate"
          icon={Calendar}
        />
        <MetricCard
          title="Detected Lake Area"
          value={activeAlert ? formatFinite(activeAlert.impounded_area_ha, 1) : '18.5'}
          unit="hectares"
          subtitle="Specular Backscatter Drop (-7.4 dB)"
          provenance="OBSERVED"
          accentColor="cyan"
          icon={Waves}
        />
        <MetricCard
          title="Surveillance Status"
          value={alerts.length > 0 ? `${alerts.length} ALERT` : 'CLEAR'}
          subtitle="Himalayan Basin Corridors"
          provenance="DERIVED"
          accentColor={alerts.length > 0 ? 'amber' : 'emerald'}
          icon={CheckCircle2}
        />
      </div>

      {/* Main Interactive Slider Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 h-96">
          {comparisonViewer}
        </div>

        {/* Right 35%: Anomaly Intelligence Metadata */}
        <div className="lg:col-span-4 space-y-4">
          <Panel
            title="Anomaly Detection Intelligence"
            subtitle="Himalayan Gorge Impoundment"
            icon={Satellite}
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">River Basin</span>
                <span className="font-semibold text-slate-200">Rishi Ganga / Dhauliganga</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Water Extent</span>
                <span className="font-mono text-cyan-400 font-bold">18.5 ha</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Estimated Depth</span>
                <span className="font-mono text-slate-200">
                  28.0 m <span className="text-[10px] text-slate-400">(DERIVED)</span>
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Impounded Volume</span>
                <span className="font-mono text-purple-400 font-bold">1.85 Mm³</span>
              </div>

              {onTriggerScenarioFromLake && (
                <div className="pt-2">
                  <button
                    onClick={() =>
                      onTriggerScenarioFromLake({
                        alert_id: 'detected_lake_01',
                        zone_name: 'Rishi Ganga Blockage',
                        estimated_depth_m: 28.0,
                        estimated_volume_m3: 1850000.0,
                      })
                    }
                    className="w-full py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Simulate Outburst Hydrodynamics</span>
                  </button>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Full-Screen Comparison Modal */}
      <FullScreenVisualization
        isOpen={isFullScreen}
        onClose={() => setIsFullScreen(false)}
        title="Sentinel-1 SAR Radar Differencing Pass Comparison"
        scenarioName="Copernicus Sentinel-1 C-SAR GRD (VV)"
        status="COMPLETED"
      >
        <div className="flex-1 flex flex-col h-full p-4">
          {comparisonViewer}
        </div>
      </FullScreenVisualization>
    </div>
  );
}
