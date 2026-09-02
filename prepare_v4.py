import rasterio
from rasterio.windows import Window
import os
import shutil

v3_dem_path = "/data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m.tif"
# The raw downstream dem:
glo30_path = "/data/processed/tehri_inputs/terrain/downstream_dem_glo30.tif"

out_dir = "/tmp/v4_setup"
os.makedirs(out_dir, exist_ok=True)
os.makedirs(f"{out_dir}/terrain", exist_ok=True)
os.makedirs(f"{out_dir}/config", exist_ok=True)
os.makedirs(f"{out_dir}/boundary", exist_ok=True)

# 1. READ V3 DEM TO GET STARTING POSITION
with rasterio.open(v3_dem_path) as src:
    v3_transform = src.transform
    v3_crs = src.crs
    v3_cols = src.width
    v3_rows = src.height

# Actually downstream_dem_glo30 is in EPSG:4326.
# If we don't have a 32644 DEM for the downstream, we can't easily clip it without reprojection.
# Wait, I checked "downstream_dem_ascii.asc" earlier and it was in 32644, but 90m!
