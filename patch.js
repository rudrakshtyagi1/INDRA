const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/SimulationLab.jsx', 'utf-8');

// Ensure imports
if (!content.includes('import parseGeoraster')) {
  content = content.replace("import L from 'leaflet';", "import L from 'leaflet';\nimport parseGeoraster from 'georaster';\nimport GeoRasterLayer from 'georaster-layer-for-leaflet';");
}

// 1. Sync handleTimeChange
const handleTimeChangeMatch = content.indexOf('const handleTimeChange = (t) => {');
if (handleTimeChangeMatch !== -1) {
  content = content.replace(
    'const handleTimeChange = (t) => {',
    'const handleTimeChange = (t) => {\n    window._currentSimTimeMin = t;\n    if (layersRef.current.georasterLayer) layersRef.current.georasterLayer.redraw();'
  );
}

// 2. Sync inside the tick loop
content = content.replace(
  /setCurrentTimeMin\(\(prev\) => \{[\s\S]*?return next;[\s\S]*?\}\);/g,
  `setCurrentTimeMin((prev) => {
          if (prev >= 13.33) {
            setIsPlaying(false);
            window._currentSimTimeMin = 13.33;
            if (layersRef.current.georasterLayer) layersRef.current.georasterLayer.redraw();
            return 13.33;
          }
          const next = Math.min(13.33, prev + 0.166);
          window._currentSimTimeMin = next;
          if (layersRef.current.georasterLayer) layersRef.current.georasterLayer.redraw();
          onTimeChange?.(next);
          return next;
        });`
);

// 3. Update init map
const initMapToken = "layersRef.current.river = river;";
if (content.includes(initMapToken) && !content.includes('/api/scenarios/v3/hazard/arrival_time')) {
  content = content.replace(initMapToken, initMapToken + `\n
    // Load dynamic arrival time raster for temporal playback
    fetch('/api/scenarios/v3/hazard/arrival_time')
      .then(r => r.arrayBuffer())
      .then(buf => parseGeoraster(buf))
      .then(georaster => {
        const layer = new GeoRasterLayer({
          georaster,
          opacity: 0.8,
          resolution: 128,
          pixelValuesToColorFn: (values) => {
            const arr_t = values[0];
            const current_t = (window._currentSimTimeMin || 0) * 60;
            if (arr_t > 0 && arr_t <= current_t && arr_t !== georaster.noDataValue) {
               return '#3b82f6'; // Professional blue
            }
            return null;
          }
        });
        layer.addTo(map);
        layersRef.current.georasterLayer = layer;
      })
      .catch(e => console.error("Could not load arrival time TIF", e));
  `);
}

// 4. Replace Update Flood Layers
const startToken = "// 3. Update Flood Layers & Wavefront";
const endToken = "// 4. Draw Admin Exposure";
const startIdx = content.indexOf(startToken);
const endIdx = content.indexOf(endToken);

if (startIdx !== -1 && endIdx !== -1) {
  const newFloodLogic = `// 3. Update Flood Layers & Wavefront
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      if (layerVisibility.sph_nearfield) map.addLayer(layersRef.current.sph);
      else map.removeLayer(layersRef.current.sph);
      if (layerVisibility.coupling_transect) layersRef.current.coupling.setStyle({ opacity: 1 });
      else layersRef.current.coupling.setStyle({ opacity: 0 });
    } catch (_) {}

    if (layersRef.current.georasterLayer) {
       layersRef.current.georasterLayer.setOpacity(layerVisibility.depth_layers ? 0.8 : 0);
       layersRef.current.georasterLayer.redraw();
    }
  }, [currentTimeMin, layerVisibility]);

  `;
  content = content.slice(0, startIdx) + newFloodLogic + content.slice(endIdx);
}

fs.writeFileSync('frontend/src/pages/SimulationLab.jsx', content);
