const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/SimulationLab.jsx', 'utf-8');

// 1. Remove GeoRasterLayer imports
content = content.replace("import parseGeoraster from 'georaster';", "");
content = content.replace("import GeoRasterLayer from 'georaster-layer-for-leaflet';", "");

// 2. Remove the georaster fetch from initialization
const georasterFetchStart = content.indexOf('// Load dynamic arrival time raster');
if (georasterFetchStart !== -1) {
  const georasterFetchEnd = content.indexOf('.catch(e => console.error("Could not load arrival time TIF", e));', georasterFetchStart);
  if (georasterFetchEnd !== -1) {
    content = content.slice(0, georasterFetchStart) + content.slice(georasterFetchEnd + 66);
  }
}

// 3. Fix the tick function
content = content.replace(
  /setCurrentTimeMin\(\(prev\) => \{[\s\S]*?return next;[\s\S]*?\}\);/g,
  `setCurrentTimeMin((prev) => {
          if (prev >= 13.33) {
            setIsPlaying(false);
            return 13.33;
          }
          const next = Math.min(13.33, prev + 0.166);
          onTimeChange?.(next);
          return next;
        });`
);
// And also fix handleTimeChange:
content = content.replace(
  /const handleTimeChange = \(t\) => \{[\s\S]*?onTimeChange\?.\(t\);[\s\S]*?\};/g,
  `const handleTimeChange = (t) => {
    setCurrentTimeMin(t);
    onTimeChange?.(t);
  };`
);


// 4. Update Flood Layers useEffect to fetch GeoJSON frame
const floodEffectStart = content.indexOf('// 3. Update Flood Layers & Wavefront');
const floodEffectEnd = content.indexOf('// 4. Draw Admin Exposure');

if (floodEffectStart !== -1 && floodEffectEnd !== -1) {
  const newFloodEffect = `// 3. Update Flood Layers & Wavefront
  // Uses PRECOMPUTED_ARRIVAL_GEOJSON_FRAMES
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      if (layerVisibility.sph_nearfield) map.addLayer(layersRef.current.sph);
      else map.removeLayer(layersRef.current.sph);
      if (layerVisibility.coupling_transect) layersRef.current.coupling.setStyle({ opacity: 1 });
      else layersRef.current.coupling.setStyle({ opacity: 0 });
    } catch (_) {}

    // Clean up old flood layer
    if (layersRef.current.floodLayer) {
      map.removeLayer(layersRef.current.floodLayer);
      layersRef.current.floodLayer = null;
    }

    if (!layerVisibility.depth_layers) return;

    // Time in seconds
    const currentT = Math.round(currentTimeMin * 60);
    // Snap to 50s increments for the backend
    const snapped = Math.max(0, Math.min(800, Math.round(currentT / 50.0) * 50));

    fetch(\`/api/scenarios/v3/frames/\${snapped}\`)
      .then(res => res.json())
      .then(geoJson => {
        if (!mapInstanceRef.current || !layerVisibility.depth_layers) return; // check if unmounted or toggled off
        
        // Remove again to prevent race conditions
        if (layersRef.current.floodLayer) {
          map.removeLayer(layersRef.current.floodLayer);
        }

        const layer = L.geoJSON(geoJson, {
          style: {
            color: '#3b82f6', // blue-500
            fillColor: '#3b82f6',
            fillOpacity: 0.8,
            weight: 0.5,
            opacity: 1
          }
        });
        layer.addTo(map);
        layersRef.current.floodLayer = layer;
      })
      .catch(e => {
        // Expected for early frames with no data
      });

  }, [currentTimeMin, layerVisibility]);

  `;
  content = content.slice(0, floodEffectStart) + newFloodEffect + content.slice(floodEffectEnd);
}

fs.writeFileSync('frontend/src/pages/SimulationLab.jsx', content);
