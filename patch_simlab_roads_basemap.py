import re

with open("frontend/src/pages/SimulationLab.jsx", "r") as f:
    content = f.read()

# 1. Update Basemap
basemap_old = "L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {"
basemap_new = "L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {"
content = content.replace(basemap_old, basemap_new)

# 2. Add useV3Data and render roads
# We need to import useV3Data if not already imported
if 'useV3Data' not in content:
    content = content.replace("import GeoRasterLayer from 'georaster-layer-for-leaflet';", "import GeoRasterLayer from 'georaster-layer-for-leaflet';\nimport { useV3Data } from '../hooks/useV3Data';")

# We need to call useV3Data inside the component
if 'const v3 = useV3Data();' not in content:
    content = content.replace("export default function SimulationLab({ initialTimeMin = 0, onTimeChange, onNavigateToHadr }) {", "export default function SimulationLab({ initialTimeMin = 0, onTimeChange, onNavigateToHadr }) {\n  const v3 = useV3Data();")

# We need to add road layer ref
content = content.replace("floodFrame: null,", "floodFrame: null,\n    roadsLayer: null,")

# We need an effect to draw the roads when time changes
roads_effect = """
  // Update Road Hazard visualization
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !v3.v3Roads) return;

    if (layersRef.current.roadsLayer) {
      map.removeLayer(layersRef.current.roadsLayer);
    }

    const currentT = Math.round(currentTimeMin * 60);

    layersRef.current.roadsLayer = L.geoJSON(v3.v3Roads, {
      style: (feature) => {
        const arrTimeSec = (feature.properties.arrival_time_hr || 0) * 3600;
        // If the road segment hasn't been hit yet by the flood
        if (arrTimeSec > currentT) {
          return { color: '#94A3B8', weight: 2, opacity: 0.6 }; // neutral/subtle
        } else {
          return { color: '#EA580C', weight: 4, opacity: 1.0 }; // orange/red hazard
        }
      }
    }).addTo(map);

  }, [currentTimeMin, v3.v3Roads]);
"""

if 'layersRef.current.roadsLayer = L.geoJSON' not in content:
    idx = content.find("const currentSec = Math.round(currentTimeMin * 60);")
    if idx != -1:
        content = content[:idx] + roads_effect + "\n  " + content[idx:]

with open("frontend/src/pages/SimulationLab.jsx", "w") as f:
    f.write(content)

