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
  FileQuestion,
} from 'lucide-react';
import { api } from '../services/api';
import { formatFinite, isFiniteNumber } from '../utils/units';

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
      const validAlerts = (alertsRes.alerts || []).filter(
        (a) =>
          a &&
          isFiniteNumber(a.impounded_area_ha) &&
          a.impounded_area_ha > 0 &&
          isFiniteNumber(a.confidence) &&
          a.confidence > 0.3
      );
      setAlerts(validAlerts);
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
                Satellite Sentinel-1 C-Band SAR Surveillance
              </h2>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-semibold">
                Backscatter Amplitude Change
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Surveillance of C-band SAR backscatter reduction (specular reflection over standing water) and Otsu thresholding across vulnerable Himalayan corridors.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh SAR Pass</span>
          </button>
        </div>
      </div>

      {/* Active Satellite Early Warning Alerts Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-emerald-400" />
          <span>Observed Surface Water &amp; Impoundment Alerts</span>
        </h3>

        {alerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alt) => (
              <div
                key={alt.alert_id || alt.id}
                className="bg-slate-900/80 border border-emerald-500/40 rounded-xl p-4 space-y-3 shadow-lg shadow-emerald-950/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{alt.zone_name}</span>
                  </span>
                  <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-mono font-bold">
                    {alt.severity || 'WATCH'} ALERT
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  {alt.risk_type || 'Surface water expansion'} detected along <strong>{alt.river}</strong> via Sentinel-1 SAR change detection.
                </p>

                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Water Area</span>
                    <span className="text-xs font-bold text-slate-100 font-mono">
                      {formatFinite(alt.impounded_area_ha, 1)} ha
                    </span>
                    <span className="text-[9px] text-slate-500 block">OBSERVED</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Est. Depth</span>
                    <span className="text-xs font-bold text-slate-100 font-mono">
                      {formatFinite(alt.estimated_depth_m, 1)} m
                    </span>
                    <span className="text-[9px] text-slate-500 block">DERIVED</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Est. Volume</span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">
                      {formatFinite((alt.estimated_volume_m3 || 0) / 1e6, 2)} Mm³
                    </span>
                    <span className="text-[9px] text-slate-500 block">MODELLED</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>
                    Confidence: <strong>{formatFinite((alt.confidence || 0) * 100, 0)}%</strong>
                  </span>
                  {onTriggerScenarioFromLake && (
                    <button
                      onClick={() => onTriggerScenarioFromLake(alt)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center space-x-1 transition shadow"
                    >
                      <Play className="w-3 h-3 fill-slate-950" />
                      <span>Simulate Outburst</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            No confirmed active water impoundment anomalies detected in latest SAR passes.
          </div>
        )}
      </div>

      {/* On-Demand Sentinel-1 SAR Processing */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 pb-2 border-b border-slate-800">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>On-Demand SAR Backscatter Differencing Analysis</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Target Monitoring Zone</label>
            <select
              value={selectedZone?.id || ''}
              onChange={(e) => {
                const z = zones.find((item) => item.id === e.target.value);
                setSelectedZone(z);
              }}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <span>Observation Window:</span>
            <div className="font-mono text-[11px] text-cyan-400 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
              Pre: 2026-08-10 | Post: 2026-08-24 (VV)
            </div>
          </div>

          <button
            onClick={handleRunCustomSAR}
            disabled={isAnalyzing}
            className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAnalyzing ? 'Extracting Backscatter...' : 'Run SAR Detection'}</span>
          </button>
        </div>

        {sarAnalysisResult && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">Analysis Summary</span>
              <span className="font-mono text-emerald-400">
                PROVENANCE: {sarAnalysisResult.provenance || 'OBSERVED'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Water Area</span>
                <span className="text-xs font-bold text-slate-100">
                  {formatFinite(sarAnalysisResult.detected_water_area_ha, 1)} ha
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Otsu Threshold</span>
                <span className="text-xs font-bold text-cyan-400">
                  {formatFinite(sarAnalysisResult.otsu_threshold_db, 1)} dB
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Water Change</span>
                <span className="text-xs font-bold text-emerald-400">
                  {sarAnalysisResult.change_detected ? 'DETECTED' : 'NO CHANGE'}
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Est. Volume</span>
                <span className="text-xs font-bold text-purple-400">
                  {formatFinite((sarAnalysisResult.estimated_volume_m3 || 0) / 1e6, 2)} Mm³
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
