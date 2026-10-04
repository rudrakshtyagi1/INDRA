import numpy as np

def read_esri_ascii(filename):
    with open(filename, 'r') as f:
        header = {}
        for i in range(6):
            line = f.readline().split()
            header[line[0].lower()] = float(line[1])
        data = np.loadtxt(f)
    return header, data

max_hdr, max_d = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/outputs/v3_geometry_corrected/raw/tehri_v3.max")
dem_hdr, dem = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m_conditioned.asc")

cellsize = max_hdr['cellsize']
xll = max_hdr['xllcorner']
yll = max_hdr['yllcorner']
nrows = int(max_hdr['nrows'])
ncols = int(max_hdr['ncols'])
ymax = yll + nrows * cellsize

x0, y0 = 257505.0, 3362765.0
buffer_dist = 1500.0

# coordinate grids
x_grid = xll + (np.arange(ncols) + 0.5) * cellsize
y_grid = ymax - (np.arange(nrows) + 0.5) * cellsize
xv, yv = np.meshgrid(x_grid, y_grid)

dist_from_inj = np.sqrt((xv - x0)**2 + (yv - y0)**2)
exclusion_mask = dist_from_inj <= buffer_dist

nodata = max_hdr['nodata_value']
valid_mask = (max_d != nodata) & (max_d > 0) & (max_d < 9999)
wet_mask = (max_d > 0.05) & valid_mask

wet_mask_included = wet_mask & ~exclusion_mask
depth_values_exc = max_d[wet_mask_included]

print("--- DEPTH QA (EXCLUDING BUFFER) ---")
if len(depth_values_exc) > 0:
    print(f"Mean depth: {np.mean(depth_values_exc):.2f} m")
    print(f"Median depth: {np.median(depth_values_exc):.2f} m")
    print(f"P95: {np.percentile(depth_values_exc, 95):.2f} m")
    print(f"P99: {np.percentile(depth_values_exc, 99):.2f} m")
    print(f"Maximum: {np.max(depth_values_exc):.2f} m")
    for thresh in [10, 20, 50, 100, 500, 1000]:
        print(f"Depth > {thresh} m: {np.sum(depth_values_exc > thresh)} cells")

print("\n--- WATER-SURFACE QA (EXCLUDING BUFFER) ---")
wse = np.where(wet_mask_included, dem + max_d, np.nan)
valid_wse = wse[~np.isnan(wse)]
if len(valid_wse) > 0:
    print(f"Median WSE: {np.median(valid_wse):.2f} m")
    print(f"P95 WSE: {np.percentile(valid_wse, 95):.2f} m")
    print(f"P99 WSE: {np.percentile(valid_wse, 99):.2f} m")
    print(f"Maximum WSE: {np.max(valid_wse):.2f} m")

print("\n--- INUNDATION AREA ---")
cell_area_km2 = (cellsize * cellsize) / 1e6
print(f"V3 raw inundated area (All): {np.sum(wet_mask) * cell_area_km2:.3f} km2")
print(f"V3 QA-filtered area (Excluding buffer): {np.sum(wet_mask_included) * cell_area_km2:.3f} km2")

print("\n--- ARRIVAL TIME QA ---")
arr_hdr, arr = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/outputs/v3_geometry_corrected/raw/tehri_v3.inittm")
arr_nodata = arr_hdr['nodata_value']

dists = ["2km", "5km", "8km", "10km"]
xs = [257835.0, 257955.0, 258525.0, 258765.0]
ys = [3361955.0, 3360095.0, 3357575.0, 3355925.0]

for d, x_c, y_c in zip(dists, xs, ys):
    c = int((x_c - xll) / cellsize)
    r = int((ymax - y_c) / cellsize)
    try:
        val = arr[r, c]
        if val > 0 and val < 9999:
            print(f"Checkpoint {d}: {val:.4f} h")
        else:
            print(f"Checkpoint {d}: NOT REACHED")
    except:
        pass

print("\n--- MASS BALANCE QA ---")
with open("data/processed/tehri_simulations/lisflood_fp/outputs/v3_geometry_corrected/raw/tehri_v3.mass") as f:
    lines = f.readlines()
    if len(lines) > 0:
        last_line = lines[-1].split()
        print(f"Time: {last_line[0]}")
        print(f"Volume: {last_line[5]} m3")
        print(f"Qin: {last_line[6]}")
        print(f"Qerror: {last_line[9]}")
        print(f"Verror: {last_line[10]} m3")
