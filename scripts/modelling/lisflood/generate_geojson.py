import rasterio
import json
import numpy as np
from rasterio.features import shapes
import os

V3_BASE = os.environ.get("DATA_DIR", "/app/data/processed/tehri_simulations")
tif_path = f"{V3_BASE}/lisflood_fp/outputs/v3_geometry_corrected/rasters/arrival_time_v3.tif"
out_path = f"{V3_BASE}/lisflood_fp/outputs/v3_geometry_corrected/rasters/arrival_time_polygons.geojson"

with rasterio.open(tif_path) as src:
    image = src.read(1)
    mask = image != src.nodata
    
    # We want to group arrival times into buckets (e.g. every 60 seconds) to reduce polygon count
    # Arrival time is probably in seconds. Let's group into 60s bins.
    image_binned = np.round(image / 60.0) * 60.0
    image_binned[~mask] = src.nodata
    
    results = []
    for geom, val in shapes(image_binned, mask=mask, transform=src.transform):
        if val != src.nodata:
            results.append({
                "type": "Feature",
                "geometry": geom,
                "properties": {"t": int(val)}
            })

    geojson = {
        "type": "FeatureCollection",
        "features": results
    }
    
    with open(out_path, "w") as f:
        json.dump(geojson, f)

print(f"Generated {out_path} with {len(results)} features.")
