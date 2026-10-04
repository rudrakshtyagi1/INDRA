import rasterio
from rasterio.warp import reproject, Resampling
import numpy as np
import os

v3_path = "/data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m_conditioned.asc"
glo30_path = "/data/processed/tehri_inputs/terrain/downstream_dem_glo30.tif"
# Output to /tmp because /data/processed is read-only in the container!
out_dir = "/tmp"
out_path_tif = os.path.join(out_dir, "v4_dem_30m_corrected.tif")
out_path_asc = os.path.join(out_dir, "v4_dem_30m_corrected.asc")

with rasterio.open(v3_path) as src_v3:
    v3_data = src_v3.read(1)
    v3_transform = src_v3.transform
    v3_crs = src_v3.crs 
    v3_nodata = src_v3.nodata
    v3_rows, v3_cols = src_v3.shape

print(f"V3 shape: {v3_rows}x{v3_cols}")
print(f"V3 transform: {v3_transform}")

v4_rows = 1000
v4_cols = v3_cols
v4_transform = v3_transform

# We need to copy glo30 into container first, it's at /app/downstream_dem_glo30.tif or /tmp/downstream_dem_glo30.tif
glo30_local = "/app/downstream_dem_glo30.tif"
if not os.path.exists(glo30_local):
    glo30_local = "/tmp/downstream_dem_glo30.tif"

with rasterio.open(glo30_local) as src_glo30:
    v4_data = np.full((v4_rows, v4_cols), -9999.0, dtype=np.float32)
    reproject(
        source=rasterio.band(src_glo30, 1),
        destination=v4_data,
        src_transform=src_glo30.transform,
        src_crs=src_glo30.crs,
        dst_transform=v4_transform,
        dst_crs="EPSG:32644",
        resampling=Resampling.bilinear,
        dst_nodata=-9999.0
    )

valid_v3 = (v3_data != v3_nodata)
v4_data[:v3_rows, :][valid_v3] = v3_data[valid_v3]
v4_data[np.isnan(v4_data)] = -9999.0

prof = {
    'driver': 'GTiff',
    'dtype': 'float32',
    'nodata': -9999.0,
    'width': v4_cols,
    'height': v4_rows,
    'count': 1,
    'crs': "EPSG:32644",
    'transform': v4_transform
}

with rasterio.open(out_path_tif, 'w', **prof) as dst:
    dst.write(v4_data, 1)

print("V4 corrected DEM created successfully.")
