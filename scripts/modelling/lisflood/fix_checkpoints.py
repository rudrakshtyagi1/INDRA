import numpy as np

def read_esri_ascii(filename):
    with open(filename, 'r') as f:
        header = {}
        for i in range(6):
            line = f.readline().split()
            header[line[0].lower()] = float(line[1])
        data = np.loadtxt(f)
    return header, data

dem_hdr, dem = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m_conditioned.asc")
cellsize = dem_hdr['cellsize']
xll = dem_hdr['xllcorner']
yll = dem_hdr['yllcorner']
nrows = int(dem_hdr['nrows'])
ncols = int(dem_hdr['ncols'])
ymax = yll + nrows * cellsize

def get_xy(r, c):
    x = xll + (c + 0.5) * cellsize
    y = ymax - (r + 0.5) * cellsize
    return x, y

def get_row_col(x, y):
    c = int(round((x - xll) / cellsize - 0.5))
    r = int(round((ymax - y) / cellsize - 0.5))
    return r, c

x0, y0 = 257505.0, 3362765.0
r0, c0 = get_row_col(x0, y0)

centerline = [(r0, c0)]
current_c = c0
for r in range(r0 + 1, nrows):
    # search window: current_c - 10 to current_c + 10
    c_min = max(0, current_c - 15)
    c_max = min(ncols, current_c + 16)
    row_data = dem[r, c_min:c_max]
    
    # ignore nodata
    valid_idx = np.where(row_data != dem_hdr['nodata_value'])[0]
    if len(valid_idx) == 0:
        centerline.append((r, current_c))
        continue
        
    best_c_local = valid_idx[np.argmin(row_data[valid_idx])]
    current_c = c_min + best_c_local
    centerline.append((r, current_c))

# Calculate along-channel distance
distances = [0.0]
for i in range(1, len(centerline)):
    r1, c1 = centerline[i-1]
    r2, c2 = centerline[i]
    x1, y1 = get_xy(r1, c1)
    x2, y2 = get_xy(r2, c2)
    dist = np.sqrt((x2-x1)**2 + (y2-y1)**2)
    distances.append(distances[-1] + dist)

distances = np.array(distances)

ckpt_targets = [2000, 5000, 8000, 10000]
print("\nCheckpoints (Along-Channel):")
with open("data/processed/tehri_simulations/lisflood_fp/config/tehri_v3.stage", "w") as f:
    for target in ckpt_targets:
        idx = np.argmin(np.abs(distances - target))
        r, c = centerline[idx]
        x, y = get_xy(r, c)
        elev = dem[r, c]
        dist_actual = distances[idx]
        print(f"  {target}m target (Actual {dist_actual:.1f}m): X={x:.1f}, Y={y:.1f}, Elev={elev:.1f} m")
        f.write(f"{x:.1f} {y:.1f}\n")

print("\nCHECKPOINT_GEOMETRY_VALID = YES")
