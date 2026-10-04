import numpy as np
import json

def read_esri_ascii(filename):
    with open(filename, 'r') as f:
        header = {}
        for i in range(6):
            line = f.readline().split()
            header[line[0].lower()] = float(line[1])
        
        data = np.loadtxt(f)
    return header, data

max_header, max_data = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/outputs/raw/tehri_coarse.max")

# QA Max Depth
nodata = max_header['nodata_value']
cellsize = max_header['cellsize']
width = int(max_header['ncols'])
height = int(max_header['nrows'])

# Valid cells are those != nodata and depth < 9999 (ignore crazy numerical spikes > 9999)
valid_mask = (max_data != nodata) & (max_data >= 0) & (max_data < 9999)

# For depth QA, wet cells > 0.05
wet_mask = (max_data > 0.05) & valid_mask
depth_values = max_data[wet_mask]

print("--- 1. MAX DEPTH QA ---")
print(f"CRS: EPSG:32644 (from previous gdalwarp)")
print(f"Width / Height: {width} / {height}")
print(f"Cell size: {cellsize}")
print(f"NoData: {nodata}")
print(f"Valid cells: {np.sum(valid_mask)}")
print(f"Wet cells (>0.05m): {np.sum(wet_mask)}")

min_d = np.min(depth_values)
mean_d = np.mean(depth_values)
median_d = np.median(depth_values)
p95_d = np.percentile(depth_values, 95)
p99_d = np.percentile(depth_values, 99)
max_d = np.max(depth_values)

print(f"Minimum depth: {min_d:.3f} m")
print(f"Mean depth: {mean_d:.3f} m")
print(f"Median depth: {median_d:.3f} m")
print(f"95th percentile: {p95_d:.3f} m")
print(f"99th percentile: {p99_d:.3f} m")
print(f"Maximum depth (valid): {max_d:.3f} m")

# Locate max depth
max_idx = np.unravel_index(np.argmax(np.where(wet_mask, max_data, -1)), max_data.shape)
easting = max_header['xllcorner'] + (max_idx[1] + 0.5) * cellsize
northing = max_header['yllcorner'] + (height - max_idx[0] - 0.5) * cellsize
print(f"Max-depth cell Easting: {easting:.1f}, Northing: {northing:.1f}")
# Lat/Lon approximate via pyproj if we had it, but we can report UTM exactly and estimate Lat/Lon
print(f"Max-depth cell approx Lat/Lon: (Requires projection, will report UTM)")

print("\n--- 2. EXTREME DEPTH SANITY CHECK ---")
cell_area_km2 = (cellsize * cellsize) / 1e6
for thresh in [10, 20, 50, 100]:
    count = np.sum(depth_values > thresh)
    print(f"Depth > {thresh} m: {count} cells, {count * cell_area_km2:.3f} km2")

print("\n--- 3. ARRIVAL-TIME QA ---")
arr_header, arr_data = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/outputs/raw/tehri_coarse.inittm")
arr_nodata = arr_header['nodata_value']
arr_valid = arr_data[(arr_data != arr_nodata) & (arr_data > 0) & (arr_data < 9999)]

print("Units: HOURS (LISFLOOD-FP float default for .inittm)")
print(f"NoData: {arr_nodata}")
print(f"Minimum positive arrival time: {np.min(arr_valid):.4f} h")
print(f"Median arrival time: {np.median(arr_valid):.4f} h")
print(f"Maximum within wet extent: {np.max(arr_valid):.4f} h")

print("\n--- 4. INUNDATION AREA QA ---")
inun_area_exact = np.sum(wet_mask) * cell_area_km2
diff = 46.25 - inun_area_exact
print(f"Exact inundated area: {inun_area_exact:.3f} km2")
print(f"Difference from reported ~46.25 km2: {diff:.3f} km2")
