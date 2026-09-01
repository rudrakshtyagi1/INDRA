/**
 * Cesium Ion Configuration & Access Token Helper
 */

export function getCesiumIonToken() {
  return import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || '';
}

export function isCesiumConfigured() {
  const token = getCesiumIonToken();
  return Boolean(token && token.length > 20);
}
