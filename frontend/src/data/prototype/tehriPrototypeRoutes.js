/**
 * PRECOMPUTED PROTOTYPE DATA / NOT VALIDATED SOLVER OUTPUT
 * Multi-Modal Tactical HADR Evacuation & Rescue Routing for Tehri River Corridor.
 *
 * Route Modes Supported:
 *   - ROAD: PROTOTYPE ROAD-FOLLOWING ROUTE (solid emerald/cyan)
 *   - FALLBACK_GROUND: PROTOTYPE MOUNTAIN RIDGE FOOT TRAIL (dashed amber)
 *   - AIR_EVAC: PROTOTYPE HELICOPTER TRANSIT VECTOR (dotted purple)
 *   - BOAT: PROTOTYPE WATERBORNE ROUTE (dashed blue, available only in navigable reaches)
 *   - REJECTED: Submerged low valley road with distinct dangerous chokepoint marker (muted red)
 *
 * TIMING CONVENTION:
 *   All timestamps share a single origin: T_0 = Dam Breach Initiation.
 *   available_margin = checkpoint_flood_min - (mission_start_min + transit_to_checkpoint_min)
 *   operational_margin = available_margin - required_safety_buffer_min (where buffer = +10 min)
 *
 * PROVENANCE: PROTOTYPE FIXTURE
 */

export const PROTOTYPE_NDRF_BASE = {
  id: 'chamba_ndrf_base',
  name: 'NDRF / SDRF Forward Tactical Staging Base',
  shortName: 'NDRF Staging Base (Chamba Ridge)',
  lat: 30.345,
  lon: 78.395,
  elevationMsl: 1450,
  readinessStatus: 'STANDBY_FOR_MOBILIZATION',
  resourceRosterStatus: 'DATA UNAVAILABLE (Sourced from District EOC upon activation)',
  description: 'Forward tactical emergency operations post on elevated Chamba ridge (1,450m MSL). Provenance: PROTOTYPE FIXTURE.',
  provenance: 'PROTOTYPE FIXTURE',
};

/**
 * Calculates operational safety margin with deterministic mode-specific arithmetic.
 *
 * @param {Object} params
 * @param {number|null} params.checkpointFloodMin - Flood wave arrival at the mode's critical checkpoint
 * @param {number} params.missionStartMin - Mission dispatch time relative to T_0 (>= 0)
 * @param {number} params.transitToCheckpointMin - Travel time to reach the mode's critical checkpoint (>= 0)
 * @param {number} [params.requiredBufferMin=10] - Required safety buffer (positive value, default 10m)
 * @param {boolean} [params.isRouteAvailable=true] - Physical feasibility of the mode in this reach
 * @param {string} [params.unavailabilityReason=''] - Reason if route is physically not feasible
 * @returns {Object} Deterministic status and margin breakdown
 */
export function calculateOperationalMargin({
  checkpointFloodMin,
  missionStartMin = 0,
  transitToCheckpointMin,
  requiredBufferMin = 10,
  isRouteAvailable = true,
  unavailabilityReason = '',
}) {
  if (!isRouteAvailable) {
    return {
      status: 'UNAVAILABLE',
      availableMarginMin: null,
      operationalMarginMin: null,
      deficitMin: null,
      label: unavailabilityReason
        ? `ROUTE NOT FEASIBLE UNDER CURRENT SCENARIO (${unavailabilityReason})`
        : 'ROUTE NOT FEASIBLE UNDER CURRENT SCENARIO',
      badgeColor: 'gray',
      isFeasible: false,
    };
  }

  // Sanitize numeric inputs (protection against NaN / Infinity / negative transit)
  if (
    typeof transitToCheckpointMin !== 'number' ||
    isNaN(transitToCheckpointMin) ||
    !isFinite(transitToCheckpointMin) ||
    transitToCheckpointMin < 0 ||
    typeof missionStartMin !== 'number' ||
    isNaN(missionStartMin) ||
    !isFinite(missionStartMin) ||
    missionStartMin < 0
  ) {
    return {
      status: 'MARGIN_UNAVAILABLE',
      availableMarginMin: null,
      operationalMarginMin: null,
      deficitMin: null,
      label: 'MARGIN UNAVAILABLE',
      badgeColor: 'gray',
      isFeasible: false,
    };
  }

  // If checkpoint flood is not defined or is null (e.g. unverified checkpoint)
  if (
    checkpointFloodMin === null ||
    checkpointFloodMin === undefined ||
    typeof checkpointFloodMin !== 'number' ||
    isNaN(checkpointFloodMin) ||
    !isFinite(checkpointFloodMin)
  ) {
    return {
      status: 'MARGIN_UNAVAILABLE',
      availableMarginMin: null,
      operationalMarginMin: null,
      deficitMin: null,
      label: 'MARGIN UNAVAILABLE',
      badgeColor: 'gray',
      isFeasible: false,
    };
  }

  const responderArrivalAtCheckpoint = missionStartMin + transitToCheckpointMin;
  const availableMargin = checkpointFloodMin - responderArrivalAtCheckpoint;
  const operationalMargin = availableMargin - requiredBufferMin;

  if (operationalMargin < 0) {
    const deficit = Math.abs(operationalMargin);
    return {
      status: 'SAFETY_BUFFER_DEFICIT',
      availableMarginMin: availableMargin,
      operationalMarginMin: operationalMargin,
      deficitMin: deficit,
      label: `GROUND ROUTE FAILS CONFIGURED SAFETY BUFFER (${deficit} min deficit)`,
      badgeColor: 'red',
      isFeasible: false,
    };
  }

  return {
    status: 'OPERATIONAL_WINDOW_SAFE',
    availableMarginMin: availableMargin,
    operationalMarginMin: operationalMargin,
    deficitMin: 0,
    label: `+${operationalMargin} min Safe Window (Buffer Met)`,
    badgeColor: operationalMargin >= 15 ? 'emerald' : 'amber',
    isFeasible: true,
  };
}

export const PROTOTYPE_TACTICAL_ROUTES = {
  // ─── 1. SIRAIN VILLAGE (KM 4.2) ─────────────────────────────────────────
  sirain: {
    settlementId: 'sirain',
    settlementName: 'Sirain Village',
    kmFromDam: 4.2,
    population: 840,
    floodArrivalMin: 8,
    peakDepthM: 34.0,
    recommendedMode: 'ROAD',
    fallbackMode: 'FALLBACK_GROUND',
    primaryDestination: 'New Tehri High-Ground Assembly Area',
    nearestHospital: 'District Hospital Tehri (Borasari)',
    nearestHospitalEtaMin: 18,
    nearestShelter: 'New Tehri High-Ground Assembly Area',
    nearestShelterEtaMin: 14,
    accessRisk: 'VALLEY_ROAD_SUBMERGED',

    // ROAD: High-Ridge Bypass Route
    roadRoute: {
      type: 'ROAD',
      label: 'Recommended High-Ridge Road Bypass',
      mode: 'PROTOTYPE ROAD-FOLLOWING ROUTE',
      color: '#10b981',
      dashArray: null,
      etaMin: 14,
      distKm: 9.8,
      isAvailable: true,
      checkpointName: 'Prototype Road Checkpoint A (Km 4.2)',
      checkpointFloodMin: 6,
      transitToCheckpointMin: 8,
      rationale: 'Avoids submerged Bhagirathi canyon floor; follows New Tehri high ridge road (Elev > 1,400m MSL).',
      routeCoords: [
        [30.345, 78.395],
        [30.348, 78.406],
        [30.352, 78.418],
        [30.355, 78.428],
        [30.358, 78.438],
        [30.362, 78.448],
        [30.365, 78.459],
        [30.368, 78.468],
        [30.369, 78.475],
        [30.366, 78.483],
        [30.362, 78.490],
      ],
    },

    // FOOT: Mountain Ridge Trail
    fallbackGroundRoute: {
      type: 'FALLBACK_GROUND',
      label: 'Fallback Mountain Ridge Foot Trail',
      mode: 'PROTOTYPE MOUNTAIN RIDGE FOOT TRAIL',
      color: '#f59e0b',
      dashArray: '6,6',
      etaMin: 38,
      distKm: 7.2,
      isAvailable: true,
      checkpointName: 'Prototype Ridge Trail Checkpoint B (Km 4.2)',
      checkpointFloodMin: 35,
      transitToCheckpointMin: 15,
      rationale: 'Secondary mountain footpath along crest trail. Usable if vehicular ridge road is congested.',
      routeCoords: [
        [30.345, 78.395],
        [30.350, 78.410],
        [30.356, 78.430],
        [30.361, 78.455],
        [30.365, 78.472],
        [30.362, 78.490],
      ],
    },

    // AIR: Helicopter Transit Vector
    airEvacRoute: {
      type: 'AIR_EVAC',
      label: 'Helicopter Extraction (Chamba Staging → Sirain LZ)',
      mode: 'PROTOTYPE HELICOPTER TRANSIT VECTOR',
      color: '#c084fc',
      dashArray: '3,6',
      etaMin: 5,
      distKm: 9.4,
      isAvailable: true,
      checkpointName: 'Prototype Air Extraction Zone C (Elev 880m MSL)',
      checkpointFloodMin: 45,
      transitToCheckpointMin: 4,
      rationale: 'Direct aerial casualty transit from Chamba Staging Helipad to designated Sirain upper terrace landing zone.',
      routeCoords: [
        [30.342, 78.392],
        [30.352, 78.441],
        [30.362, 78.490],
      ],
    },

    // BOAT: Non-navigable gorge reach
    boatRoute: {
      type: 'BOAT',
      label: 'Waterborne Route',
      mode: 'PROTOTYPE WATERBORNE ROUTE',
      color: '#0284c7',
      dashArray: '5,5',
      etaMin: null,
      distKm: null,
      isAvailable: false,
      unavailabilityReason: 'Non-navigable gorge rapids & debris surge',
      checkpointName: 'Prototype Water Access Point D (Km 4.2)',
      checkpointFloodMin: null,
      transitToCheckpointMin: null,
      rationale: 'Waterborne navigation is physically not feasible in high-velocity canyon rapids.',
      routeCoords: [],
    },

    // Rejected Low Valley Road
    rejectedRoute: {
      type: 'REJECTED',
      label: 'Rejected Valley Low Road',
      mode: 'REJECTED ROAD ROUTE',
      color: '#ef4444',
      dashArray: '6,6',
      etaMin: 9,
      distKm: 6.2,
      bridgeFloodMin: 6,
      hazardReason: 'Low road crossing submerged by initial surge at T+6 min before responder arrival.',
      hazardPointCoords: [30.368, 78.470],
      routeCoords: [
        [30.345, 78.395],
        [30.350, 78.412],
        [30.355, 78.425],
        [30.358, 78.438],
        [30.362, 78.450],
        [30.366, 78.462],
        [30.368, 78.470],
        [30.366, 78.478],
        [30.365, 78.482],
        [30.362, 78.490],
      ],
    },
  },

  // ─── 2. TIPRI RIVERSIDE (KM 9.5) ────────────────────────────────────────
  tipri: {
    settlementId: 'tipri',
    settlementName: 'Tipri Riverside',
    kmFromDam: 9.5,
    population: 1250,
    floodArrivalMin: 18,
    peakDepthM: 28.5,
    recommendedMode: 'ROAD',
    fallbackMode: 'FALLBACK_GROUND',
    primaryDestination: 'Chamba Ridge Relief Hub',
    nearestHospital: 'Chamba Primary Health Centre (PHC)',
    nearestHospitalEtaMin: 18,
    nearestShelter: 'Chamba Ridge Relief Hub',
    nearestShelterEtaMin: 18,
    accessRisk: 'LOW_CULVERT_FLOODED',

    roadRoute: {
      type: 'ROAD',
      label: 'Recommended Chamba-Tipri Ridge Road',
      mode: 'PROTOTYPE ROAD-FOLLOWING ROUTE',
      color: '#10b981',
      dashArray: null,
      etaMin: 18,
      distKm: 12.4,
      isAvailable: true,
      checkpointName: 'Prototype Road Checkpoint A (Km 9.5)',
      checkpointFloodMin: 32,
      transitToCheckpointMin: 12,
      rationale: 'Follows elevated Chamba-Tipri mountain ridge road with designated medical staging outpost.',
      routeCoords: [
        [30.345, 78.395],
        [30.344, 78.408],
        [30.342, 78.420],
        [30.340, 78.435],
        [30.338, 78.448],
        [30.336, 78.462],
        [30.334, 78.475],
        [30.335, 78.488],
        [30.335, 78.498],
      ],
    },

    fallbackGroundRoute: {
      type: 'FALLBACK_GROUND',
      label: 'Fallback Southern Ridge Trail',
      mode: 'PROTOTYPE MOUNTAIN RIDGE FOOT TRAIL',
      color: '#f59e0b',
      dashArray: '6,6',
      etaMin: 45,
      distKm: 9.8,
      isAvailable: true,
      checkpointName: 'Prototype Ridge Trail Checkpoint B (Km 9.5)',
      checkpointFloodMin: 40,
      transitToCheckpointMin: 18,
      rationale: 'Contour trail bypassing low terrace.',
      routeCoords: [
        [30.345, 78.395],
        [30.340, 78.425],
        [30.336, 78.460],
        [30.335, 78.498],
      ],
    },

    airEvacRoute: {
      type: 'AIR_EVAC',
      label: 'Helicopter Transit (Chamba → Tipri High Helipad)',
      mode: 'PROTOTYPE HELICOPTER TRANSIT VECTOR',
      color: '#c084fc',
      dashArray: '3,6',
      etaMin: 6,
      distKm: 10.8,
      isAvailable: true,
      checkpointName: 'Prototype Air Extraction Zone C (Elev 790m MSL)',
      checkpointFloodMin: 50,
      transitToCheckpointMin: 5,
      rationale: 'Direct aerial link to high agricultural terrace LZ.',
      routeCoords: [
        [30.342, 78.392],
        [30.338, 78.445],
        [30.335, 78.498],
      ],
    },

    boatRoute: {
      type: 'BOAT',
      label: 'Waterborne Route',
      mode: 'PROTOTYPE WATERBORNE ROUTE',
      color: '#0284c7',
      dashArray: '5,5',
      etaMin: null,
      distKm: null,
      isAvailable: false,
      unavailabilityReason: 'Non-navigable gorge rapids',
      checkpointName: 'Prototype Water Access Point D (Km 9.5)',
      checkpointFloodMin: null,
      transitToCheckpointMin: null,
      rationale: 'Waterborne navigation not feasible in upper canyon.',
      routeCoords: [],
    },

    rejectedRoute: {
      type: 'REJECTED',
      label: 'Rejected Direct Low Gorge Track',
      mode: 'REJECTED ROAD ROUTE',
      color: '#ef4444',
      dashArray: '6,6',
      etaMin: 11,
      distKm: 8.2,
      bridgeFloodMin: 14,
      hazardReason: 'Direct gorge floor link cut off by surge wave along low culvert at T+14 min.',
      hazardPointCoords: [30.338, 78.468],
      routeCoords: [
        [30.345, 78.395],
        [30.348, 78.415],
        [30.348, 78.430],
        [30.342, 78.450],
        [30.338, 78.468],
        [30.337, 78.478],
        [30.336, 78.485],
        [30.335, 78.498],
      ],
    },
  },

  // ─── 3. PANGARH SETTLEMENT (KM 14.8) ────────────────────────────────────
  pangarh: {
    settlementId: 'pangarh',
    settlementName: 'Pangarh Settlement',
    kmFromDam: 14.8,
    population: 620,
    floodArrivalMin: 26,
    peakDepthM: 24.0,
    recommendedMode: 'ROAD',
    fallbackMode: 'AIR_EVAC',
    primaryDestination: 'Kandisaur High Ground Assembly Point',
    nearestHospital: 'Chamba Primary Health Centre (PHC)',
    nearestHospitalEtaMin: 24,
    nearestShelter: 'Kandisaur High Ground Assembly Point',
    nearestShelterEtaMin: 22,
    accessRisk: 'LOW_CROSSING_AT_RISK',

    roadRoute: {
      type: 'ROAD',
      label: 'Recommended Kandisaur High Ridge Route',
      mode: 'PROTOTYPE ROAD-FOLLOWING ROUTE',
      color: '#10b981',
      dashArray: null,
      etaMin: 22,
      distKm: 15.6,
      isAvailable: true,
      checkpointName: 'Prototype Road Checkpoint A (Km 14.8)',
      checkpointFloodMin: 42,
      transitToCheckpointMin: 16,
      rationale: 'Contour elevation remains above 1,100m MSL throughout transit with safe access to relief camp.',
      routeCoords: [
        [30.345, 78.395],
        [30.338, 78.410],
        [30.332, 78.425],
        [30.326, 78.440],
        [30.320, 78.455],
        [30.317, 78.468],
        [30.315, 78.480],
        [30.314, 78.492],
        [30.312, 78.502],
      ],
    },

    fallbackGroundRoute: {
      type: 'FALLBACK_GROUND',
      label: 'Fallback Kandisaur Foot Trail',
      mode: 'PROTOTYPE MOUNTAIN RIDGE FOOT TRAIL',
      color: '#f59e0b',
      dashArray: '6,6',
      etaMin: 50,
      distKm: 11.2,
      isAvailable: true,
      checkpointName: 'Prototype Ridge Trail Checkpoint B (Km 14.8)',
      checkpointFloodMin: 55,
      transitToCheckpointMin: 24,
      rationale: 'Pack trail through pine forest ridgeline.',
      routeCoords: [
        [30.345, 78.395],
        [30.330, 78.435],
        [30.318, 78.470],
        [30.312, 78.502],
      ],
    },

    airEvacRoute: {
      type: 'AIR_EVAC',
      label: 'Air Evac Corridor (Chamba → Pangarh Ridge LZ)',
      mode: 'PROTOTYPE HELICOPTER TRANSIT VECTOR',
      color: '#c084fc',
      dashArray: '3,6',
      etaMin: 7,
      distKm: 12.0,
      isAvailable: true,
      checkpointName: 'Prototype Air Extraction Zone C (Elev 820m MSL)',
      checkpointFloodMin: 60,
      transitToCheckpointMin: 6,
      rationale: 'Helicopter evacuation to designated Kandisaur helipad.',
      routeCoords: [
        [30.342, 78.392],
        [30.328, 78.448],
        [30.312, 78.502],
      ],
    },

    boatRoute: {
      type: 'BOAT',
      label: 'Waterborne Route',
      mode: 'PROTOTYPE WATERBORNE ROUTE',
      color: '#0284c7',
      dashArray: '5,5',
      etaMin: null,
      distKm: null,
      isAvailable: false,
      unavailabilityReason: 'Non-navigable upper reach',
      checkpointName: 'Prototype Water Access Point D (Km 14.8)',
      checkpointFloodMin: null,
      transitToCheckpointMin: null,
      rationale: 'Waterborne transit not feasible in upper reach.',
      routeCoords: [],
    },

    rejectedRoute: {
      type: 'REJECTED',
      label: 'Rejected Low-River Track',
      mode: 'REJECTED ROAD ROUTE',
      color: '#ef4444',
      dashArray: '6,6',
      etaMin: 15,
      distKm: 11.0,
      bridgeFloodMin: 20,
      hazardReason: 'Narrow riverbend access track and footbridge submerged by peak flood wave at T+20 min.',
      hazardPointCoords: [30.318, 78.485],
      routeCoords: [
        [30.345, 78.395],
        [30.340, 78.420],
        [30.335, 78.445],
        [30.325, 78.468],
        [30.318, 78.485],
        [30.315, 78.495],
        [30.312, 78.502],
      ],
    },
  },

  // ─── 4. KOTESHWAR BASTI (KM 22.0) ───────────────────────────────────────
  koteshwar: {
    settlementId: 'koteshwar',
    settlementName: 'Koteshwar Basti & Dam',
    kmFromDam: 22.0,
    population: 3400,
    floodArrivalMin: 32,
    peakDepthM: 42.0,
    recommendedMode: 'ROAD',
    fallbackMode: 'BOAT',
    primaryDestination: 'Koteshwar Right-Bank Assembly Area',
    nearestHospital: 'Chamba Primary Health Centre (PHC)',
    nearestHospitalEtaMin: 28,
    nearestShelter: 'Koteshwar Right-Bank Assembly Area',
    nearestShelterEtaMin: 12,
    accessRisk: 'TAILRACE_CROSSING_SUBMERGED',

    roadRoute: {
      type: 'ROAD',
      label: 'Recommended Right-Bank Ridge Highway',
      mode: 'PROTOTYPE ROAD-FOLLOWING ROUTE',
      color: '#10b981',
      dashArray: null,
      etaMin: 28,
      distKm: 19.2,
      isAvailable: true,
      checkpointName: 'Prototype Road Checkpoint A (Km 22.0)',
      checkpointFloodMin: 55,
      transitToCheckpointMin: 20,
      rationale: 'Uses heavy haul road on the right abutment ridge. Clear from tailrace backwater.',
      routeCoords: [
        [30.345, 78.395],
        [30.332, 78.408],
        [30.320, 78.420],
        [30.308, 78.435],
        [30.295, 78.450],
        [30.290, 78.468],
        [30.285, 78.485],
        [30.280, 78.500],
        [30.278, 78.512],
      ],
    },

    fallbackGroundRoute: {
      type: 'FALLBACK_GROUND',
      label: 'Fallback Abutment Service Track',
      mode: 'PROTOTYPE MOUNTAIN RIDGE FOOT TRAIL',
      color: '#f59e0b',
      dashArray: '6,6',
      etaMin: 55,
      distKm: 15.0,
      isAvailable: true,
      checkpointName: 'Prototype Ridge Trail Checkpoint B (Km 22.0)',
      checkpointFloodMin: 65,
      transitToCheckpointMin: 30,
      rationale: 'High abutment maintenance service track.',
      routeCoords: [
        [30.345, 78.395],
        [30.315, 78.440],
        [30.288, 78.480],
        [30.278, 78.512],
      ],
    },

    airEvacRoute: {
      type: 'AIR_EVAC',
      label: 'Air Evac Corridor (Chamba → Koteshwar Helipad)',
      mode: 'PROTOTYPE HELICOPTER TRANSIT VECTOR',
      color: '#c084fc',
      dashArray: '3,6',
      etaMin: 9,
      distKm: 15.4,
      isAvailable: true,
      checkpointName: 'Prototype Air Extraction Zone C (Elev 680m MSL)',
      checkpointFloodMin: 70,
      transitToCheckpointMin: 8,
      rationale: 'Air extraction to emergency helipad on right abutment.',
      routeCoords: [
        [30.342, 78.392],
        [30.310, 78.452],
        [30.278, 78.512],
      ],
    },

    boatRoute: {
      type: 'BOAT',
      label: 'Waterborne Evacuation Corridor (Reservoir Slackwater)',
      mode: 'PROTOTYPE WATERBORNE ROUTE',
      color: '#0284c7',
      dashArray: '5,5',
      etaMin: 20,
      distKm: 11.5,
      isAvailable: true,
      checkpointName: 'Prototype Water Access Point D (Km 22.0)',
      checkpointFloodMin: 45,
      transitToCheckpointMin: 14,
      rationale: 'Waterborne operations along stable reservoir slack-water channel.',
      routeCoords: [
        [30.300, 78.480],
        [30.290, 78.495],
        [30.282, 78.505],
        [30.278, 78.512],
      ],
    },

    rejectedRoute: {
      type: 'REJECTED',
      label: 'Rejected Powerhouse Tailrace Road',
      mode: 'REJECTED ROAD ROUTE',
      color: '#ef4444',
      dashArray: '6,6',
      etaMin: 20,
      distKm: 14.5,
      bridgeFloodMin: 28,
      hazardReason: 'Tailrace bridge and low powerhouse approach road flooded under surge at T+28 min.',
      hazardPointCoords: [30.282, 78.498],
      routeCoords: [
        [30.345, 78.395],
        [30.328, 78.420],
        [30.310, 78.450],
        [30.295, 78.475],
        [30.282, 78.498],
        [30.280, 78.505],
        [30.278, 78.512],
      ],
    },
  },

  // ─── 5. DEVPRAYAG CONFLUENCE (KM 42.0) ──────────────────────────────────
  devprayag: {
    settlementId: 'devprayag',
    settlementName: 'Devprayag Confluence Town',
    kmFromDam: 42.0,
    population: 3200,
    floodArrivalMin: 68,
    peakDepthM: 18.0,
    recommendedMode: 'ROAD',
    fallbackMode: 'BOAT',
    primaryDestination: 'Devprayag Upper Bazaar Assembly Area',
    nearestHospital: 'Devprayag Community Health Centre (CHC)',
    nearestHospitalEtaMin: 12,
    nearestShelter: 'Devprayag Upper Bazaar Assembly Area',
    nearestShelterEtaMin: 10,
    accessRisk: 'LOWER_GHAT_ROAD_FLOODED',

    roadRoute: {
      type: 'ROAD',
      label: 'NH-58 Upper Bypass Corridor',
      mode: 'PROTOTYPE ROAD-FOLLOWING ROUTE',
      color: '#10b981',
      dashArray: null,
      etaMin: 42,
      distKm: 34.0,
      isAvailable: true,
      checkpointName: 'Prototype Road Checkpoint A (Km 42.0)',
      checkpointFloodMin: 95,
      transitToCheckpointMin: 32,
      rationale: 'NH-58 upper hill cut remains above the maximum surge level. Sangam lower ghats evacuated to Upper Bazaar.',
      routeCoords: [
        [30.345, 78.395],
        [30.300, 78.440],
        [30.240, 78.490],
        [30.180, 78.550],
        [30.155, 78.585],
        [30.147, 78.599],
      ],
    },

    fallbackGroundRoute: {
      type: 'FALLBACK_GROUND',
      label: 'Alaknanda Ridge Foot Trail',
      mode: 'PROTOTYPE MOUNTAIN RIDGE FOOT TRAIL',
      color: '#f59e0b',
      dashArray: '6,6',
      etaMin: 80,
      distKm: 22.0,
      isAvailable: true,
      checkpointName: 'Prototype Ridge Trail Checkpoint B (Km 42.0)',
      checkpointFloodMin: 110,
      transitToCheckpointMin: 45,
      rationale: 'High foot trail along the left bank ridge connecting upper villages.',
      routeCoords: [
        [30.345, 78.395],
        [30.250, 78.470],
        [30.180, 78.540],
        [30.147, 78.599],
      ],
    },

    airEvacRoute: {
      type: 'AIR_EVAC',
      label: 'Helicopter Extraction (Chamba → Devprayag Helipad)',
      mode: 'PROTOTYPE HELICOPTER TRANSIT VECTOR',
      color: '#c084fc',
      dashArray: '3,6',
      etaMin: 14,
      distKm: 28.0,
      isAvailable: true,
      checkpointName: 'Prototype Air Extraction Zone C (Elev 560m MSL)',
      checkpointFloodMin: 120,
      transitToCheckpointMin: 12,
      rationale: 'Aerial casualty transfer to designated helipad at Devprayag.',
      routeCoords: [
        [30.342, 78.392],
        [30.240, 78.500],
        [30.147, 78.599],
      ],
    },

    boatRoute: {
      type: 'BOAT',
      label: 'Ganga Confluence Waterborne Patrol',
      mode: 'PROTOTYPE WATERBORNE ROUTE',
      color: '#0284c7',
      dashArray: '5,5',
      etaMin: 30,
      distKm: 18.0,
      isAvailable: true,
      checkpointName: 'Prototype Water Access Point D (Km 42.0)',
      checkpointFloodMin: 80,
      transitToCheckpointMin: 22,
      rationale: 'Waterborne rescue operations in wide Alaknanda-Bhagirathi pool.',
      routeCoords: [
        [30.165, 78.580],
        [30.155, 78.590],
        [30.147, 78.599],
      ],
    },

    rejectedRoute: {
      type: 'REJECTED',
      label: 'Rejected Lower Sangam Ghat Road',
      mode: 'REJECTED ROAD ROUTE',
      color: '#ef4444',
      dashArray: '6,6',
      etaMin: 35,
      distKm: 31.0,
      bridgeFloodMin: 65,
      hazardReason: 'Lower Sangam bridge and riverside market street submerged at T+65m under combined surge.',
      hazardPointCoords: [30.148, 78.600],
      routeCoords: [
        [30.345, 78.395],
        [30.280, 78.460],
        [30.200, 78.520],
        [30.152, 78.595],
        [30.148, 78.600],
        [30.147, 78.599],
      ],
    },
  },
};
