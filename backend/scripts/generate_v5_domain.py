#!/usr/bin/env python3
"""
generate_v5_domain.py - Build the authentic 130.4 km Tehri -> Devprayag -> Rishikesh -> Haridwar
hydraulic corridor, terrain DEM, and spatially varying ESA WorldCover Manning roughness.
"""
import json
import math
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.warp import calculate_default_transform, reproject
from shapely.geometry import LineString, Point, mapping
from shapely.ops import linemerge, unary_union

BASE_DIR = Path(__file__).resolve().parent.parent.parent
INPUTS_DIR = BASE_DIR / "data" / "processed" / "tehri_inputs"
V5_DIR = BASE_DIR / "data" / "runs" / "TEHRI_V5_EXTENDED_CORRIDOR"
V5_DIR.mkdir(parents=True, exist_ok=True)
(V5_DIR / "outputs").mkdir(parents=True, exist_ok=True)
(V5_DIR / "logs").mkdir(parents=True, exist_ok=True)

# 1. Trace exact HydroRIVERS river centerline
RIVERS_GPKG = INPUTS_DIR / "hydrography" / "hydrorivers_study_region.gpkg"
PATH_IDS = [
    40669084, 40670748, 40672208, 40672508, 40673157, 40673515, 40674045, 40674903,
    40675892, 40676415, 40678445, 40679412, 40679932, 40681350, 40681516, 40681855,
    40681854, 40681853, 40681852, 40681673, 40679409, 40679235, 40679234, 40679233,
    40679734, 40680978, 40682219, 40682614, 40682958, 40684427, 40685148, 40685518,
    40686063, 40688569, 40690398, 40690595, 40691543
]

print("=== 1. Extracting HydroRIVERS Centerline ===")
rivers = gpd.read_file(RIVERS_GPKG)
sub = rivers[rivers['HYRIV_ID'].isin(PATH_IDS)].to_crs('EPSG:32644')

# Order upstream to downstream
ordered = []
curr_id = 40669084
while curr_id in PATH_IDS:
    row = sub[sub['HYRIV_ID'] == curr_id].iloc[0]
    ordered.append(row)
    next_id = row['NEXT_DOWN']
    if next_id == curr_id or next_id not in PATH_IDS:
        break
    curr_id = next_id

lines = [r['geometry'] for r in ordered]
full_line = linemerge(unary_union(lines))
tot_len = full_line.length
print(f"Total river centerline length: {tot_len/1000.0:.2f} km")

# Save river_centerline.geojson (EPSG:4326)
centerline_gdf = gpd.GeoDataFrame([{'name': 'Bhagirathi-Ganga Centerline', 'length_km': tot_len/1000.0}],
                                  geometry=[full_line], crs='EPSG:32644').to_crs('EPSG:4326')
centerline_gdf.to_file(V5_DIR / "river_centerline.geojson", driver="GeoJSON")
print(f"Saved river_centerline.geojson ({len(centerline_gdf)} features)")

# 2. Variable-width Terrain-Following Floodplain Corridor
print("=== 2. Generating Variable-Width Terrain Corridor ===")
pts = np.linspace(0, tot_len, int(tot_len / 400))
buffers = []
for i in range(len(pts) - 1):
    d_mid = (pts[i] + pts[i+1]) / 2.0
    d_km = d_mid / 1000.0
    if d_km < 37.0: # Upper Bhagirathi canyon: 1.8km radius (3.6km width)
        buf_r = 1800.0
    elif d_km < 90.0: # Devprayag -> Rishikesh gorge: 2.8km radius (5.6km width)
        buf_r = 2800.0
    else: # Rishikesh -> Haridwar -> downstream plains: 6.5km radius (13.0km width)
        buf_r = 6500.0
    seg = LineString([full_line.interpolate(pts[i]), full_line.interpolate(pts[i+1])])
    buffers.append(seg.buffer(buf_r, cap_style=1, join_style=1))

corridor_poly = unary_union(buffers)
corridor_area_km2 = corridor_poly.area / 1e6
print(f"Corridor polygon area: {corridor_area_km2:.2f} km²")

# Save extended_domain.geojson
domain_gdf = gpd.GeoDataFrame([{'name': 'Tehri-Haridwar Extended Corridor Domain', 'area_km2': corridor_area_km2}],
                              geometry=[corridor_poly], crs='EPSG:32644').to_crs('EPSG:4326')
domain_gdf.to_file(V5_DIR / "extended_domain.geojson", driver="GeoJSON")
print("Saved extended_domain.geojson")

# 3. Grid Definition (90m, EPSG:32644)
print("=== 3. Raster Grid Definition (90m, EPSG:32644) ===")
CELLSIZE = 90.0
cb = corridor_poly.bounds
# Align to 90m multiples with a 1-cell border buffer
pad = 180.0
xll = math.floor((cb[0] - pad) / CELLSIZE) * CELLSIZE
yll = math.floor((cb[1] - pad) / CELLSIZE) * CELLSIZE
xur = math.ceil((cb[2] + pad) / CELLSIZE) * CELLSIZE
yur = math.ceil((cb[3] + pad) / CELLSIZE) * CELLSIZE

ncols = int(round((xur - xll) / CELLSIZE))
nrows = int(round((yur - yll) / CELLSIZE))
print(f"Grid: ncols={ncols}, nrows={nrows}, total cells={ncols*nrows:,}, xll={xll}, yll={yll}")

# Transform: top-left origin
transform_90m = from_origin(xll, yur, CELLSIZE, CELLSIZE)

# Rasterize corridor mask (1 inside, 0 outside)
from rasterio.features import rasterize
mask_img = rasterize([(corridor_poly, 1)], out_shape=(nrows, ncols), transform=transform_90m, fill=0, dtype=np.uint8)
active_cells = int(np.sum(mask_img == 1))
print(f"Active masked floodplain cells: {active_cells:,} ({(active_cells/(ncols*nrows))*100:.1f}% of grid)")

# Save extended_domain_mask.tif
with rasterio.open(
    V5_DIR / "extended_domain_mask.tif",
    "w",
    driver="GTiff",
    height=nrows,
    width=ncols,
    count=1,
    dtype=np.uint8,
    crs="EPSG:32644",
    transform=transform_90m,
    compress="lzw"
) as dst:
    dst.write(mask_img, 1)
print("Saved extended_domain_mask.tif")

# 4. Crop & Reproject Copernicus DEM GLO-30
print("=== 4. Cropping & Conditioning DEM (90m) ===")
RAW_DEM = INPUTS_DIR / "terrain" / "downstream_dem_glo30.tif"
dem_data = np.full((nrows, ncols), -9999.0, dtype=np.float32)

with rasterio.open(RAW_DEM) as src:
    reproject(
        source=rasterio.band(src, 1),
        destination=dem_data,
        src_transform=src.transform,
        src_crs=src.crs,
        dst_transform=transform_90m,
        dst_crs="EPSG:32644",
        resampling=Resampling.bilinear,
        dst_nodata=-9999.0
    )

# Apply corridor mask
dem_masked = np.where(mask_img == 1, dem_data, -9999.0).astype(np.float32)

# Inlet conditioning: Carve 1.5 km smooth coupling channel at Tehri Dam toe
# Tehri toe: point 0 on full_line
inlet_pt = full_line.interpolate(0)
x0, y0 = inlet_pt.x, inlet_pt.y
print(f"Tehri Dam Toe inlet: x={x0:.1f}, y={y0:.1f}")

def get_rc(x, y):
    c = int(round((x - xll) / CELLSIZE - 0.5))
    r = int(round((yur - y) / CELLSIZE - 0.5))
    return r, c

# Trace initial 1500m along river centerline to find channel thalweg
carve_dist = np.arange(0, 1500, CELLSIZE)
thalweg_e = []
thalweg_rc = []
for d in carve_dist:
    pt = full_line.interpolate(d)
    r, c = get_rc(pt.x, pt.y)
    r = np.clip(r, 0, nrows-1)
    c = np.clip(c, 0, ncols-1)
    # search 3x3 min
    rmin, rmax = max(0, r-1), min(nrows, r+2)
    cmin, cmax = max(0, c-1), min(ncols, c+2)
    win = dem_masked[rmin:rmax, cmin:cmax]
    valid = win[win > 0]
    e = np.min(valid) if len(valid) > 0 else 630.0
    thalweg_e.append(e)
    thalweg_rc.append((r, c))

# Monotonically descending bed slope
curr_e = thalweg_e[0]
for idx, (r, c) in enumerate(thalweg_rc):
    e = thalweg_e[idx]
    if e > curr_e:
        e = curr_e
    else:
        curr_e = e
    # Carve 3x3 channel around thalweg
    rmin, rmax = max(0, r-1), min(nrows, r+2)
    cmin, cmax = max(0, c-1), min(ncols, c+2)
    dem_masked[rmin:rmax, cmin:cmax] = np.minimum(dem_masked[rmin:rmax, cmin:cmax], e + 0.5)
    dem_masked[r, c] = e

print("Carved 1.5 km coupling channel at Tehri Dam inlet toe")

# Save extended_dem.tif
with rasterio.open(
    V5_DIR / "extended_dem.tif",
    "w",
    driver="GTiff",
    height=nrows,
    width=ncols,
    count=1,
    dtype=np.float32,
    crs="EPSG:32644",
    transform=transform_90m,
    nodata=-9999.0,
    compress="lzw"
) as dst:
    dst.write(dem_masked, 1)
print("Saved extended_dem.tif")

# Write ESRI ASCII grid for LISFLOOD-FP
print("Writing v5_dem_90m.asc ...")
with open(V5_DIR / "v5_dem_90m.asc", "w") as f:
    f.write(f"ncols {ncols}\n")
    f.write(f"nrows {nrows}\n")
    f.write(f"xllcorner {xll:.3f}\n")
    f.write(f"yllcorner {yll:.3f}\n")
    f.write(f"cellsize {CELLSIZE:.3f}\n")
    f.write(f"NODATA_value -9999.0\n")
    np.savetxt(f, dem_masked, fmt="%.2f")
print(f"Saved v5_dem_90m.asc ({(V5_DIR / 'v5_dem_90m.asc').stat().st_size / 1e6:.1f} MB)")

# 5. Spatially Varying Manning Roughness from ESA WorldCover 2021
print("=== 5. Spatially Varying Manning Friction Generation ===")
RAW_LC = INPUTS_DIR / "landcover" / "downstream_worldcover_2021.tif"
lc_data = np.full((nrows, ncols), 0, dtype=np.uint8)

with rasterio.open(RAW_LC) as src:
    reproject(
        source=rasterio.band(src, 1),
        destination=lc_data,
        src_transform=src.transform,
        src_crs=src.crs,
        dst_transform=transform_90m,
        dst_crs="EPSG:32644",
        resampling=Resampling.nearest
    )

# ESA WorldCover Manning Mapping:
# 10 (Tree cover): 0.080
# 20 (Shrubland): 0.060
# 30 (Grassland): 0.040
# 40 (Cropland): 0.045
# 50 (Built-up): 0.120
# 60 (Bare / sparse): 0.045
# 80 (Water body): 0.035
# 90 (Wetland): 0.050
# default: 0.060
manning_map = {
    10: 0.080,
    20: 0.060,
    30: 0.040,
    40: 0.045,
    50: 0.120,
    60: 0.045,
    80: 0.035,
    90: 0.050,
}

roughness_data = np.full((nrows, ncols), 0.060, dtype=np.float32)
for code, n_val in manning_map.items():
    roughness_data[lc_data == code] = n_val

# Mask outside corridor with -9999.0
roughness_masked = np.where(mask_img == 1, roughness_data, -9999.0).astype(np.float32)

# Save extended_roughness.tif
with rasterio.open(
    V5_DIR / "extended_roughness.tif",
    "w",
    driver="GTiff",
    height=nrows,
    width=ncols,
    count=1,
    dtype=np.float32,
    crs="EPSG:32644",
    transform=transform_90m,
    nodata=-9999.0,
    compress="lzw"
) as dst:
    dst.write(roughness_masked, 1)
print("Saved extended_roughness.tif")

# Save v5_roughness_90m.asc for LISFLOOD-FP manningfile
with open(V5_DIR / "v5_roughness_90m.asc", "w") as f:
    f.write(f"ncols {ncols}\n")
    f.write(f"nrows {nrows}\n")
    f.write(f"xllcorner {xll:.3f}\n")
    f.write(f"yllcorner {yll:.3f}\n")
    f.write(f"cellsize {CELLSIZE:.3f}\n")
    f.write(f"NODATA_value -9999.0\n")
    np.savetxt(f, roughness_masked, fmt="%.3f")
print(f"Saved v5_roughness_90m.asc ({(V5_DIR / 'v5_roughness_90m.asc').stat().st_size / 1e6:.1f} MB)")

# 6. Boundary Formulation (v5_boundary.bci & v5_boundary.bdy)
print("=== 6. Boundary Formulation ===")
# Upstream Inflow Points at DualSPHysics 2km coupling transect (Row 34, Col 437-441 on 627.5m floor)
inflow_pts = [
    (34, 437),
    (34, 438),
    (34, 439),
    (34, 440),
    (34, 441),
]
inflow_coords = []
for r, c in inflow_pts:
    x = xll + (c + 0.5) * CELLSIZE
    y = yur - (r + 0.5) * CELLSIZE
    inflow_coords.append((x, y))

# Read DualSPHysics coupling hydrograph
COUPLING_CSV = BASE_DIR / "data" / "processed" / "tehri_simulations" / "dualsphysics" / "coupling" / "dualsphysics_to_delft3d_boundary_prototype_equivalent.csv"
import pandas as pd
df_coup = pd.read_csv(COUPLING_CSV)
t_arr = df_coup["time_s"].values
q_arr = df_coup["Q_out_m3s"].values
t_rel = t_arr - t_arr[0]

# Add recession decay out to 43,200s (12 hours)
t_last = t_rel[-1]
q_last = max(q_arr[-1], 2000.0)
decay_times = np.linspace(t_last + 30, 43200.0, 100)
decay_qs = q_last * np.exp(-(decay_times - t_last) / 3600.0)

t_all = np.concatenate([t_rel, decay_times])
q_all = np.concatenate([q_arr, decay_qs])

# Distribute across the 3 inflow points
num_pts = len(inflow_coords)
q_per_pt = q_all / num_pts

with open(V5_DIR / "v5_boundary.bdy", "w") as f:
    f.write("Boundary conditions for Tehri V5 Extended Corridor\n")
    for i in range(num_pts):
        f.write(f"tehri_v5_inflow_{i}\n")
        f.write(f"{len(t_all)} seconds\n")
        for t, q in zip(t_all, q_per_pt):
            f.write(f"{q:.3f}\t{t:.3f}\n")

print(f"Saved v5_boundary.bdy with {num_pts} injection points (Peak Q = {np.max(q_all):,.1f} m³/s)")

# Downstream FREE boundary: locate the southern-most active cells along the bottom
# Find active cells at rows near the south outlet
bottom_rows = np.where(mask_img[-5:, :] == 1)
exit_cols = np.unique(bottom_rows[1])
x_min_exit = xll + np.min(exit_cols) * CELLSIZE
x_max_exit = xll + (np.max(exit_cols) + 1) * CELLSIZE

with open(V5_DIR / "v5_boundary.bci", "w") as f:
    for i, (x, y) in enumerate(inflow_coords):
        f.write(f"P {x:.1f} {y:.1f} QVAR tehri_v5_inflow_{i}\n")
    # Downstream FREE boundary across south edge
    f.write(f"S {x_min_exit:.1f} {x_max_exit:.1f} FREE\n")

print(f"Saved v5_boundary.bci (Inlet Points: {len(inflow_coords)}, South FREE Outflow: {x_min_exit:.1f} to {x_max_exit:.1f})")

# 7. Write LISFLOOD Parameter File
print("=== 7. Writing LISFLOOD Parameter File (tehri_v5_extended.par) ===")
with open(V5_DIR / "tehri_v5_extended.par", "w") as f:
    f.write(f"DEMfile         v5_dem_90m.asc\n")
    f.write(f"resroot         tehri_v5\n")
    f.write(f"dirroot         outputs\n")
    f.write(f"sim_time        43200.0\n") # 12 hours
    f.write(f"initial_tstep   1.0\n")
    f.write(f"massint         300.0\n")
    f.write(f"saveint         600.0\n") # 10 minute snapshots -> 72 frames
    f.write(f"fpfric          0.06\n")
    f.write(f"manningfile     v5_roughness_90m.asc\n")
    f.write(f"bcifile         v5_boundary.bci\n")
    f.write(f"bdyfile         v5_boundary.bdy\n")
    f.write(f"chainageoff\n")
    f.write(f"elevoff\n")

print(f"Configuration complete in {V5_DIR}")
