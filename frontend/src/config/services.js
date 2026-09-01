/**
 * Central safe frontend service configuration and readiness flags.
 * NEVER prints or logs raw secrets to the browser console or DOM.
 */

export const SERVICES_CONFIG = {
  carto: {
    name: 'CARTO Basemap',
    tier: '2D High-Contrast Operational Basemap',
    isConfigured: Boolean(import.meta.env.VITE_CARTO_BASEMAP_KEY),
  },
  cesium: {
    name: 'Cesium Ion',
    tier: '3D Himalayan Terrain Engine',
    isConfigured: Boolean(
      import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN &&
      import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN.length > 20
    ),
  },
  nasaEarthdata: {
    name: 'NASA Earthdata (GPM / IMERG)',
    tier: 'Hydrometeorological Precipitation Data',
    backendManaged: true,
  },
  googleEarthEngine: {
    name: 'Google Earth Engine',
    tier: 'Satellite Surface Water Surveillance',
    status: 'NOT_CONNECTED',
  },
  copernicus: {
    name: 'Copernicus Data Space',
    tier: 'Sentinel-1/2 SAR Analysis',
    status: 'NOT_CONFIGURED',
  },
};
