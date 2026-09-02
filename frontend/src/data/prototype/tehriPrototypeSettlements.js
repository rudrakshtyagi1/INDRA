import { DOMAIN_CONFIG } from './tehriDomainConfig';

/**
 * PRECOMPUTED PROTOTYPE DATA / NOT VALIDATED SOLVER OUTPUT
 * Deterministic settlement dataset along the Bhagirathi - Ganga river corridor (0–145 km).
 * Prioritizes immediate disaster response corridor (0–30 km) and downstream checkpoints.
 * PROVENANCE: PROTOTYPE FIXTURE
 */

export const PROTOTYPE_SETTLEMENTS = [];

/**
 * Returns settlement status at a given playback minute.
 */
export function getSettlementStatus(settlement, currentMin) {
  if (currentMin >= settlement.arrivalMin) {
    return {
      state: 'INUNDATED',
      label: 'INUNDATED',
      badgeColor: 'red',
      depthAtTime: Math.min(settlement.peakDepthM, settlement.peakDepthM * Math.min(1, (currentMin - settlement.arrivalMin + 5) / 25)),
      marginMin: 0,
    };
  }
  const margin = settlement.arrivalMin - currentMin;
  if (margin <= 30) {
    return {
      state: 'THREATENED',
      label: `THREATENED (+${margin}m)`,
      badgeColor: 'amber',
      depthAtTime: 0,
      marginMin: margin,
    };
  }
  return {
    state: 'SAFE',
    label: `SAFE (+${margin}m)`,
    badgeColor: 'emerald',
    depthAtTime: 0,
    marginMin: margin,
  };
}
