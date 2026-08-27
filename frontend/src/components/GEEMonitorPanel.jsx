import React, { useState, useEffect } from 'react';
import {
  Satellite,
  AlertCircle,
  Play,
  Layers,
  Sparkles,
  CheckCircle,
  Calendar,
  Waves,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';

export default function GEEMonitorPanel({ onTriggerScenarioFromLake }) {
  const [alerts, setAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [sarAnalysisResult, setSarAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [alertsRes, zonesRes] = await Promise.all([api.getGEEAlerts(), api.getGEEZones()]);
      setAlerts(alertsRes.alerts || []);
      setZones(zonesRes.zones || []);
      if (zonesRes.zones?.length) {
        setSelectedZone(zonesRes.zones[0]);
      }
    } catch (err) {
      console.error('Failed to load GEE data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCustomSAR = async () => {
    if (!selectedZone) return;
    setIsAnalyzing(true);
    try {
      const bbox = [
        selectedZone.lon - 0.05,
        selectedZone.lat - 0.05,
        selectedZone.lon + 0.05,
        selectedZone.lat + 0.05,
      ];
      const res = await api.runSARAnalysis(bbox, '2026-08-10', '2026-08-24', 'VV');
      setSarAnalysisResult(res);
    } catch (err) {
      console.error('SAR analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Satellite className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-slate-100">
                Google Earth Engine (GEE) Sentinel-1 SAR Surveillance
              </h2>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-semibold">
                Near-Real-Time SAR GRD
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Automated Sentinel-1 C-band SAR backscatter change detection and Otsu water thresholding to detect landslide dams & GLOFs.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Active Satellite Early Warning Alerts Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-emerald-400" />
          <span>Active Landslide-Dammed Lake & Inundation Alerts</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alt) => (
            <div
              key={alt.alert_id}
              className="bg-slate-900/80 border border-emerald-500/40 rounded-xl p-4 space-y-3 shadow-lg shadow-emerald-950/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{alt.zone_name}</span>
                </span>
                <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  {alt.severity} ALERT
                </span>
              </div>

              <p className="text-xs text-slate-300">
                {alt.risk_type} detected along <strong>{alt.river}</strong> via Sentinel-1 SAR change detection.
              </p>

              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">Lake Area</span>
                  <span className="text-xs font-bold text-slate-100">{alt.impounded_area_ha} ha</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Est. Depth</span>
                  <span className="text-xs font-bold text-slate-100">{alt.estimated_depth_m} m</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Impounded Vol</span>
                  <span className="text-xs font-bold text-cyan-400">{(alt.estimated_volume_m3 / 1e6).toFixed(2)} Mm³</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                <span>Confidence: <strong>{(alt.confidence * 100).toFixed(0)}%</strong></span>
                <button
                  onClick={() => onTriggerScenarioFromLake(alt)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center space-x-1 transition shadow"
                >
                  <Play className="w-3 h-3 fill-slate-950" />
                  <span>Simulate Outburst Flood</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* On-Demand Satellite SAR Analysis Workflow */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 pb-2 border-b border-slate-800">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>On-Demand Sentinel-1 SAR Change Detection & Otsu Thresholding</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Surveillance Zone</label>
            <select
              value={selectedZone?.id || ''}
              onChange={(e) => {
                const z = zones.find((item) => item.id === e.target.value);
                setSelectedZone(z);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Pre-Event Reference Date</label>
            <input
              type="date"
              defaultValue="2026-08-10"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Post-Event Surveillance Date</label>
            <input
              type="date"
              defaultValue="2026-08-24"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleRunCustomSAR}
          disabled={isAnalyzing}
          className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/40 text-xs font-bold transition flex items-center space-x-2"
        >
          <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Processing Sentinel-1 SAR Differencing...' : 'Execute SAR Water Extraction'}</span>
        </button>

        {/* SAR Result Panel */}
        {sarAnalysisResult && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">
                SAR Analysis Output: {sarAnalysisResult.satellite} ({sarAnalysisResult.polarization})
              </span>
              <span className="text-[10px] text-slate-400">Otsu Threshold: {sarAnalysisResult.otsu_threshold_db} dB</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">AOI Area</span>
                <span className="text-xs font-bold text-slate-200">{sarAnalysisResult.aoi_area_km2} km²</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Backscatter Drop</span>
                <span className="text-xs font-bold text-red-400">{sarAnalysisResult.mean_backscatter_difference_db} dB</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">New Inundated Area</span>
                <span className="text-xs font-bold text-cyan-400">{sarAnalysisResult.detected_water.inundated_area_ha} ha</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Estimated Volume</span>
                <span className="text-xs font-bold text-sky-400">{(sarAnalysisResult.detected_water.estimated_impounded_volume_m3 / 1e6).toFixed(2)} Mm³</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
