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

export const PROTOTYPE_INFRASTRUCTURE = [];

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
