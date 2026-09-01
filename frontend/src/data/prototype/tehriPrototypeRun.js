/**
 * PRECOMPUTED PROTOTYPE DATA / NOT VALIDATED SOLVER OUTPUT
 * Unified single source of truth for the FloodLab Tehri Dam benchmark scenario.
 *
 * Case: Tehri Dam -> Bhagirathi River -> Uttarakhand, India
 * Pipeline: Real Inputs -> Hydrology -> Froehlich Breach -> DualSPHysics (0-2km) -> Q(t) Coupling -> Delft3D FM (2-145km) -> HADR Routing
 */

import { DOMAIN_CONFIG } from './tehriDomainConfig';

export const PROTOTYPE_METADATA = {
  isPrototype: true,
  prototypeLabel: 'PRECOMPUTED PROTOTYPE',
  provenance: 'PRECOMPUTED PROTOTYPE',
  disclaimer: 'Precomputed prototype scenario output for demonstration and planning visualization. Not a live validated solver execution.',
  scenarioId: 'tehri_prototype_severe',
  runId: 'prototype_tehri_001',
  timestamp: '2026-09-01T09:00:00Z',
  domain: DOMAIN_CONFIG,
  dam: {
    name: 'Tehri Dam',
    fullName: 'Tehri Dam (Bhagirathi River, Uttarakhand)',
    state: 'Uttarakhand',
    basin: 'Upper Ganga / Bhagirathi Basin',
    type: 'Zoned Earth & Rockfill Embankment',
    damHeightM: 260.5, // REPORTED (CWC / THDC Technical Data)
    hydraulicHeadM: 260.0,
    crestElevationMsl: 839.5,
    crestLengthM: 575.0,
    fullReservoirLevelMsl: 830.0, // REPORTED DESIGN LEVEL
    currentWaterLevelMsl: null, // DATA UNAVAILABLE (SCADA Offline)
    reservoirStateAtBreach: 'ASSUMED SCENARIO STATE (At FRL 830m MSL)',
    grossStorageM3: 3540000000.0, // 3.54 BCM REPORTED
    liveStorageM3: 2620000000.0, // 2.62 BCM REPORTED
    breachVolumeParamM3: 2620000000.0, // PRECOMPUTED PROTOTYPE PARAMETER
    riverBedMsl: 570.0,
    installedCapacityMw: 2400,
    reachLengthKm: DOMAIN_CONFIG.prototypeReachLengthKm,
    valleyWidthM: 450.0,
    bedSlope: 0.0055,
    manningN: 0.042,
    coordinates: [30.378, 78.481], // [lat, lon]
  },
  breachMechanics: {
    formulation: 'Froehlich (2008) Parametric Embankment Breach',
    formulationStatus: 'PRECOMPUTED PROTOTYPE · Froehlich (2008) Parametric Formulation',
    avgBreachWidthM: 248.5,
    sideSlopeZ: 1.4,
    breachFormationTimeHrs: 1.85,
    timeToPeakHrs: 0.74, // ~44.4 minutes
    peakDischargeM3s: 84200.0,
    hydrographTimesHrs: [0, 0.25, 0.5, 0.74, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0],
    hydrographFlowsM3s: [0, 8500, 32000, 84200, 71000, 48000, 31000, 19500, 11200, 4200, 1200, 350],
  },
  sphNearField: {
    solver: 'DualSPHysics v5.2 (Weakly Compressible SPH)',
    domainRangeKm: [0, 2.0],
    peakSurgeVelocityMs: 22.4,
    particleCount: 1850000,
    smoothingLengthH: 1.8,
    equationOfState: 'Tait EOS (gamma = 7)',
    executionStatus: 'PRECOMPUTED PROTOTYPE',
  },
  couplingTransect: {
    locationKm: 2.0,
    locationCoords: [30.368, 78.472],
    formulation: 'Q(t) = ∫ v · n dA',
    direction: 'Downstream along gorge normal',
    executionStatus: 'PRECOMPUTED PROTOTYPE',
  },
  delft3dFarField: {
    solver: 'Delft3D Flexible Mesh (2D Shallow Water Equations)',
    domainRangeKm: [2.0, DOMAIN_CONFIG.prototypeReachLengthKm],
    reachDescription: DOMAIN_CONFIG.corridorSummary,
    gridResolutionM: '10–50 m adaptive unstructured mesh',
    roughnessModel: 'Spatially variable Manning n (0.035–0.055)',
    executionStatus: 'PRECOMPUTED PROTOTYPE',
  },
  comparisonMetrics: {
    csi: null,
    pod: null,
    far: null,
    maeDepthM: null,
    peakQDiffPct: null,
    status: 'DATA UNAVAILABLE · SOLVER NOT EXECUTED',
  },
};
