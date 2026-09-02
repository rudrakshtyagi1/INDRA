import { DOMAIN_CONFIG } from './tehriDomainConfig';

/**
 * PROTOTYPE EXPOSURE DATA
 * Time-dependent population exposure along the Bhagirathi–Ganga corridor (0–145 km).
 *
 * PROVENANCE: PROTOTYPE SETTLEMENT-CENTROID EXPOSURE · NOT WORLDPOP/GHSL RASTER-DERIVED
 * Settlement-based centroid approximation — a settlement is "currently exposed"
 * when currentTimeMin >= its arrivalMin, meaning the flood wavefront has reached it.
 * Not census-validated or raster zonal-sum data.
 */

import { PROTOTYPE_SETTLEMENTS } from './tehriPrototypeSettlements';
import { PROTOTYPE_INFRASTRUCTURE, getInfrastructureRisk } from './tehriInfrastructure';

// ─── Haversine Distance Helper ──────────────────────────────────────────────
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── District registry with boundary polygons ───────────────────────────────
export const DISTRICTS = [
  {
    id: 'tehri_garhwal',
    name: 'Tehri Garhwal',
    kmRange: [0, 45],
    center: [30.30, 78.48],
    settlementIds: ['tehri_axis', 'sirain', 'tipri', 'pangarh', 'koteshwar', 'bagwan'],
    totalAreaKm2: 4421,
    // Subtle boundary polygon encompassing upper Bhagirathi reach
    boundaryPolygon: [
      [30.450, 78.360],
      [30.440, 78.580],
      [30.360, 78.620],
      [30.220, 78.580],
      [30.200, 78.460],
      [30.260, 78.360],
      [30.380, 78.340],
      [30.450, 78.360],
    ],
  },
  {
    id: 'pauri_garhwal',
    name: 'Pauri Garhwal',
    kmRange: [45, 75],
    center: [30.14, 78.48],
    settlementIds: ['devprayag', 'shivpuri'],
    totalAreaKm2: 5438,
    // Subtle boundary polygon for confluence & middle canyon
    boundaryPolygon: [
      [30.220, 78.580],
      [30.190, 78.670],
      [30.080, 78.580],
      [30.070, 78.380],
      [30.130, 78.350],
      [30.200, 78.460],
      [30.220, 78.580],
    ],
  },
  {
    id: 'haridwar',
    name: 'Haridwar',
    kmRange: [75, 100],
    center: [30.02, 78.20],
    settlementIds: ['rishikesh', 'haridwar'],
    totalAreaKm2: 2360,
    // Subtle boundary polygon for lower plains & barrage reach
    boundaryPolygon: [
      [30.120, 78.320],
      [30.110, 78.380],
      [30.050, 78.350],
      [29.910, 78.220],
      [29.900, 78.100],
      [29.980, 78.080],
      [30.100, 78.200],
      [30.120, 78.320],
    ],
  },
];

// ─── Exposure calculator ─────────────────────────────────────────────────────

/**
 * Returns the CURRENTLY EXPOSED population at the given simulation timestep.
 * Definition: population inside the active flood footprint RIGHT NOW.
 */
export function getCurrentlyExposed(currentTimeMin) {
  const exposed = PROTOTYPE_SETTLEMENTS.filter(
    (s) => s.population > 0 && s.arrivalMin <= currentTimeMin
  );
  return {
    total: exposed.reduce((acc, s) => acc + s.population, 0),
    settlements: exposed,
    timestep: currentTimeMin,
    provenance: 'WHAT-IF HYDRODYNAMIC BENCHMARK',
    method: 'Settlement arrival approximation (not spatial raster intersection)',
  };
}

/**
 * Returns the CUMULATIVE EXPOSED population from T+0 to currentTimeMin.
 */
export function getCumulativeExposed(currentTimeMin) {
  const result = getCurrentlyExposed(currentTimeMin);
  return {
    ...result,
    description: 'Cumulative since T+0',
  };
}

/**
 * Returns the PROJECTED SCENARIO EXPOSURE — population in the maximum inundation footprint.
 */
export function getProjectedExposed() {
  const exposed = PROTOTYPE_SETTLEMENTS.filter((s) => s.population > 0);
  return {
    total: exposed.reduce((acc, s) => acc + s.population, 0),
    settlements: exposed,
    timestep: 180,
    provenance: 'WHAT-IF HYDRODYNAMIC BENCHMARK',
    method: 'Full scenario footprint (T+0 to T+180m)',
  };
}

/**
 * Returns exposure breakdown by district at the given timestep.
 */
export function getDistrictExposure(currentTimeMin) {
  return DISTRICTS.map((district) => {
    const districtSettlements = PROTOTYPE_SETTLEMENTS.filter(
      (s) => district.settlementIds.includes(s.id)
    );
    const exposed = districtSettlements.filter(
      (s) => s.population > 0 && s.arrivalMin <= currentTimeMin
    );
    const threatened = districtSettlements.filter(
      (s) =>
        s.population > 0 &&
        s.arrivalMin > currentTimeMin &&
        s.arrivalMin - currentTimeMin <= 30
    );

    // Prototype flooded area: estimated km² from active settlements
    const floodedAreaKm2 =
      exposed.length > 0
        ? parseFloat((exposed.length * 3.4 + (currentTimeMin / 180) * 1.5).toFixed(1))
        : 0;

    return {
      ...district,
      exposedPop: exposed.reduce((acc, s) => acc + s.population, 0),
      threatenedPop: threatened.reduce((acc, s) => acc + s.population, 0),
      exposedSettlements: exposed.length,
      threatenedSettlements: threatened.length,
      totalDistrictSettlements: districtSettlements.length,
      floodedAreaKm2,
      status:
        exposed.length > 0
          ? 'IMPACTED'
          : threatened.length > 0
          ? 'THREATENED'
          : 'MONITORING',
      provenance: 'WHAT-IF HYDRODYNAMIC BENCHMARK',
    };
  });
}

/**
 * Returns next-priority settlement (shortest time until flood arrives, not yet arrived).
 */
export function getNextPrioritySettlement(currentTimeMin) {
  const upcoming = PROTOTYPE_SETTLEMENTS
    .filter((s) => s.population > 0 && s.arrivalMin > currentTimeMin)
    .sort((a, b) => a.arrivalMin - b.arrivalMin);
  return upcoming[0] || null;
}

/**
 * SELECTED AREA EXPOSURE
 * When user clicks on map or queries a specific radius, returns exposure ONLY for that area.
 * Accurately partitions population into Currently Exposed, Cumulative, and Projected.
 * Categorizes critical infrastructure into Healthcare, Shelters, Bridges, Roads, Power, and Aviation.
 */
export function getSelectedAreaExposure(lat, lon, radiusKm = 6.0, currentTimeMin = 60) {
  const areaKm2 = parseFloat((Math.PI * radiusKm * radiusKm).toFixed(1));

  // 1. Nearby settlements within buffer
  const nearbySettlements = PROTOTYPE_SETTLEMENTS.map((s) => ({
    ...s,
    distKm: getDistanceKm(lat, lon, s.lat, s.lon),
  })).filter((s) => s.distKm <= radiusKm);

  const currentlyExposedSettlements = nearbySettlements.filter(
    (s) => s.population > 0 && s.arrivalMin <= currentTimeMin
  );
  const threatenedSettlements = nearbySettlements.filter(
    (s) =>
      s.population > 0 &&
      s.arrivalMin > currentTimeMin &&
      s.arrivalMin - currentTimeMin <= 30
  );

  const currentlyExposedPop = currentlyExposedSettlements.reduce((acc, s) => acc + s.population, 0);
  const cumulativeExposedPop = currentlyExposedPop; // in single surge model
  const projectedExposedPop = nearbySettlements.reduce((acc, s) => acc + s.population, 0);

  // 2. Nearby infrastructure within buffer
  const nearbyInfra = PROTOTYPE_INFRASTRUCTURE.map((a) => ({
    ...a,
    distKm: getDistanceKm(lat, lon, a.lat, a.lon),
    risk: getInfrastructureRisk(a, currentTimeMin),
  })).filter((a) => a.distKm <= radiusKm);

  const healthcareList = nearbyInfra.filter((a) => ['hospital', 'clinic_phc'].includes(a.type));
  const sheltersList = nearbyInfra.filter((a) => a.type === 'shelter');
  const bridgesList = nearbyInfra.filter((a) => a.type === 'bridge');
  const roadsList = nearbyInfra.filter((a) => a.type === 'road');
  const powerList = nearbyInfra.filter((a) => a.type === 'power' || a.type === 'dam');
  const aviationList = nearbyInfra.filter((a) => a.type === 'helipad');

  const impactedInfra = nearbyInfra.filter((a) => a.risk.state === 'IMPACTED');
  const accessCompromisedInfra = nearbyInfra.filter((a) => a.risk.state === 'ACCESS_COMPROMISED');
  const threatenedInfra = nearbyInfra.filter((a) => a.risk.state === 'THREATENED');
  const safeInfra = nearbyInfra.filter((a) => a.risk.state === 'SAFE');

  // Estimated flooded area
  const floodedFraction = currentlyExposedSettlements.length > 0
    ? Math.min(0.85, (currentlyExposedSettlements.length / Math.max(1, nearbySettlements.length)) * 0.7 + 0.15)
    : 0;
  const floodedKm2 = parseFloat((areaKm2 * floodedFraction).toFixed(1));
  const floodedPercent = Math.round((floodedKm2 / Math.max(0.1, areaKm2)) * 100);

  return {
    center: [lat, lon],
    radiusKm,
    totalAreaKm2: areaKm2,
    floodedKm2,
    floodedPercent,
    exposedPop: currentlyExposedPop,
    currentlyExposedPop,
    cumulativeExposedPop,
    projectedExposedPop,
    totalPopInRadius: projectedExposedPop,
    settlementsCount: nearbySettlements.length,
    exposedSettlementsCount: currentlyExposedSettlements.length,
    threatenedSettlementsCount: threatenedSettlements.length,
    settlementsList: nearbySettlements,
    infraCount: nearbyInfra.length,
    impactedInfraCount: impactedInfra.length,
    accessCompromisedInfraCount: accessCompromisedInfra.length,
    threatenedInfraCount: threatenedInfra.length,
    safeInfraCount: safeInfra.length,
    infraList: nearbyInfra,
    healthcareList,
    sheltersList,
    bridgesList,
    roadsList,
    powerList,
    aviationList,
    provenance: 'PROTOTYPE EXPOSURE (Settlement approximation · WorldPop/GHSL disconnected)',
    method: `Spatial buffer intersection (${radiusKm} km radius)`,
  };
}
