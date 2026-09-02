import re

with open('frontend/src/pages/SimulationLab.jsx', 'r') as f:
    content = f.read()

# 1. Inject hook import
content = content.replace("import { createBasemapLayer }", "import { useV3Data } from '../hooks/useV3Data';\nimport { createBasemapLayer }")

# 2. Inject hook usage
hook_str = """
  const [activeSettlementId, setActiveSettlementId] = useState('');
  const v3 = useV3Data();
"""
content = content.replace("  const [activeSettlementId, setActiveSettlementId] = useState('');", hook_str)

# 3. Replace prototype text
content = content.replace("Prototype Fixture", "WHAT-IF HYDRODYNAMIC BENCHMARK")
content = content.replace("Bhagirathi Flood Simulation", "MODEL: DualSPHysics -> LISFLOOD-FP | PHYSICAL VALIDATION: NOT AVAILABLE")
content = content.replace("maxTimeMin={240}", "maxTimeMin={13.33}")

# 4. Replace legend
old_legend = """                <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-2">
                  Depth · WHAT-IF HYDRODYNAMIC BENCHMARK
                </p>
                {[
                  { color: 'bg-[#172554] border-[#1e3a8a]', label: '> 3 m (deep channel)' },
                  { color: 'bg-[#1d4ed8]/60 border-[#2563eb]', label: '0.5 – 3 m (moderate)' },
                  { color: 'bg-[#0ea5e9]/30 border-[#7dd3fc]', label: '< 0.5 m (shallow)' },
                ]"""
new_legend = """                <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-2">
                  MODELLED MAXIMUM DEPTH
                </p>
                {[
                  { color: 'bg-red-500 border-red-700', label: '> 5 m' },
                  { color: 'bg-orange-500 border-orange-700', label: '3 – 5 m' },
                  { color: 'bg-yellow-500 border-yellow-700', label: '1.5 – 3 m' },
                  { color: 'bg-blue-500 border-blue-700', label: '0.5 – 1.5 m' },
                  { color: 'bg-cyan-400 border-cyan-600', label: '0.05 – 0.5 m' },
                ]"""
content = content.replace(old_legend, new_legend)

# 5. Inject GeoJSON
old_flood = """    // 3. Update Flood Layers & Wavefront
    if (currentTimeMin === 0 || !layerVisibility.depth_layers) return;

    const data = getFloodTimestepData(currentTimeMin);

    // Shallow envelope (< 0.5m)
    if (data.shallowPolygon?.length > 2) {"""

new_flood = """    // 3. Update Flood Layers & Wavefront
    if (layersRef.current.v3GeoJSON) map.removeLayer(layersRef.current.v3GeoJSON);
    if (layersRef.current.v3RoadsGeoJSON) map.removeLayer(layersRef.current.v3RoadsGeoJSON);

    if (layerVisibility.depth_layers && v3.v3Hazard) {
      layersRef.current.v3GeoJSON = L.geoJSON(v3.v3Hazard, {
        style: { color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.35, weight: 1.2 }
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

    if (currentTimeMin === 0 || !layerVisibility.depth_layers) return;

    const data = getFloodTimestepData(currentTimeMin);

    // Shallow envelope (< 0.5m)
    if (data.shallowPolygon?.length > 2) {"""

content = content.replace(old_flood, new_flood)

with open('frontend/src/pages/SimulationLab.jsx', 'w') as f:
    f.write(content)
