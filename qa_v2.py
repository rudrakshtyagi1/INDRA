import numpy as np

def read_esri_ascii(filename):
    with open(filename, 'r') as f:
        header = {}
        for i in range(6):
            line = f.readline().split()
            header[line[0].lower()] = float(line[1])
        data = np.loadtxt(f)
    return header, data

max_header, max_data = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/outputs/v2_boundary_corrected/raw/tehri_coarse_v2.max")

nodata = max_header['nodata_value']
cellsize = max_header['cellsize']
yll = max_header['yllcorner']
nrows = int(max_header['nrows'])

# Y coordinate of cells: row 0 is yll + nrows*cellsize (top). 
# y_coords[row] = yll + (nrows - row - 0.5)*cellsize
y_coords = np.array([yll + (nrows - r - 0.5)*cellsize for r in range(nrows)])

y_injection = 3362755.0
exclusion_zone_length = 1000.0 # 1 km
y_exclusion_min = y_injection - exclusion_zone_length
y_exclusion_max = y_injection + 100 # just a bit upstream

# Create exclusion mask (1 if excluded, 0 if included)
# Broaden row mask to 2D
exclusion_mask_1d = (y_coords >= y_exclusion_min) & (y_coords <= y_exclusion_max)
exclusion_mask = np.broadcast_to(exclusion_mask_1d[:, None], max_data.shape)

valid_mask = (max_data != nodata) & (max_data > 0) & (max_data < 9999)
wet_mask = (max_data > 0.05) & valid_mask

# INCLUDED stats
wet_mask_included = wet_mask & ~exclusion_mask
depth_values_inc = max_data[wet_mask_included]

# ALL stats (including boundary)
depth_values_all = max_data[wet_mask]

print("--- BOUNDARY ARTIFACT QA ---")
print(f"Boundary Exclusion Zone: {exclusion_zone_length} m")
print("\n[INCLUDING BOUNDARY EXCLUSION ZONE]")
print(f"Mean depth: {np.mean(depth_values_all):.2f} m")
print(f"Median depth: {np.median(depth_values_all):.2f} m")
print(f"P95: {np.percentile(depth_values_all, 95):.2f} m")
print(f"P99: {np.percentile(depth_values_all, 99):.2f} m")
print(f"Maximum: {np.max(depth_values_all):.2f} m")
for thresh in [10, 20, 50, 100, 500, 1000]:
    print(f"Depth > {thresh} m: {np.sum(depth_values_all > thresh)} cells")

print("\n[EXCLUDING BOUNDARY EXCLUSION ZONE]")
print(f"Mean depth: {np.mean(depth_values_inc):.2f} m")
print(f"Median depth: {np.median(depth_values_inc):.2f} m")
print(f"P95: {np.percentile(depth_values_inc, 95):.2f} m")
print(f"P99: {np.percentile(depth_values_inc, 99):.2f} m")
print(f"Maximum: {np.max(depth_values_inc):.2f} m")
for thresh in [10, 20, 50, 100, 500, 1000]:
    print(f"Depth > {thresh} m: {np.sum(depth_values_inc > thresh)} cells")

print("\n--- SPATIAL EXTREME QA ---")
cells_500_all = np.sum(depth_values_all > 500)
cells_500_exc = np.sum(depth_values_inc > 500)
print(f"> 500m cells: {cells_500_all} total, {cells_500_exc} outside buffer.")

cells_1000_all = np.sum(depth_values_all > 1000)
cells_1000_exc = np.sum(depth_values_inc > 1000)
print(f"> 1000m cells: {cells_1000_all} total, {cells_1000_exc} outside buffer.")

print("\n--- INUNDATION AREA ---")
cell_area_km2 = (cellsize * cellsize) / 1e6
print(f"V2 raw inundated area (All): {np.sum(wet_mask) * cell_area_km2:.3f} km2")
print(f"V2 QA-filtered area (Excluding buffer): {np.sum(wet_mask_included) * cell_area_km2:.3f} km2")

print("\n--- ARRIVAL TIME QA ---")
arr_header, arr_data = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/outputs/v2_boundary_corrected/raw/tehri_coarse_v2.inittm")
arr_nodata = arr_header['nodata_value']
arr_valid = (arr_data != arr_nodata) & (arr_data > 0) & (arr_data < 9999)

dists = ["2km", "5km", "10km", "15km"]
xs = [257425, 258535, 259135, 262795]
ys = [3360745, 3357745, 3352765, 3347755]
for d, x_c, y_c in zip(dists, xs, ys):
    col = int((x_c - arr_header['xllcorner']) / cellsize)
    row = int((max_header["yllcorner"] + nrows*cellsize - y_c) / cellsize)
    try:
        val = arr_data[row, col]
        if val > 0 and val < 9999:
            print(f"Checkpoint {d}: {val:.4f} h")
        else:
            window = arr_data[row-2:row+3, col-2:col+3]
            v_win = window[(window > 0) & (window < 9999)]
            if len(v_win) > 0:
                print(f"Checkpoint {d}: {np.min(v_win):.4f} h (nearest)")
            else:
                print(f"Checkpoint {d}: NOT REACHED")
    except:
        pass

print("\n--- MASS BALANCE QA ---")
with open("data/processed/tehri_simulations/lisflood_fp/outputs/v2_boundary_corrected/raw/tehri_coarse_v2.mass") as f:
    lines = f.readlines()
    last_line = lines[-1].split()
    print(f"Time: {last_line[0]}")
    print(f"Volume: {last_line[5]} m3")
    print(f"Qin: {last_line[6]}")
    print(f"Qerror: {last_line[9]}")
    print(f"Verror: {last_line[10]} m3")
