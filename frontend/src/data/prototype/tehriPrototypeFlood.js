/**
 * PRECOMPUTED PROTOTYPE DATA / NOT VALIDATED SOLVER OUTPUT
 * Geographic Flood Inundation & Wavefront Geometry along the Bhagirathi - Ganga corridor.
 *
 * PROVENANCE: PRECOMPUTED PROTOTYPE
 */

import { DOMAIN_CONFIG, RIVER_CENTERLINE } from './tehriDomainConfig';

export { DOMAIN_CONFIG, RIVER_CENTERLINE };

/**
 * Calculates current flood extent and depth polygons for a given simulation time (0 to 240 min).
 * Models narrow canyon confinement upstream and lateral attenuation across downstream plains.
 */
export function getFloodTimestepData(timeMin = 60) {
  const maxTime = DOMAIN_CONFIG.maxSimulationTimeMin || 240;
  const progressFrac = Math.min(Math.max(0, timeMin) / maxTime, 1.0);

  // Wave speed decay: faster in steep gorge (18-22 m/s), slowing in broad plains (5-8 m/s)
  const totalPoints = RIVER_CENTERLINE.length;
  const reachIdx = Math.min(
    totalPoints - 1,
    Math.floor(Math.pow(progressFrac, 0.85) * (totalPoints - 1))
  );

  const activeCount = Math.max(2, reachIdx + 1);
  const activePoints = RIVER_CENTERLINE.slice(0, activeCount);
  const leadingPoint = activePoints[activePoints.length - 1];

  // Dynamic Polygon Construction
  const leftDeep = [];
  const leftMod = [];
  const leftShallow = [];

  const rightDeep = [];
  const rightMod = [];
  const rightShallow = [];

  activePoints.forEach((pt, i) => {
    // Gorge vs Plains lateral expansion factor
    const isPlains = pt.regime === 'PLAINS' || pt.regime === 'BOUNDARY';
    const isFoothills = pt.regime === 'FOOTHILLS';

    // Width scale: narrow in gorge (0.0015 deg), wider in plains (up to 0.015 deg)
    const baseWidthDeg = isPlains
      ? 0.008 + (pt.km - 100) * 0.00015
      : isFoothills
      ? 0.004 + (pt.km - 75) * 0.0001
      : 0.0022;

    // Natural sinusoidal meander variation
    const sinVar = Math.sin(i * 0.9) * (isPlains ? 0.002 : 0.0005);
    const cosVar = Math.cos(i * 1.3) * (isPlains ? 0.0015 : 0.0003);

    // Deep core (deep blue): concentrated in river channel
    const offsetDeep = isPlains ? baseWidthDeg * 0.35 + sinVar * 0.4 : baseWidthDeg * 0.75 + sinVar * 0.5;
    // Moderate core: channel banks + terraces
    const offsetMod = isPlains ? baseWidthDeg * 0.75 + sinVar * 0.8 : baseWidthDeg * 1.5 + sinVar;
    // Shallow envelope: broad floodplain spreading in plains
    const offsetShallow = isPlains ? baseWidthDeg * 1.4 + sinVar + cosVar : baseWidthDeg * 2.3 + sinVar;

    // Normal perpendicular orientation
    leftDeep.push([pt.lat + offsetDeep * 0.7, pt.lon - offsetDeep]);
    leftMod.push([pt.lat + offsetMod * 0.7, pt.lon - offsetMod]);
    leftShallow.push([pt.lat + offsetShallow * 0.7, pt.lon - offsetShallow]);

    rightDeep.unshift([pt.lat - offsetDeep * 0.7, pt.lon + offsetDeep]);
    rightMod.unshift([pt.lat - offsetMod * 0.7, pt.lon + offsetMod]);
    rightShallow.unshift([pt.lat - offsetShallow * 0.7, pt.lon + offsetShallow]);
  });

  return {
    timeMin,
    leadingPoint,
    activePointsCount: activePoints.length,
    deepPolygon: [...leftDeep, ...rightDeep],
    moderatePolygon: [...leftMod, ...rightMod],
    shallowPolygon: [...leftShallow, ...rightShallow],
    inundatedAreaKm2: Number((progressFrac * 68.4).toFixed(1)),
    maxLeadingVelocityMs: Number(Math.max(4.2, 22.4 - leadingPoint.km * 0.13).toFixed(1)),
    leadingDepthM: leadingPoint.depth,
    isAtDomainBoundary: leadingPoint.km >= DOMAIN_CONFIG.prototypeReachLengthKm,
    boundaryLabel: DOMAIN_CONFIG.downstreamBoundaryLabel,
  };
}
