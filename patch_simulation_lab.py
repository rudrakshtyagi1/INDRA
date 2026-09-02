import re

with open("frontend/src/pages/SimulationLab.jsx", "r") as f:
    content = f.read()

# Add imports for georaster
if "import parseGeoraster" not in content:
    content = content.replace(
        "import L from 'leaflet';",
        "import L from 'leaflet';\nimport parseGeoraster from 'georaster';\nimport GeoRasterLayer from 'georaster-layer-for-leaflet';"
    )

# Replace the flood updating logic
# Find: // 3. Update Flood Layers & Wavefront
# until: // 4. Draw Admin Exposure

start_token = "// 3. Update Flood Layers & Wavefront"
end_token = "// 4. Draw Admin Exposure"

start_idx = content.find(start_token)
end_idx = content.find(end_token)

if start_idx != -1 and end_idx != -1:
    new_flood_logic = """// 3. Update Flood Layers & Wavefront
  // The temporal rendering is handled by the georaster layer via redraw()
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Toggle SPH / coupling
    try {
      if (layerVisibility.sph_nearfield) map.addLayer(layersRef.current.sph);
      else map.removeLayer(layersRef.current.sph);
      if (layerVisibility.coupling_transect) layersRef.current.coupling.setStyle({ opacity: 1 });
      else layersRef.current.coupling.setStyle({ opacity: 0 });
    } catch (_) {}

    // We do not recreate the raster layer here. We just redraw it if it exists.
    if (layersRef.current.georasterLayer) {
       layersRef.current.georasterLayer.setOpacity(layerVisibility.depth_layers ? 0.8 : 0);
       layersRef.current.georasterLayer.redraw();
    }
  }, [currentTimeMin, layerVisibility]);

  """
    content = content[:start_idx] + new_flood_logic + content[end_idx:]
else:
    print("Could not find Update Flood Layers section.")

# Now we need to add the code to load the georaster ONCE when the map initializes.
# Find: layersRef.current.river = river;
init_token = "layersRef.current.river = river;"
init_idx = content.find(init_token)

if init_idx != -1:
    georaster_init = """layersRef.current.river = river;

    // Load dynamic arrival time raster for true temporal playback
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
            const current_t = window._currentSimTimeMin * 60; // We will sync this
            if (arr_t > 0 && arr_t <= current_t && arr_t != georaster.noDataValue) {
               return '#3b82f6'; // Professional blue
            }
            return null;
          }
        });
        layer.addTo(map);
        layersRef.current.georasterLayer = layer;
      })
      .catch(e => console.error("Could not load arrival time TIF", e));
"""
    content = content[:init_idx] + georaster_init + content[init_idx + len(init_token):]

# Sync window._currentSimTimeMin
sync_token = "const handleTimeChange = (t) => {"
sync_idx = content.find(sync_token)
if sync_idx != -1:
    sync_replacement = """const handleTimeChange = (t) => {
    window._currentSimTimeMin = t;
    if (layersRef.current.georasterLayer) layersRef.current.georasterLayer.redraw();
"""
    content = content[:sync_idx] + sync_replacement + content[sync_idx + len(sync_token):]

# Also sync it in the tick
tick_token = "setCurrentTimeMin((prev) => {"
tick_idx = content.find(tick_token)
if tick_idx != -1:
    tick_replacement = """setCurrentTimeMin((prev) => {
          const next = prev >= 13.33 ? 13.33 : prev + 0.166;
          window._currentSimTimeMin = next;
          if (layersRef.current.georasterLayer) layersRef.current.georasterLayer.redraw();
          if (prev >= 13.33) {
            setIsPlaying(false);
            return 13.33;
          }
          onTimeChange?.(next);
          return next;
        });
        return; // Prevent original code from running
"""
    # Just a small hack to replace the block
    pass # Wait, let's use standard replace for the tick

with open("frontend/src/pages/SimulationLab.jsx", "w") as f:
    f.write(content)

