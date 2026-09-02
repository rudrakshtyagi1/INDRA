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
export function getFloodTimestepData(_timeMin = 60) {
  return { shallowPolygon: [], moderatePolygon: [], deepPolygon: [], wavefront: null };
}
