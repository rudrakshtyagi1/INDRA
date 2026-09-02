import re

with open('frontend/src/pages/HADRDashboard.jsx', 'r') as f:
    content = f.read()

# Inject useV3Data
content = content.replace("import { createBasemapLayer }", "import { useV3Data } from '../hooks/useV3Data';\nimport { createBasemapLayer }")

hook_str = """
  const [activeId, setActiveId] = useState('sirain');
  const v3 = useV3Data();
"""
content = content.replace("  const [activeId, setActiveId] = useState('sirain');", hook_str)

# Inject GeoJSON rendering logic in useEffect
old_routes = """
    // 2. Plot Active Routes
    if (activeTarget && routeDrawn) {
"""

new_routes = """
    // 2. Plot Active Routes
    if (layersRef.current.v3NormalRoute) map.removeLayer(layersRef.current.v3NormalRoute);
    if (layersRef.current.v3HazardRoute) map.removeLayer(layersRef.current.v3HazardRoute);

    if (v3.v3NormalRoute && layerVisibility.rejected_route) {
        layersRef.current.v3NormalRoute = L.geoJSON(v3.v3NormalRoute, {
            style: { color: '#ef4444', weight: 4, opacity: 0.8, dashArray: '8, 8' }
        }).addTo(map);
    }
    
    if (v3.v3HazardAwareRoute && layerVisibility.active_route) {
        layersRef.current.v3HazardRoute = L.geoJSON(v3.v3HazardAwareRoute, {
            style: { color: '#22c55e', weight: 5, opacity: 0.9 }
        }).addTo(map);
    }

    if (activeTarget && routeDrawn) {
"""
content = content.replace(old_routes, new_routes)

# Remove the old routes drawing
content = re.sub(r'const rejectedPoly = L\.polyline.*?\.addTo\(map\);', 'const rejectedPoly = null;', content, flags=re.DOTALL)
content = re.sub(r'const activePoly = L\.polyline.*?\.addTo\(map\);', 'const activePoly = null;', content, flags=re.DOTALL)

with open('frontend/src/pages/HADRDashboard.jsx', 'w') as f:
    f.write(content)
