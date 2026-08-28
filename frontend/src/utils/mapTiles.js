import L from 'leaflet';

/**
 * Creates a robust basemap tile layer with graceful fallback.
 * Supports optional VITE_CARTO_BASEMAP_KEY without ever showing "API KEY REQUIRED".
 */
export function createBasemapLayer(mapInstance) {
  const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY;
  const subdomains = 'abcd';

  // 1. Primary: CartoDB Dark Matter (public free CDN or authenticated key)
  const cartoUrl = cartoKey
    ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  const primaryLayer = L.tileLayer(cartoUrl, {
    maxZoom: 19,
    subdomains,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });

  // 2. Fallback: Standard OpenStreetMap Tiles if Carto fails
  primaryLayer.on('tileerror', () => {
    console.warn('CartoDB tile error, switching to OpenStreetMap fallback.');
    if (mapInstance && !mapInstance._fallbackLayerActive) {
      mapInstance._fallbackLayerActive = true;
      mapInstance.removeLayer(primaryLayer);
      const fallbackLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });
      fallbackLayer.addTo(mapInstance);
    }
  });

  return primaryLayer;
}
