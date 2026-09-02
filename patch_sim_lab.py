import re

with open('frontend/src/pages/SimulationLab.jsx', 'r') as f:
    content = f.read()

# Inject useV3Data
content = content.replace("import { createBasemapLayer }", "import { useV3Data } from '../hooks/useV3Data';\nimport { createBasemapLayer }")

# Inject hook
hook_str = """
  const [activeSettlementId, setActiveSettlementId] = useState('');
  const v3 = useV3Data();
"""
content = content.replace("  const [activeSettlementId, setActiveSettlementId] = useState('');", hook_str)

# Replace prototype text
content = content.replace("Prototype Fixture", "WHAT-IF HYDRODYNAMIC BENCHMARK")
content = content.replace("WHAT-IF HYDRODYNAMIC BENCHMARKs", "WHAT-IF HYDRODYNAMIC BENCHMARK")

# Replace legend
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

# Inject GeoJSON rendering logic in useEffect
old_flood = """
    // 3. Update Flood Layers & Wavefront
    if (layersRef.current.shallow) {
"""

new_flood = """
    // 3. Update Flood Layers & Wavefront
    if (layersRef.current.v3GeoJSON) {
      map.removeLayer(layersRef.current.v3GeoJSON);
    }
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

    if (layersRef.current.shallow) {
"""
content = content.replace(old_flood, new_flood)

# Let's replace the execution of the prototype rendering
# We can just nullify `data.shallowPolygon` in tehriPrototypeFlood.js instead of hacking the JSX

with open('frontend/src/pages/SimulationLab.jsx', 'w') as f:
    f.write(content)
