import re

with open("frontend/src/pages/SimulationLab.jsx", "r") as f:
    content = f.read()

# Replace the frame fetching logic
old_fetch = """      fetch(`/api/scenarios/v3/frames/${snapped}`)
        .then(res => res.json())
        .then(geoJson => {
          if (!mapInstanceRef.current || !layers.floodPropagation) return;
          if (layersRef.current.floodFrame) map.removeLayer(layersRef.current.floodFrame);
          
          const layer = L.geoJSON(geoJson, {
            style: { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.8, weight: 0.5, opacity: 1 }
          }).addTo(map);
          layersRef.current.floodFrame = layer;
        }).catch(() => {});"""

new_fetch = """      
      // Find the correct frame URL
      let frameUrl = `/api/scenarios/v3/frames/${snapped}`; // fallback
      if (runData.frames && runData.frames.length > 0) {
        // Find closest frame
        const frame = runData.frames.reduce((prev, curr) => 
          Math.abs(curr.time_sec - currentSec) < Math.abs(prev.time_sec - currentSec) ? curr : prev
        );
        frameUrl = frame.url;
      }

      if (frameUrl.includes('.geojson') || frameUrl.includes('/scenarios/v3/')) {
          fetch(frameUrl)
            .then(res => res.json())
            .then(geoJson => {
              if (!mapInstanceRef.current || !layers.floodPropagation) return;
              if (layersRef.current.floodFrame) map.removeLayer(layersRef.current.floodFrame);
              const layer = L.geoJSON(geoJson, {
                style: { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.8, weight: 0.5, opacity: 1 }
              }).addTo(map);
              layersRef.current.floodFrame = layer;
            }).catch(() => {});
      } else {
          // It's a GeoTIFF
          fetch(frameUrl)
            .then(res => res.arrayBuffer())
            .then(buf => parseGeoraster(buf))
            .then(georaster => {
              if (!mapInstanceRef.current || !layers.floodPropagation) return;
              if (layersRef.current.floodFrame) map.removeLayer(layersRef.current.floodFrame);
              
              const layer = new GeoRasterLayer({
                georaster,
                opacity: 0.8,
                resolution: 256,
                pixelValuesToColorFn: (v) => {
                  const depth = v[0];
                  if (depth <= 0.05 || depth === georaster.noDataValue) return null;
                  return '#3b82f6';
                }
              });
              layer.addTo(mapInstanceRef.current);
              layersRef.current.floodFrame = layer;
            }).catch(console.error);
      }
"""

content = content.replace(old_fetch, new_fetch)

with open("frontend/src/pages/SimulationLab.jsx", "w") as f:
    f.write(content)
