import os

files_to_check = [
    "data/processed/tehri_simulations/lisflood_fp/outputs/v3_geometry_corrected/rasters/inundation_extent_v3.geojson",
    "data/processed/tehri_simulations/exposure/v3/summary/hazard_exposure_summary.json",
    "data/processed/tehri_simulations/hadr/v3/summary/hadr_routing_summary.json",
    "data/processed/tehri_simulations/hadr/v3/routes/normal_route.geojson",
    "data/processed/tehri_simulations/hadr/v3/routes/hazard_aware_route.geojson",
    "data/processed/tehri_simulations/exposure/v3/roads/exposed_roads.geojson"
]

for f in files_to_check:
    print(f"{f}: {'EXISTS' if os.path.exists(f) else 'MISSING'}")
