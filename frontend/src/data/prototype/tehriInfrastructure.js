import { DOMAIN_CONFIG } from './tehriDomainConfig';

/**
 * PROTOTYPE INFRASTRUCTURE DATA
 * Operational critical infrastructure, healthcare facilities, shelters, and air-evac points
 * along the Bhagirathi–Ganga river corridor (0–145 km to Bijnor Barrage Boundary).
 *
 * PROVENANCE: PROTOTYPE FIXTURE
 * Asset locations and attributes are illustrative planning fixtures.
 */

export const INFRA_TYPES = {
  hospital:   { icon: '🏥', symbol: '+',  label: 'Hospital',            category: 'Healthcare', badgeColor: '#38bdf8' },
  clinic_phc: { icon: '🩺', symbol: '⚕',  label: 'PHC / CHC / Clinic',  category: 'Healthcare', badgeColor: '#38bdf8' },
  shelter:    { icon: '⛺', symbol: '◈',  label: 'Relief Shelter',      category: 'Shelter',    badgeColor: '#4ade80' },
  ndrf_base:  { icon: '🛡️', symbol: '⬡',  label: 'NDRF Staging Base',   category: 'Emergency',  badgeColor: '#22c55e' },
  helipad:    { icon: '🚁', symbol: 'H',  label: 'Helipad / Air Evac',  category: 'Aviation',   badgeColor: '#c084fc' },
  bridge:     { icon: '🌉', symbol: '═',  label: 'Bridge / Crossing',   category: 'Transport',  badgeColor: '#f97316' },
  road:       { icon: '🛣️', symbol: '═',  label: 'Major Highway / Road',category: 'Transport',  badgeColor: '#f59e0b' },
  power:      { icon: '⚡', symbol: '⚡', label: 'Power Infrastructure',category: 'Energy',     badgeColor: '#eab308' },
  dam:        { icon: '🔷', symbol: '▲',  label: 'Dam / Barrage',       category: 'Hydraulic',  badgeColor: '#60a5fa' },
};

export const PROTOTYPE_INFRASTRUCTURE = [
  // ─── HEALTHCARE FACILITIES ─────────────────────────────────────────
  {
    id: 'infra_hosp_tehri_dist',
    name: 'District Hospital Tehri (Borasari)',
    type: 'hospital',
    lat: 30.388,
    lon: 78.472,
    kmFromDam: 3.2,
    elevationMsl: 1650,
    floodArrivalMin: null, // Elevated, physically safe from flood
    accessRoadStatus: 'ELEVATED_SAFE',
    altAccess: true,
    hadrPriority: 'HIGH',
    capacityBeds: 150,
    notes: 'District referral hospital on New Tehri ridge. Valley approach cut off but high ridge bypass clear.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_phc_chamba',
    name: 'Chamba Primary Health Centre (PHC)',
    type: 'clinic_phc',
    lat: 30.347,
    lon: 78.396,
    kmFromDam: 11.5,
    elevationMsl: 1480,
    floodArrivalMin: null, // Safe ridge elevation
    accessRoadStatus: 'ELEVATED_SAFE',
    altAccess: true,
    hadrPriority: 'CRITICAL',
    capacityBeds: 30,
    notes: 'Key emergency trauma post adjacent to NDRF base. Safe from all flood levels.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_chc_devprayag',
    name: 'Devprayag Community Health Centre (CHC)',
    type: 'clinic_phc',
    lat: 30.149,
    lon: 78.601,
    kmFromDam: 42.2,
    elevationMsl: 520,
    floodArrivalMin: 68,
    accessRoadStatus: 'AT_RISK',
    altAccess: true,
    hadrPriority: 'HIGH',
    capacityBeds: 40,
    notes: 'Upper Bazaar Devprayag facility. Lower approach flooded at T+68m; upper ridge access open.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_hosp_aiims_rishikesh',
    name: 'AIIMS Rishikesh Apex Trauma Centre',
    type: 'hospital',
    lat: 30.089,
    lon: 78.272,
    kmFromDam: 78.2,
    elevationMsl: 390,
    floodArrivalMin: null, // Campus elevated
    accessRoadStatus: 'ACCESS_AT_RISK',
    altAccess: true,
    hadrPriority: 'CRITICAL',
    capacityBeds: 960,
    notes: 'Level-1 Trauma centre with rooftop helipad. Primary casualty evacuation destination.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_hosp_haridwar_dist',
    name: 'Haridwar District Hospital',
    type: 'hospital',
    lat: 29.952,
    lon: 78.165,
    kmFromDam: 100.5,
    elevationMsl: 310,
    floodArrivalMin: 175,
    accessRoadStatus: 'MONITORING',
    altAccess: true,
    hadrPriority: 'HIGH',
    capacityBeds: 250,
    notes: 'Plains terminal medical centre. Monitoring backwater flood stage.',
    provenance: 'PROTOTYPE FIXTURE',
  },

  // ─── RELIEF SHELTERS ───────────────────────────────────────────────
  {
    id: 'infra_shelter_new_tehri',
    name: 'New Tehri Community High-Ground Shelter',
    type: 'shelter',
    lat: 30.379,
    lon: 78.462,
    kmFromDam: 3.8,
    elevationMsl: 1550,
    floodArrivalMin: null, // High ground safe
    accessRoadStatus: 'SAFE',
    altAccess: true,
    capacity: 1500,
    hadrPriority: 'HIGH',
    notes: 'Designated relief hub for Sirain and upper Bhagirathi hamlets.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_shelter_chamba_hub',
    name: 'Chamba Ridge Relief Complex',
    type: 'shelter',
    lat: 30.344,
    lon: 78.398,
    kmFromDam: 12.0,
    elevationMsl: 1490,
    floodArrivalMin: null,
    accessRoadStatus: 'SAFE',
    altAccess: true,
    capacity: 2500,
    hadrPriority: 'CRITICAL',
    notes: 'Central logistics staging point with helipad and water reserves.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_shelter_kandisaur',
    name: 'Kandisaur High Ground Camp',
    type: 'shelter',
    lat: 30.315,
    lon: 78.482,
    kmFromDam: 16.5,
    elevationMsl: 1220,
    floodArrivalMin: null,
    accessRoadStatus: 'SAFE',
    altAccess: true,
    capacity: 800,
    hadrPriority: 'HIGH',
    notes: 'Safe high ridge camp above Pangarh gorge.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_shelter_koteshwar',
    name: 'Koteshwar Right-Bank Safe Shelter',
    type: 'shelter',
    lat: 30.281,
    lon: 78.508,
    kmFromDam: 21.5,
    elevationMsl: 720,
    floodArrivalMin: null,
    accessRoadStatus: 'SAFE',
    altAccess: true,
    capacity: 1800,
    hadrPriority: 'HIGH',
    notes: 'Located on right abutment ridge above Koteshwar balancing reservoir flood stage.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_shelter_devprayag',
    name: 'Devprayag Upper Bazaar Relief Complex',
    type: 'shelter',
    lat: 30.147,
    lon: 78.599,
    kmFromDam: 42.0,
    elevationMsl: 650,
    floodArrivalMin: null,
    accessRoadStatus: 'SAFE',
    altAccess: true,
    capacity: 3200,
    hadrPriority: 'HIGH',
    notes: 'Elevated school complex for Sangam corridor evacuees.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_shelter_rishikesh',
    name: 'Rishikesh District Evacuation Shelter',
    type: 'shelter',
    lat: 30.086,
    lon: 78.260,
    kmFromDam: 79.0,
    elevationMsl: 420,
    floodArrivalMin: null,
    accessRoadStatus: 'SAFE',
    altAccess: true,
    capacity: 5000,
    hadrPriority: 'MODERATE',
    notes: 'High-ground stadium relief campus with road access to Dehradun.',
    provenance: 'PROTOTYPE FIXTURE',
  },

  // ─── EMERGENCY & AVIATION ──────────────────────────────────────────
  {
    id: 'infra_ndrf_chamba',
    name: 'NDRF / SDRF Forward Tactical Base',
    type: 'ndrf_base',
    lat: 30.345,
    lon: 78.395,
    kmFromDam: 12.0,
    elevationMsl: 1450,
    floodArrivalMin: null,
    accessRoadStatus: 'SAFE',
    altAccess: true,
    hadrPriority: 'CRITICAL',
    personnel: 85,
    zodiacs: 14,
    notes: '2 Companies deployed with Zodiac inflatables, satellite comms, and quick response vehicles.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_helipad_chamba',
    name: 'Chamba Ridge Tactical Helipad',
    type: 'helipad',
    lat: 30.342,
    lon: 78.392,
    kmFromDam: 12.2,
    elevationMsl: 1475,
    floodArrivalMin: null,
    accessRoadStatus: 'SAFE',
    altAccess: true,
    hadrPriority: 'CRITICAL',
    notes: 'All-weather dual-pad helipad for IAF Mi-17 and civilian ALH air evacuation.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_helipad_new_tehri',
    name: 'New Tehri Administrative Helipad',
    type: 'helipad',
    lat: 30.382,
    lon: 78.468,
    kmFromDam: 4.0,
    elevationMsl: 1580,
    floodArrivalMin: null,
    accessRoadStatus: 'SAFE',
    altAccess: true,
    hadrPriority: 'HIGH',
    notes: 'High ridge helipad for VIP and medical casualty evacuation.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_helipad_aiims',
    name: 'AIIMS Rishikesh Rooftop Medical Helipad',
    type: 'helipad',
    lat: 30.090,
    lon: 78.273,
    kmFromDam: 78.4,
    elevationMsl: 430,
    floodArrivalMin: null,
    accessRoadStatus: 'SAFE',
    altAccess: true,
    hadrPriority: 'CRITICAL',
    notes: 'Direct trauma theatre access helipad.',
    provenance: 'PROTOTYPE FIXTURE',
  },

  // ─── BRIDGES & CROSSINGS (CRITICAL CHOKEPOINTS) ───────────────────
  {
    id: 'infra_bridge_sirain',
    name: 'Sirain Suspension Bridge (NH-94)',
    type: 'bridge',
    lat: 30.364,
    lon: 78.487,
    kmFromDam: 4.5,
    elevationMsl: 776,
    floodArrivalMin: 6,
    accessRoadStatus: 'FLOODED',
    altAccess: false,
    hadrPriority: 'CRITICAL',
    notes: 'Bridge deck submerged at T+6m by 8.5m initial surge. Direct valley road blocked.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_bridge_tipri',
    name: 'Tipri Gorge Culvert Crossing',
    type: 'bridge',
    lat: 30.336,
    lon: 78.496,
    kmFromDam: 9.8,
    elevationMsl: 742,
    floodArrivalMin: 14,
    accessRoadStatus: 'FLOODED',
    altAccess: false,
    hadrPriority: 'CRITICAL',
    notes: 'Low culvert submerged under 6.2m surge at T+14m. Direct canyon track impassable.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_bridge_pangarh',
    name: 'Pangarh Footbridge & Crossing',
    type: 'bridge',
    lat: 30.314,
    lon: 78.500,
    kmFromDam: 15.0,
    elevationMsl: 710,
    floodArrivalMin: 22,
    accessRoadStatus: 'AT_RISK',
    altAccess: false,
    hadrPriority: 'HIGH',
    notes: 'Suspension footbridge cut off at T+22m. Divert to Kandisaur ridge trail.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_bridge_devprayag',
    name: 'Devprayag Sangam Suspension Bridge',
    type: 'bridge',
    lat: 30.148,
    lon: 78.600,
    kmFromDam: 42.5,
    elevationMsl: 472,
    floodArrivalMin: 70,
    accessRoadStatus: 'AT_RISK',
    altAccess: false,
    hadrPriority: 'HIGH',
    notes: 'Key NH-58 Sangam crossing at risk from combined Bhagirathi surge.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_bridge_shivpuri',
    name: 'Shivpuri NH-58 Bridge',
    type: 'bridge',
    lat: 30.115,
    lon: 78.390,
    kmFromDam: 62.5,
    elevationMsl: 338,
    floodArrivalMin: 94,
    accessRoadStatus: 'MONITORING',
    altAccess: true,
    hadrPriority: 'MODERATE',
    notes: 'High clearance deck under active stage monitoring.',
    provenance: 'PROTOTYPE FIXTURE',
  },

  // ─── DAMS & BARRAGES ───────────────────────────────────────────────
  {
    id: 'infra_dam_koteshwar',
    name: 'Koteshwar Balancing Dam',
    type: 'dam',
    lat: 30.278,
    lon: 78.512,
    kmFromDam: 22.0,
    elevationMsl: 615,
    floodArrivalMin: 32,
    accessRoadStatus: 'TAILRACE_FLOODED',
    altAccess: false,
    hadrPriority: 'HIGH',
    notes: 'Balancing reservoir. Low powerhouse tailrace road submerged at T+28m.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_barrage_haridwar',
    name: 'Bhimgoda Barrage (Haridwar)',
    type: 'dam',
    lat: 29.948,
    lon: 78.167,
    kmFromDam: 100.0,
    elevationMsl: 295,
    floodArrivalMin: 175,
    accessRoadStatus: 'MONITORING',
    altAccess: true,
    hadrPriority: 'HIGH',
    notes: 'Downstream terminal control structure. Gates configured for emergency pass-through.',
    provenance: 'PROTOTYPE FIXTURE',
  },

  // ─── POWER INFRASTRUCTURE ──────────────────────────────────────────
  {
    id: 'infra_power_tehri_hpp',
    name: 'Tehri Hydro Power Plant (1000 MW)',
    type: 'power',
    lat: 30.375,
    lon: 78.479,
    kmFromDam: 0.8,
    elevationMsl: 610,
    floodArrivalMin: 2,
    accessRoadStatus: 'TAILRACE_FLOODED',
    altAccess: false,
    hadrPriority: 'CRITICAL',
    notes: 'Underground powerhouse machine hall and tailrace tunnel outlet at immediate breach risk.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_power_koteshwar_hpp',
    name: 'Koteshwar Hydro Power Plant (400 MW)',
    type: 'power',
    lat: 30.279,
    lon: 78.514,
    kmFromDam: 22.2,
    elevationMsl: 540,
    floodArrivalMin: 32,
    accessRoadStatus: 'TAILRACE_FLOODED',
    altAccess: false,
    hadrPriority: 'HIGH',
    notes: 'Surface powerhouse building in downstream canyon susceptible to surge wave crest.',
    provenance: 'PROTOTYPE FIXTURE',
  },

  // ─── MAJOR HIGHWAYS & ROAD CHOKEPOINTS ────────────────────────────
  {
    id: 'infra_road_nh94_gorge',
    name: 'NH-94 Gorge Arterial Highway',
    type: 'road',
    lat: 30.355,
    lon: 78.488,
    kmFromDam: 5.5,
    elevationMsl: 760,
    floodArrivalMin: 10,
    accessRoadStatus: 'VALLEY_ROAD_INUNDATED',
    altAccess: true,
    hadrPriority: 'CRITICAL',
    notes: 'Primary Bhagirathi gorge connection between Tehri Dam axis and Chamba ridge.',
    provenance: 'PROTOTYPE FIXTURE',
  },
  {
    id: 'infra_road_nh58_sangam',
    name: 'NH-58 Confluence Highway (Devprayag)',
    type: 'road',
    lat: 30.145,
    lon: 78.602,
    kmFromDam: 43.0,
    elevationMsl: 480,
    floodArrivalMin: 68,
    accessRoadStatus: 'VALLEY_ROAD_INUNDATED',
    altAccess: true,
    hadrPriority: 'HIGH',
    notes: 'Main national highway along the Bhagirathi-Alaknanda sangam gorge floor.',
    provenance: 'PROTOTYPE FIXTURE',
  },
];

/**
 * Computes the 4 operational risk states of an asset at a given simulation minute:
 * 1. IMPACTED: Inundated by the flood wave or submerged
 * 2. THREATENED: Wave arrival expected within 30 minutes
 * 3. ACCESS_COMPROMISED: Physically elevated/safe, but primary access road is flooded/blocked
 * 4. SAFE: Physically elevated on high ground and access route is open
 */
export function getInfrastructureRisk(asset, currentTimeMin) {
  // Case A: Physically submerged / reached by wave
  if (asset.floodArrivalMin !== null && currentTimeMin >= asset.floodArrivalMin) {
    return { state: 'IMPACTED', label: 'Impacted (Submerged)', color: '#ef4444' };
  }

  // Case B: Wave approaching within 30 minutes
  if (asset.floodArrivalMin !== null) {
    const margin = asset.floodArrivalMin - currentTimeMin;
    if (margin <= 30 && margin > 0) {
      return { state: 'THREATENED', label: `Threatened (T+${asset.floodArrivalMin}m)`, color: '#f97316' };
    }
  }

  // Case C: Access road is flooded / compromised even if asset itself is elevated
  const accessBlocked = [
    'TAILRACE_FLOODED',
    'VALLEY_ROAD_INUNDATED',
    'BLOCKED_LOW_BRIDGE',
    'ACCESS_AT_RISK',
    'AT_RISK',
    'FLOODED',
  ].includes(asset.accessRoadStatus);

  if (accessBlocked) {
    return { state: 'ACCESS_COMPROMISED', label: 'Access Compromised', color: '#f59e0b' };
  }

  // Case D: Physically safe with clear high-ground access
  return { state: 'SAFE', label: 'Safe (High Ground)', color: '#22c55e' };
}

/**
 * Finds the nearest safe healthcare facility from a given latitude and longitude.
 */
export function getNearestSafeHealthcare(lat, lon, currentTimeMin) {
  const healthcare = PROTOTYPE_INFRASTRUCTURE.filter((a) =>
    ['hospital', 'clinic_phc'].includes(a.type)
  );

  const scored = healthcare.map((a) => {
    const risk = getInfrastructureRisk(a, currentTimeMin);
    const dLat = a.lat - lat;
    const dLon = a.lon - lon;
    const distKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
    return { ...a, distKm, risk };
  });

  // Sort by safe status first, then by distance
  scored.sort((a, b) => {
    const aSafe = ['SAFE', 'MONITORING', 'ACCESS_COMPROMISED'].includes(a.risk.state);
    const bSafe = ['SAFE', 'MONITORING', 'ACCESS_COMPROMISED'].includes(b.risk.state);
    if (aSafe && !bSafe) return -1;
    if (!aSafe && bSafe) return 1;
    return a.distKm - b.distKm;
  });

  const best = scored[0] || null;
  if (!best) return null;

  const roadEtaMin = Math.round(best.distKm * 2.2) + 4;
  const footEtaMin = Math.round(best.distKm * 4.8) + 10;
  const airEtaMin = Math.round(best.distKm * 0.5) + 3;

  return {
    facility: best,
    roadEtaMin,
    footEtaMin,
    airEtaMin,
    status: best.risk.state,
  };
}

/**
 * Finds the nearest safe shelter from a given latitude and longitude.
 */
export function getNearestSafeShelter(lat, lon, currentTimeMin) {
  const shelters = PROTOTYPE_INFRASTRUCTURE.filter((a) => a.type === 'shelter');

  const scored = shelters.map((a) => {
    const risk = getInfrastructureRisk(a, currentTimeMin);
    const dLat = a.lat - lat;
    const dLon = a.lon - lon;
    const distKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
    return { ...a, distKm, risk };
  });

  scored.sort((a, b) => {
    const aSafe = a.risk.state === 'SAFE';
    const bSafe = b.risk.state === 'SAFE';
    if (aSafe && !bSafe) return -1;
    if (!aSafe && bSafe) return 1;
    return a.distKm - b.distKm;
  });

  const best = scored[0] || null;
  if (!best) return null;

  const roadEtaMin = Math.round(best.distKm * 2.0) + 3;
  return {
    shelter: best,
    roadEtaMin,
    capacity: best.capacity,
    status: best.risk.state,
  };
}

/**
 * Summary counts for top-level operational cards.
 */
export function getInfrastructureSummary(currentTimeMin) {
  const hospitals = PROTOTYPE_INFRASTRUCTURE.filter((a) =>
    ['hospital', 'clinic_phc'].includes(a.type)
  );
  const shelters = PROTOTYPE_INFRASTRUCTURE.filter((a) => a.type === 'shelter');
  const bridges = PROTOTYPE_INFRASTRUCTURE.filter((a) => a.type === 'bridge');
  const helipads = PROTOTYPE_INFRASTRUCTURE.filter((a) => a.type === 'helipad');

  const hospitalsAtRisk = hospitals.filter((a) => {
    const r = getInfrastructureRisk(a, currentTimeMin);
    return ['IMPACTED', 'THREATENED', 'ACCESS_COMPROMISED'].includes(r.state);
  }).length;

  const sheltersSafe = shelters.filter((a) => {
    const r = getInfrastructureRisk(a, currentTimeMin);
    return r.state === 'SAFE';
  }).length;

  const bridgesImpacted = bridges.filter((a) => {
    const r = getInfrastructureRisk(a, currentTimeMin);
    return ['IMPACTED', 'THREATENED'].includes(r.state);
  }).length;

  const helipadsActive = helipads.filter((a) => {
    const r = getInfrastructureRisk(a, currentTimeMin);
    return r.state === 'SAFE';
  }).length;

  return {
    hospitalsAtRisk,
    totalHospitals: hospitals.length,
    sheltersSafe,
    totalShelters: shelters.length,
    bridgesImpacted,
    totalBridges: bridges.length,
    helipadsActive,
    totalHelipads: helipads.length,
    totalAssets: PROTOTYPE_INFRASTRUCTURE.length,
    provenance: 'PROTOTYPE FIXTURE',
  };
}

export function getInfrastructureForSettlement(settlementKm, rangeKm = 8) {
  return PROTOTYPE_INFRASTRUCTURE.filter(
    (a) => Math.abs(a.kmFromDam - settlementKm) <= rangeKm
  );
}
