import numpy as np

def read_esri_ascii(filename):
    with open(filename, 'r') as f:
        header = {}
        for i in range(6):
            line = f.readline().split()
            header[line[0].lower()] = float(line[1])
        data = np.loadtxt(f)
    return header, data

dem_hdr, dem = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/terrain/downstream_dem_ascii.asc")
max_hdr, max_d = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/outputs/v2_boundary_corrected/raw/tehri_coarse_v2.max")
arr_hdr, arr = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/outputs/v2_boundary_corrected/raw/tehri_coarse_v2.inittm")

cellsize = dem_hdr['cellsize']
xll = dem_hdr['xllcorner']
yll = dem_hdr['yllcorner']
nrows = int(dem_hdr['nrows'])
ncols = int(dem_hdr['ncols'])
ymax = yll + nrows * cellsize

def get_row_col(x, y):
    c = int(round((x - xll) / cellsize - 0.5))
    r = int(round((ymax - y) / cellsize - 0.5))
    return r, c

def get_xy(r, c):
    x = xll + (c + 0.5) * cellsize
    y = ymax - (r + 0.5) * cellsize
    return x, y

# 1. AUDIT THE 15-CELL UPSTREAM BOUNDARY
y_inj = 3362755.0
r_inj, _ = get_row_col(xll, y_inj)

# In V2, we used 15 cells centered around the min elevation
dem_row = dem[r_inj, :]
valid_dem = dem_row[dem_row != dem_hdr['nodata_value']]
min_elev = np.min(valid_dem)
min_col = np.where(dem_row == min_elev)[0][0]
cols_v2 = list(range(min_col - 7, min_col + 8))
cols_v2 = [c for c in cols_v2 if 0 <= c < ncols and dem_row[c] != dem_hdr['nodata_value']]

print("--- 1. 15-CELL BOUNDARY AUDIT ---")
for c in cols_v2:
    x, y = get_xy(r_inj, c)
    elev = dem[r_inj, c]
    # rough slope
    dz_dx = (dem[r_inj, c+1] - dem[r_inj, c-1]) / (2*cellsize) if c>0 and c<ncols-1 else 0
    slope = np.degrees(np.arctan(np.abs(dz_dx)))
    cls = "valley_floor" if elev - min_elev < 20 else "hillslope"
    print(f"Col {c} | X:{x:.0f} Y:{y:.0f} | Elev: {elev:.1f} m | Q: 20000 m3/s | Slope: {slope:.1f} deg | Class: {cls}")

# 2. CROSS SECTION
print("\n--- 2. UPSTREAM CROSS-SECTION ---")
elevs = [dem[r_inj, c] for c in cols_v2]
valley_cells = [e for e in elevs if e - min_elev < 20]
print(f"BOUNDARY_TOTAL_WIDTH = {len(cols_v2) * cellsize} m")
print(f"HYDRAULICALLY_ACTIVE_WIDTH (elev < min+20m) = {len(valley_cells) * cellsize} m")
print(f"MIN_ELEVATION = {np.min(elevs):.1f} m")
print(f"MAX_ELEVATION = {np.max(elevs):.1f} m")
print(f"RELIEF_ACROSS_BOUNDARY = {np.max(elevs) - np.min(elevs):.1f} m")

# 3. BOUNDARY ORIENTATION
print("\n--- 3. BOUNDARY ORIENTATION ---")
# Check valley orientation by finding min elevation at r_inj + 10 (900m downstream)
min_c_down = np.argmin(dem[r_inj + 10, :])
dx = (min_c_down - min_col) * cellsize
dy = -10 * cellsize
angle = np.degrees(np.arctan2(dx, dy))
print(f"Valley flow direction angle from North: {angle:.1f} deg")
print(f"Boundary is perfectly East-West. Valley flows at {angle:.1f} deg.")
if abs(angle) > 20:
    print("BOUNDARY_ORIENTATION_VALID = NO (diagonal to flow)")
else:
    print("BOUNDARY_ORIENTATION_VALID = YES (roughly perpendicular)")

# 4. DEM CHANNEL GEOMETRY
print("\n--- 4. DEM CHANNEL GEOMETRY ---")
for dist_km in [0, 1, 2, 5]:
    r = r_inj + int(dist_km * 1000 / cellsize)
    row_dem = dem[r, :]
    valid = row_dem[row_dem != dem_hdr['nodata_value']]
    min_e = np.min(valid)
    active_width = np.sum(valid - min_e < 20) * cellsize
    print(f"Section {dist_km} km: Valley bottom = {min_e:.1f} m, Active width (<20m depth) = {active_width} m")

# 5. EXTREME DEPTH CELLS
print("\n--- 5. EXTREME DEPTH CAUSES ---")
valid_mask = (max_d != max_hdr['nodata_value']) & (max_d > 0) & (max_d < 9999)
ext_500 = np.where(valid_mask & (max_d > 500))
ext_1000 = np.where(valid_mask & (max_d > 1000))

y_ext_1000 = [get_xy(r, c)[1] for r, c in zip(ext_1000[0], ext_1000[1])]
max_dist_from_inj = np.max(np.abs(np.array(y_ext_1000) - y_inj)) if len(y_ext_1000) > 0 else 0
print(f"Cells >1000m: {len(y_ext_1000)}. Max distance from boundary: {max_dist_from_inj:.1f} m")

# 6. WATER SURFACE SANITY
print("\n--- 6. WSE SANITY CHECK ---")
wse = np.where(valid_mask, dem + max_d, np.nan)
wet_wse = wse[max_d > 0.05]
print(f"Max WSE: {np.nanmax(wet_wse):.1f} m")
print(f"Median wet-cell WSE: {np.nanmedian(wet_wse):.1f} m")
print(f"P95 WSE: {np.nanpercentile(wet_wse, 95):.1f} m")
print(f"P99 WSE: {np.nanpercentile(wet_wse, 99):.1f} m")

# 7. CHECKPOINT ORDERING
print("\n--- 7. CHECKPOINT ORDERING AUDIT ---")
dists = ["2km", "5km", "10km", "15km"]
xs = [257425, 258535, 259135, 262795]
ys = [3360745, 3357745, 3352765, 3347755]
for d, x, y in zip(dists, xs, ys):
    r, c = get_row_col(x, y)
    elev = dem[r, c]
    # find actual valley bottom at this Y
    row_dem = dem[r, :]
    val_min = np.min(row_dem[row_dem != dem_hdr['nodata_value']])
    arr_t = arr[r, c] if arr[r,c] != arr_hdr['nodata_value'] else -1
    print(f"Checkpoint {d}: X={x} Y={y} | Elev: {elev:.1f} m (Valley min: {val_min:.1f} m) | Arrival: {arr_t:.3f} h")
    if elev - val_min > 50:
        print(f"  -> Checkpoint {d} is placed {elev - val_min:.1f} m ABOVE the valley floor!")

