/**
 * Deterministic High-Resolution Building Footprints & House Profiles
 * along the Bhagirathi River Corridor in Uttarakhand.
 *
 * Provides realistic building polygons, elevations, and structural types
 * for house-level flood impact visualization at high zoom levels (Zoom 15–18).
 */

export const UTTARAKHAND_CORRIDOR_BOUNDS = [
  [29.90, 78.10], // South-West (Rishikesh / Haridwar plains)
  [30.60, 78.80], // North-East (Tehri Reservoir / Dam crest)
];

export const UTTARAKHAND_MAX_BOUNDS = [
  [29.70, 77.90],
  [30.75, 78.95],
];

// Major Uttarakhand focal locations for quick camera flying
export const UTTARAKHAND_FOCAL_PRESETS = [
  {
    id: 'corridor',
    name: 'Uttarakhand Regional Corridor',
    center: [30.25, 78.48],
    zoom: 11,
    description: 'Overview: Tehri Dam down to Rishikesh along the Bhagirathi gorge.',
  },
  {
    id: 'chham',
    name: 'Chham Village (House-Level)',
    center: [30.3342, 78.5018],
    zoom: 17,
    villageId: 'VIL-001',
    description: 'Zoomed-in house footprints, terraced homes & primary school along left bank.',
  },
  {
    id: 'kandi',
    name: 'Kandi Valley (House-Level)',
    center: [30.3110, 78.5130],
    zoom: 17,
    villageId: 'VIL-002',
    description: 'Chamber reach settlement, riverside shops & elevated temple ridge.',
  },
  {
    id: 'koteshwar',
    name: 'Koteshwar Dam Reach',
    center: [30.2850, 78.5280],
    zoom: 16,
    villageId: 'VIL-003',
    description: 'Narrow canyon gorge, hydroelectric project quarters & relief camp.',
  },
  {
    id: 'maletha',
    name: 'Maletha Valley & Terraces',
    center: [30.2280, 78.5490],
    zoom: 16,
    villageId: 'VIL-004',
    description: 'Wide agricultural valley terrace with denser residential sectors.',
  },
  {
    id: 'devprayag',
    name: 'Devprayag Confluence Town',
    center: [30.1460, 78.5990],
    zoom: 17,
    villageId: 'VIL-006',
    description: 'Sacred confluence of Bhagirathi & Alaknanda rivers with tiered mountain houses.',
  },
];

// Helper to generate a small rectangular building footprint polygon
function makeRect(centerLon, centerLat, widthMeters = 14, heightMeters = 10, angleDeg = 15) {
  const mToLat = 1 / 111320;
  const mToLon = 1 / (111320 * Math.cos((centerLat * Math.PI) / 180));
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const hw = (widthMeters / 2) * mToLon;
  const hh = (heightMeters / 2) * mToLat;

  const offsets = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];

  return offsets.map(([ox, oy]) => {
    const rx = ox * cos - oy * sin;
    const ry = ox * sin + oy * cos;
    return [
      Number((centerLat + ry).toFixed(6)),
      Number((centerLon + rx).toFixed(6)),
    ];
  });
}

/**
 * Deterministic building footprints generator for Uttarakhand settlements.
 * Spatially distributes houses along the hillside slope away from the riverbed.
 */
export function generateVillageBuildings(settlementId, baseLon, baseLat, baseElevM) {
  const buildings = [];
  const villagePrefix = settlementId.replace('VIL-', 'BLD-');

  // Pseudo-random deterministic seed
  let seed = settlementId.charCodeAt(settlementId.length - 1) * 31;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const houseTypes = ['Residential House', 'Family Homestead', 'Local Shop & Grocery', 'Community Workshop', 'Agricultural Shed'];
  const residentNames = [
    'Rawat Family', 'Negi Residence', 'Bhatt Homestead', 'Panwar House',
    'Chauhan Home', 'Gairola Residence', 'Khanduri Homestead', 'Semwal Residence',
    'Bisht Family', 'Uniyal Homestead', 'Dabral House', 'Nautiyal Residence'
  ];

  // Generate 28-36 building footprints per village
  const count = 30;
  for (let i = 0; i < count; i++) {
    // Distance from river bank (increasing lateral offset into hillside)
    const lateralDistM = 20 + i * 9 + (rand() - 0.5) * 15;
    const longitudinalDistM = (i - count / 2) * 16 + (rand() - 0.5) * 10;

    // Convert offsets to coordinate deltas
    const dLat = (longitudinalDistM / 111320);
    const dLon = (lateralDistM / (111320 * Math.cos((baseLat * Math.PI) / 180)));

    const houseLat = baseLat + dLat;
    const houseLon = baseLon + dLon;

    // Hillside elevation increases as lateral distance increases (~3.5m rise per 10m lateral)
    const relativeSlopeRise = (lateralDistM * 0.35) + (rand() - 0.5) * 2;
    const houseElevM = Math.round(baseElevM + relativeSlopeRise);

    // River water level threshold to flood this building:
    // When local flood depth exceeds relativeSlopeRise + 1.2m (ground threshold)
    const floodSubmersionDepthThresholdM = Math.max(1.0, relativeSlopeRise + 1.5);

    const bldType = i === 0 ? 'Primary School' : i === 1 ? 'Panchayat Community Hall' : i === 2 ? 'Health Sub-Center' : houseTypes[Math.floor(rand() * houseTypes.length)];
    const familyName = residentNames[i % residentNames.length];
    const occupants = bldType.includes('House') || bldType.includes('Residence') || bldType.includes('Home')
      ? Math.floor(4 + rand() * 6)
      : 0;

    const bldWidth = bldType.includes('School') || bldType.includes('Hall') ? 22 : 12 + Math.floor(rand() * 6);
    const bldHeight = bldType.includes('School') || bldType.includes('Hall') ? 16 : 9 + Math.floor(rand() * 4);
    const angle = Math.floor(rand() * 45) - 20;

    buildings.push({
      id: `${villagePrefix}-${String(i + 1).padStart(3, '0')}`,
      villageId: settlementId,
      name: bldType === 'Primary School' || bldType === 'Panchayat Community Hall' || bldType === 'Health Sub-Center'
        ? `${bldType}`
        : `${familyName} (${bldType})`,
      building_type: bldType,
      latitude: Number(houseLat.toFixed(6)),
      longitude: Number(houseLon.toFixed(6)),
      elevation_m: houseElevM,
      distance_to_river_m: Math.round(lateralDistM),
      occupants_count: occupants,
      flood_submersion_depth_threshold_m: Number(floodSubmersionDepthThresholdM.toFixed(1)),
      polygon: makeRect(houseLon, houseLat, bldWidth, bldHeight, angle),
    });
  }

  return buildings;
}
