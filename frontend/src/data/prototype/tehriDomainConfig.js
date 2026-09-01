/**
 * SINGLE AUTHORITATIVE GEOSPATIAL DOMAIN CONFIGURATION
 * FloodLab Tehri Dam to Bijnor Barrage Corridor (0–145 km)
 *
 * PROVENANCE: PRECOMPUTED PROTOTYPE
 */

export const DOMAIN_CONFIG = {
  upstreamBoundary: 'Tehri Dam Axis (30.378°N, 78.481°E)',
  downstreamBoundary: 'Bijnor Barrage / Madhya Ganga (29.375°N, 78.130°E)',
  boundaryType: 'PROTOTYPE_STUDY_CUTOFF',
  downstreamBoundaryLabel: 'PROTOTYPE STUDY DOMAIN BOUNDARY',
  prototypeReachLengthKm: 145.0,
  maxSimulationTimeMin: 240, // 4.0 Hours
  provenance: 'PRECOMPUTED PROTOTYPE',
  corridorSummary: 'Tehri Dam → Bhagirathi Gorge → Devprayag → Rishikesh → Haridwar → Upper Ganga Plains → Bijnor Barrage',
};

// Sinuous centerline following real Bhagirathi and Ganga river geomorphology
export const RIVER_CENTERLINE = [
  // ─── MOUNTAIN / CONFINED GORGE REACH (0–75 km) ──────────────────────
  { km: 0.0,   lat: 30.378, lon: 78.481, name: 'Tehri Dam Axis',         widthM: 450,  depth: 68.5, regime: 'GORGE' },
  { km: 1.5,   lat: 30.372, lon: 78.485, name: 'Near-Field Domain',      widthM: 400,  depth: 55.0, regime: 'GORGE' },
  { km: 2.0,   lat: 30.368, lon: 78.472, name: 'Coupling Transect',      widthM: 380,  depth: 50.0, regime: 'GORGE' },
  { km: 4.2,   lat: 30.362, lon: 78.490, name: 'Sirain Village',         widthM: 420,  depth: 34.0, regime: 'GORGE' },
  { km: 7.0,   lat: 30.348, lon: 78.494, name: 'Upper Gorge Bend',       widthM: 350,  depth: 31.0, regime: 'GORGE' },
  { km: 9.5,   lat: 30.335, lon: 78.498, name: 'Tipri Riverside',        widthM: 480,  depth: 28.5, regime: 'GORGE' },
  { km: 12.0,  lat: 30.324, lon: 78.500, name: 'Chamba Canyon Bend',     widthM: 360,  depth: 26.0, regime: 'GORGE' },
  { km: 14.8,  lat: 30.312, lon: 78.502, name: 'Pangarh Settlement',     widthM: 390,  depth: 24.0, regime: 'GORGE' },
  { km: 18.0,  lat: 30.298, lon: 78.503, name: 'Koteshwar Approach',     widthM: 440,  depth: 32.0, regime: 'GORGE' },
  { km: 22.0,  lat: 30.278, lon: 78.512, name: 'Koteshwar Dam',          widthM: 520,  depth: 42.0, regime: 'GORGE' },
  { km: 26.5,  lat: 30.248, lon: 78.528, name: 'Lower Koteshwar Gorge',  widthM: 410,  depth: 30.0, regime: 'GORGE' },
  { km: 31.0,  lat: 30.220, lon: 78.545, name: 'Bagwan Hamlet',          widthM: 460,  depth: 26.0, regime: 'GORGE' },
  { km: 36.5,  lat: 30.182, lon: 78.572, name: 'Ganga Valley Meander',   widthM: 490,  depth: 25.0, regime: 'GORGE' },
  { km: 42.0,  lat: 30.146, lon: 78.598, name: 'Devprayag Sangam',       widthM: 650,  depth: 28.5, regime: 'GORGE' },
  { km: 48.0,  lat: 30.138, lon: 78.535, name: 'Singtoli Gorge',         widthM: 520,  depth: 24.0, regime: 'GORGE' },
  { km: 55.0,  lat: 30.125, lon: 78.462, name: 'Kaudiyala Canyon',       widthM: 560,  depth: 23.0, regime: 'GORGE' },
  { km: 62.0,  lat: 30.113, lon: 78.396, name: 'Shivpuri Gorge',         widthM: 580,  depth: 22.0, regime: 'GORGE' },
  { km: 70.0,  lat: 30.098, lon: 78.330, name: 'Brahmapuri Reach',       widthM: 680,  depth: 18.0, regime: 'GORGE' },

  // ─── FOOTHILLS TRANSITION (75–100 km) ──────────────────────────────
  { km: 78.0,  lat: 30.086, lon: 78.267, name: 'Rishikesh Town',         widthM: 1100, depth: 15.2, regime: 'FOOTHILLS' },
  { km: 89.0,  lat: 30.015, lon: 78.210, name: 'Raiwala Plains Reach',   widthM: 1600, depth: 12.0, regime: 'FOOTHILLS' },
  { km: 100.0, lat: 29.945, lon: 78.164, name: 'Haridwar Bhimgoda',      widthM: 2200, depth: 9.4,  regime: 'PLAINS' },

  // ─── UPPER GANGA FLOODPLAINS REACH (100–145 km) ────────────────────
  { km: 108.0, lat: 29.825, lon: 78.182, name: 'Laksar Agricultural Reach', widthM: 3200, depth: 7.2, regime: 'PLAINS' },
  { km: 118.0, lat: 29.710, lon: 78.196, name: 'Sultanpur Floodplain',      widthM: 3800, depth: 5.8, regime: 'PLAINS' },
  { km: 128.0, lat: 29.580, lon: 78.188, name: 'Balawali Bridge Reach',     widthM: 4200, depth: 4.8, regime: 'PLAINS' },
  { km: 138.0, lat: 29.470, lon: 78.160, name: 'Raoli Lowland Corridor',    widthM: 4600, depth: 4.0, regime: 'PLAINS' },
  { km: 145.0, lat: 29.375, lon: 78.130, name: 'Bijnor Barrage Boundary',   widthM: 5000, depth: 3.4, regime: 'BOUNDARY' },
];
