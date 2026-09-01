import L from 'leaflet';

/**
 * Creates a robust basemap tile layer with graceful fallback and connection state reporting.
 * Uses CARTO raster tiles with the valid ?key= parameter to prevent "API KEY REQUIRED" watermark.
 *
 * Status states:
 *   - CONNECTED
 *   - UNAVAILABLE
 *   - MISSING_KEY
 */
export function createBasemapLayer(mapInstance, onStatusChange) {
  const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY;
  const subdomains = 'abcd';

  if (!cartoKey) {
    onStatusChange?.('MISSING_KEY');
  }

  // CARTO raster tiles endpoint: requires ?key= parameter (not ?api_key=)
  const cartoUrl = cartoKey
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoKey}`
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png';

  const primaryLayer = L.tileLayer(cartoUrl, {
    maxZoom: 19,
    subdomains,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });

  // Track successful load
  primaryLayer.once('tileload', () => {
    if (cartoKey) {
      onStatusChange?.('CONNECTED');
    }
  });

  // Fallback: Standard OpenStreetMap Tiles if Carto fails
  primaryLayer.on('tileerror', () => {
    console.warn('CartoDB tile error, switching to OpenStreetMap fallback.');
    onStatusChange?.('UNAVAILABLE');
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
