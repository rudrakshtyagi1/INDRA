import React from 'react';
import {
  AlertTriangle,
  Users,
  Building,
  Wheat,
  IndianRupee,
  ShieldAlert,
  LifeBuoy,
  HeartHandshake,
  Navigation,
  CheckCircle,
} from 'lucide-react';

export default function DamageAssessmentPanel({ simulationResult, onOpenExport }) {
  const damage = simulationResult?.damage_assessment || {
    scenario_name: 'Dhauliganga / Tapovan Flood Surge',
    reach_name: '25 km Mountain River Reach',
    hazard_metrics: {
      hazard_rating_hr: 2.65,
      hazard_level: 'EXTREME (Danger to life, catastrophic structural collapse)',
      hazard_color: '#ef4444',
      debris_factor: 1.0,
      max_flood_depth_m: 8.5,
      peak_velocity_ms: 18.2,
    },
    exposure_and_loss: {
      population_at_risk: 4200,
      displaced_persons: 3570,
      total_buildings_exposed: 840,
      destroyed_structures: 546,
      submerged_structures: 294,
      inundated_agricultural_ha: 310.0,
      total_economic_loss_crores_inr: 194.5,
      breakdown_loss_crores: {
        buildings_residential_commercial: 145.2,
        agriculture_and_crops: 2.48,
        infrastructure_and_power: 46.82,
      },
    },
    hadr_zoning: {
      red_zone: {
        area_km2: 5.2,
        lead_time_min: '< 30 mins',
        action: 'Immediate Forced Evacuation / NDRF High-Speed Deployment',
        color: '#ef4444',
      },
      orange_zone: {
        area_km2: 4.6,
        lead_time_min: '30 - 120 mins',
        action: 'Pre-emptive Evacuation to Relief Shelters',
        color: '#f97316',
      },
      yellow_zone: {
        area_km2: 3.2,
        lead_time_min: '> 120 mins',
        action: 'Alert Standby / Secondary Transport Mobilization',
        color: '#eab308',
      },
    },
    resource_allocation: {
      inflatable_rescue_boats: 14,
      ndrf_sdrf_battalions: 2,
      emergency_relief_shelters: 7,
      food_water_packets_per_day: 10710,
      air_evacuation_helipads_needed: 2,
    },
    critical_infrastructure_status: [
      { name: 'Tapovan Vishnugad HEP Barrage Site', type: 'Hydropower Infrastructure', status: 'SEVERE RISK - Complete Inundation', distance_km: 15.2 },
      { name: 'Raini Village Bailey Bridge', type: 'Transportation Lifeline', status: 'COLLAPSE HAZARD - Washed Away', distance_km: 6.8 },
      { name: 'District Sub-Divisional Hospital', type: 'Medical Facility', status: 'ALERT - Move to Upper Floors', distance_km: 21.0 },
      { name: 'National Highway NH-58 / NH-107', type: 'Evacuation Corridor', status: 'PARTIALLY INUNDATED - Divert Traffic', distance_km: 18.5 },
    ],
  };

  const haz = damage.hazard_metrics;
  const exp = damage.exposure_and_loss;
  const zoning = damage.hadr_zoning;
  const res = damage.resource_allocation;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Hazard Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-slate-100">
                Disaster Loss & Damage Assessment (HADR Action Plan)
              </h2>
              <span className="text-xs bg-red-950 text-red-400 border border-red-800/60 px-2 py-0.5 rounded-full font-semibold">
                HR: {haz.hazard_rating_hr} ({haz.hazard_level.split(' ')[0]})
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Vulnerability assessment adhering to CWC and NDMA protocols for {damage.scenario_name}.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Total Estimated Economic Damage</span>
            <span className="text-2xl font-black text-red-400 tracking-tight flex items-center justify-end space-x-1">
              <IndianRupee className="w-5 h-5" />
              <span>{exp.total_economic_loss_crores_inr} Crores</span>
            </span>
          </div>
        </div>
      </div>

      {/* Core Exposure & Loss Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Displaced Population</span>
            <Users className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">{exp.displaced_persons.toLocaleString()}</div>
          <p className="text-[10px] text-slate-400 mt-1">
            Out of {exp.population_at_risk.toLocaleString()} at risk
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Destroyed Structures</span>
            <Building className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold text-red-400">{exp.destroyed_structures}</div>
          <p className="text-[10px] text-slate-400 mt-1">
            +{exp.submerged_structures} submerged
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Submerged Crops</span>
            <Wheat className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">{exp.inundated_agricultural_ha} ha</div>
          <p className="text-[10px] text-slate-400 mt-1">Agricultural floodplain</p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Infrastructure Loss</span>
            <IndianRupee className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">₹ {exp.breakdown_loss_crores.infrastructure_and_power} Cr</div>
          <p className="text-[10px] text-slate-400 mt-1">Bridges, Roads, Power</p>
        </div>
      </div>

      {/* HADR Evacuation Zoning & Emergency Logistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tactical Evacuation Zoning Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>HADR Tactical Evacuation Zones</span>
            </h3>

            <div className="space-y-3">
              {/* Red Zone */}
              <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span>RED ZONE: High Hazard Area ({zoning.red_zone.area_km2} km²)</span>
                  </span>
                  <span className="text-[10px] bg-red-900/70 text-red-200 px-2 py-0.5 rounded font-mono font-bold">
                    Lead Time: {zoning.red_zone.lead_time_min}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {zoning.red_zone.action}
                </p>
                <p className="text-[11px] text-slate-400">
                  Target: Immediate siren alert, clear all riverbed settlements, deploy high-speed motorboats.
                </p>
              </div>

              {/* Orange Zone */}
              <div className="bg-orange-950/30 border border-orange-500/40 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-400 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span>ORANGE ZONE: Medium Hazard Area ({zoning.orange_zone.area_km2} km²)</span>
                  </span>
                  <span className="text-[10px] bg-orange-900/70 text-orange-200 px-2 py-0.5 rounded font-mono font-bold">
                    Lead Time: {zoning.orange_zone.lead_time_min}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {zoning.orange_zone.action}
                </p>
                <p className="text-[11px] text-slate-400">
                  Target: Systematic transport of residents to designated higher-elevation schools/community halls.
                </p>
              </div>

              {/* Yellow Zone */}
              <div className="bg-yellow-950/30 border border-yellow-500/40 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-yellow-400 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    <span>YELLOW ZONE: Advisory & Monitoring Area ({zoning.yellow_zone.area_km2} km²)</span>
                  </span>
                  <span className="text-[10px] bg-yellow-900/70 text-yellow-200 px-2 py-0.5 rounded font-mono font-bold">
                    Lead Time: {zoning.yellow_zone.lead_time_min}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {zoning.yellow_zone.action}
                </p>
                <p className="text-[11px] text-slate-400">
                  Target: Public announcements, hospital surge preparedness, stockpile drinking water.
                </p>
              </div>
            </div>
          </div>

          {/* Evacuation Priority Queue Table (Who should evacuate first?) */}
          {damage.evacuation_priority_queue && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
                <span>🚨 Evacuation Priority Queue ("Who should evacuate first?")</span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  HADR Priority Order
                </span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-2">Rank</th>
                      <th className="p-2">Settlement / Reach</th>
                      <th className="p-2">Risk</th>
                      <th className="p-2">Arrival Lead Time</th>
                      <th className="p-2">Depth Range</th>
                      <th className="p-2">Exposed Pop</th>
                      <th className="p-2">Tactical Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {damage.evacuation_priority_queue.map((item) => (
                      <tr key={item.priority_rank} className="hover:bg-slate-800/40">
                        <td className="p-2 font-bold text-cyan-400">#{item.priority_rank}</td>
                        <td className="p-2 font-sans font-semibold text-slate-100">{item.settlement_name}</td>
                        <td className="p-2 font-bold" style={{ color: item.color }}>{item.risk_level}</td>
                        <td className="p-2 text-slate-300">{item.expected_arrival_window}</td>
                        <td className="p-2 text-purple-300">{item.max_depth_range_m}</td>
                        <td className="p-2 text-amber-400">{item.exposed_population?.toLocaleString()}</td>
                        <td className="p-2 font-sans text-[11px] text-slate-300">{item.action_required}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Critical Infrastructure Impacts */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200">
              Critical Infrastructure Impact Assessment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {damage.critical_infrastructure_status?.map((item, i) => (
                <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.distance_km} km</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">{item.type}</span>
                  <span className="text-[11px] font-semibold text-red-400 block">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: HADR Emergency Response Logistics */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 pb-2 border-b border-slate-800">
              <LifeBuoy className="w-4 h-4 text-cyan-400" />
              <span>HADR Resource Requirements</span>
            </h3>

            <div className="space-y-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">Rescue Inflatable Boats</span>
                <span className="text-sm font-bold text-cyan-400">{res.inflatable_rescue_boats} Boats</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">NDRF / SDRF Battalions</span>
                <span className="text-sm font-bold text-cyan-400">{res.ndrf_sdrf_battalions} Teams</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">Emergency Relief Camps</span>
                <span className="text-sm font-bold text-cyan-400">{res.emergency_relief_shelters} Centers</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">Food & Water Packets / Day</span>
                <span className="text-sm font-bold text-cyan-400">{res.food_water_packets_per_day?.toLocaleString()} Packets</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">Air Evacuation Helipads</span>
                <span className="text-sm font-bold text-cyan-400">{res.air_evacuation_helipads_needed} Helipads</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={onOpenExport}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition flex items-center justify-center space-x-2 border border-slate-700"
            >
              <span>Download Official HADR Report (CSV / Shapefile)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
