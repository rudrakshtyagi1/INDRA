/**
 * FloodLab Frontend Unit Conversions & Validation Utilities
 */

export const m2ToKm2 = (m2) => {
  if (typeof m2 !== 'number' || isNaN(m2)) return 0;
  return m2 / 1_000_000.0;
};

export const km2ToM2 = (km2) => {
  if (typeof km2 !== 'number' || isNaN(km2)) return 0;
  return km2 * 1_000_000.0;
};

export const haToKm2 = (ha) => {
  if (typeof ha !== 'number' || isNaN(ha)) return 0;
  return ha / 100.0;
};

export const km2ToHa = (km2) => {
  if (typeof km2 !== 'number' || isNaN(km2)) return 0;
  return km2 * 100.0;
};

export const m3ToMcm = (m3) => {
  if (typeof m3 !== 'number' || isNaN(m3)) return 0;
  return m3 / 1_000_000.0;
};

export const m3ToBillionM3 = (m3) => {
  if (typeof m3 !== 'number' || isNaN(m3)) return 0;
  return m3 / 1_000_000_000.0;
};

export const isFiniteNumber = (val) => {
  return typeof val === 'number' && !isNaN(val) && isFinite(val);
};

export const formatFinite = (val, decimals = 2, fallback = 'N/A') => {
  if (!isFiniteNumber(val)) return fallback;
  return val.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
