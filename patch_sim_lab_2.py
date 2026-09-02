with open('frontend/src/pages/SimulationLab.jsx', 'r') as f:
    content = f.read()

new_flood = """
    // 3. Update Flood Layers & Wavefront
    if (layersRef.current.v3GeoJSON) map.removeLayer(layersRef.current.v3GeoJSON);
    if (layersRef.current.v3RoadsGeoJSON) map.removeLayer(layersRef.current.v3RoadsGeoJSON);

    if (layerVisibility.depth_layers && v3.v3Hazard) {
      layersRef.current.v3GeoJSON = L.geoJSON(v3.v3Hazard, {
        style: {
          color: '#38bdf8',
          fillColor: '#0284c7',
          fillOpacity: 0.35,
          weight: 1.2
        }
      }).addTo(map);
    }
    
    if (layerVisibility.infrastructure && v3.v3Roads) {
      layersRef.current.v3RoadsGeoJSON = L.geoJSON(v3.v3Roads, {
        style: { color: '#fb923c', weight: 3 },
        onEachFeature: (feature, layer) => {
            layer.bindPopup(`
              <div style="font-size: 11px;">
                <strong>MODELLED ROAD HAZARD EXPOSURE</strong><br/>
                Depth: ${feature.properties.max_depth_m?.toFixed(2)} m<br/>
                Arrival: ${feature.properties.arrival_time_hr?.toFixed(2)} h<br/>
                Wet length: ${feature.properties.wet_length_m?.toFixed(1)} m
              </div>
            `);
        }
      }).addTo(map);
    }

    if (layersRef.current.shallow) {
"""

# Replace the block I injected earlier
start = content.find("// 3. Update Flood Layers & Wavefront")
end = content.find("if (layersRef.current.shallow) {") + len("if (layersRef.current.shallow) {")
content = content[:start] + new_flood.strip() + "\n" + content[end:]

with open('frontend/src/pages/SimulationLab.jsx', 'w') as f:
    f.write(content)
