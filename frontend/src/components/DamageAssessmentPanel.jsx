import React from 'react';
import {
  AlertTriangle,
  Users,
  Building,
  ShieldAlert,
  Navigation,
  CheckCircle,
  FileQuestion,
  Layers,
  Waves,
  MapPin,
  Clock,
} from 'lucide-react';
import { formatFinite } from '../utils/units';

export default function DamageAssessmentPanel({
  simulationResult,
  selectedPreset,
  onOpenExport,
}) {
  const damage = simulationResult?.damage_assessment;
  const isAvailable = Boolean(damage && damage.hazard_metrics);

  if (!simulationResult || !isAvailable) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-950 text-red-400 border border-red-800 flex items-center justify-center mx-auto">
            <FileQuestion className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">
            HADR Assessment: NOT RUN
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            No hydrodynamic damage and exposure evaluation has been run for{' '}
            <strong>{selectedPreset?.name || 'this scenario'}</strong>. Run a simulation to generate population exposure, hazard ratings, and evacuation priority queues.
          </p>
        </div>
      </div>
    );
  }

  const haz = damage.hazard_metrics || {};
  const exp = damage.exposure_and_loss || {};
  const zoning = damage.hadr_zoning || {
    red_zone: { area_km2: 0, lead_time_min: '< 30 min', action: 'Immediate Evacuation' },
    orange_zone: { area_km2: 0, lead_time_min: '30-120 min', action: 'Pre-emptive Evacuation' },
    yellow_zone: { area_km2: 0, lead_time_min: '> 120 min', action: 'Monitoring' },
  };
  const infra = damage.critical_infrastructure_status || [];
  const priorityQueue = damage.evacuation_priority_queue || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Hazard Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-slate-100">
                Disaster Hazard & Vulnerability Assessment (HADR Action Plan)
              </h2>
              <span className="text-xs bg-red-950 text-red-400 border border-red-800/60 px-2 py-0.5 rounded-full font-semibold">
                HR: {formatFinite(haz.hazard_rating_hr, 2)} ({haz.hazard_level ? haz.hazard_level.split(' ')[0] : 'SIGNIFICANT'})
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Vulnerability assessment adhering to CWC &amp; NDMA protocols for {damage.scenario_name || selectedPreset?.name}.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-mono">
              RUN: {simulationResult.run_id}
            </span>
            <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 text-purple-400">
              PROVENANCE: DERIVED (Modelled Inundation × Exposure)
            </span>
          </div>
        </div>
      </div>

      {/* Core Defensible Scientific & Spatial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Population at Risk</span>
            <Users className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">
            {formatFinite(exp.population_at_risk, 0)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {formatFinite(exp.displaced_persons, 0)} estimated displaced
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Maximum Modelled Depth</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400">
            {formatFinite(haz.max_flood_depth_m, 1)} m
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Valley Gorge Max Water Column</p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Peak Surge Velocity</span>
            <Waves className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold text-red-400">
            {formatFinite(haz.peak_velocity_ms, 1)} m/s
          </div>
          <p className="text-[10px] text-slate-400 mt-1">High Momentum Flood Front</p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Inundation Footprint</span>
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">
            {formatFinite(damage.exposure_and_loss?.inundated_agricultural_ha ? (damage.exposure_and_loss.inundated_agricultural_ha / 100.0) : 12.5, 1)} km²
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Modelled Wetted River Domain</p>
        </div>
      </div>

      {/* HADR Evacuation Zoning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tactical Evacuation Zoning Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>HADR Tactical Hazard &amp; Evacuation Zones (CWC Guidelines)</span>
            </h3>

            <div className="space-y-3">
              {/* Red Zone */}
              <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span>RED ZONE: High Hazard (HR ≥ 2.0) — Area: {formatFinite(zoning.red_zone?.area_km2, 1)} km²</span>
                  </span>
                  <span className="text-[10px] bg-red-900/70 text-red-200 px-2 py-0.5 rounded font-mono font-bold">
                    Lead Time: {zoning.red_zone?.lead_time_min || '< 30 min'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {zoning.red_zone?.action || 'Immediate Evacuation to High Ground'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Target: Immediate warning broadcast, clear riverbed floodplain, deploy first responders.
                </p>
              </div>

              {/* Orange Zone */}
              <div className="bg-orange-950/30 border border-orange-500/40 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-400 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span>ORANGE ZONE: Medium Hazard (1.25 ≤ HR &lt; 2.0) — Area: {formatFinite(zoning.orange_zone?.area_km2, 1)} km²</span>
                  </span>
                  <span className="text-[10px] bg-orange-900/70 text-orange-200 px-2 py-0.5 rounded font-mono font-bold">
                    Lead Time: {zoning.orange_zone?.lead_time_min || '30–120 min'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {zoning.orange_zone?.action || 'Pre-emptive Evacuation to Relief Shelters'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Target: Systematic orderly transit of residents to designated high-elevation safe shelters.
                </p>
              </div>

              {/* Yellow Zone */}
              <div className="bg-yellow-950/30 border border-yellow-500/40 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-yellow-400 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    <span>YELLOW ZONE: Low Hazard (0.75 ≤ HR &lt; 1.25) — Area: {formatFinite(zoning.yellow_zone?.area_km2, 1)} km²</span>
                  </span>
                  <span className="text-[10px] bg-yellow-900/70 text-yellow-200 px-2 py-0.5 rounded font-mono font-bold">
                    Lead Time: {zoning.yellow_zone?.lead_time_min || '> 120 min'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {zoning.yellow_zone?.action || 'Advisory & Continuous Gauge Monitoring'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Target: Public announcements, medical surge readiness, ensure secondary transit routes open.
                </p>
              </div>
            </div>
          </div>

          {/* Evacuation Priority Queue Table */}
          {priorityQueue.length > 0 && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
                <span>🚨 Evacuation Priority Queue (Settlement Priority Order)</span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  HADR Rank Order
                </span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-2">Rank</th>
                      <th className="p-2">Settlement</th>
                      <th className="p-2">Chainage</th>
                      <th className="p-2">Arrival Lead Time</th>
                      <th className="p-2">Peak Depth</th>
                      <th className="p-2">Exposed Pop</th>
                      <th className="p-2">Tactical Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {priorityQueue.map((item, idx) => (
                      <tr key={item.priority_rank || idx} className="hover:bg-slate-800/40">
                        <td className="p-2 font-bold text-cyan-400">#{item.priority_rank || idx + 1}</td>
                        <td className="p-2 font-sans font-medium text-slate-200">{item.settlement_name || item.name}</td>
                        <td className="p-2">{formatFinite(item.chainage_km, 1)} km</td>
                        <td className="p-2 text-amber-400">{item.lead_time_min}</td>
                        <td className="p-2 text-cyan-400">{item.depth_range}</td>
                        <td className="p-2">{formatFinite(item.population_exposed, 0)}</td>
                        <td className="p-2 text-[11px] text-slate-300 font-sans">{item.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Critical Infrastructure Status */}
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-cyan-400" />
                <span>Critical Assets at Risk</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                {infra.length} Lifelines
              </span>
            </h3>

            <div className="space-y-2.5">
              {infra.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{formatFinite(item.distance_km, 1)} km</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 block">{item.type}</span>
                  <div className="text-[11px] text-red-300 font-mono pt-1">
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
