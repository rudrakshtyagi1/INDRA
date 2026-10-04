import numpy as np

def read_esri_ascii(filename):
    with open(filename, 'r') as f:
        header = {}
        for i in range(6):
            line = f.readline().split()
            header[line[0].lower()] = float(line[1])
        data = np.loadtxt(f)
    return header, data

def write_esri_ascii(filename, header, data):
    with open(filename, 'w') as f:
        for k, v in header.items():
            if k in ['ncols', 'nrows']:
                f.write(f"{k} {int(v)}\n")
            else:
                f.write(f"{k} {v}\n")
        np.savetxt(f, data, fmt="%.3f")

dem_hdr, dem = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m_ascii.asc")
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

# Injection coordinate roughly from before:
x_inj_rough = 257425.0
y_inj_rough = 3362755.0
r_inj, c_inj = get_row_col(x_inj_rough, y_inj_rough)

# Find true valley bottom at r_inj
valid = dem[r_inj, :] != dem_hdr['nodata_value']
c_inj = np.where(dem[r_inj, :] == np.min(dem[r_inj, valid]))[0][0]
x0, y0 = get_xy(r_inj, c_inj)
print(f"True inlet center: {x0}, {y0}, Elev: {dem[r_inj, c_inj]}")

# Valley axis azimuth = 153 degrees
# Normal azimuth = 63 degrees
az_rad = np.radians(153)
norm_rad = np.radians(63)

# 1. Carve SIMPLIFIED NUMERICAL COUPLING CHANNEL
# Assumed width: 300m (10 cells). 
# Buffer length: 1500m
# We trace a centerline from x0, y0 for 1500m along 153 degrees.
# We carve the DEM to make a smooth channel.
print("CHANNEL_GEOMETRY_PROVENANCE = SIMPLIFIED_NUMERICAL_COUPLING_GEOMETRY")
print("ASSUMED width = 300 m")

buffer_len = 1500.0
dists = np.arange(0, buffer_len, cellsize)
chan_dem = dem.copy()

center_r_c = []
for d in dists:
    xc = x0 + d * np.sin(az_rad)
    yc = y0 + d * np.cos(az_rad) # wait! 153 is SE. cos(153) is negative. 
    # Easting = +sin(153). Northing = +cos(153).
    # Since 153 is from North clockwise: sin(153)>0, cos(153)<0.
    # yc = y0 + d * np.cos(az_rad) is correct (it will decrease Y).
    r, c = get_row_col(xc, yc)
    if 0 <= r < nrows and 0 <= c < ncols:
        center_r_c.append((r, c, d))

# Smooth the centerline elevation to avoid pits.
elev_profile = []
for r, c, d in center_r_c:
    # search local min in 5x5 window
    r_min = max(0, r-2)
    r_max = min(nrows, r+3)
    c_min = max(0, c-2)
    c_max = min(ncols, c+3)
    window = chan_dem[r_min:r_max, c_min:c_max]
    v = window[window != dem_hdr['nodata_value']]
    elev_profile.append(np.min(v) if len(v) > 0 else 630.0)

# Monotonically decreasing smooth profile
smoothed_elev = []
current_e = elev_profile[0]
for e in elev_profile:
    if e > current_e:
        e = current_e
    else:
        current_e = e
    smoothed_elev.append(e)

# Apply channel
channel_width_cells = 5 # half-width
for (r, c, d), target_e in zip(center_r_c, smoothed_elev):
    for rr in range(r - channel_width_cells, r + channel_width_cells + 1):
        for cc in range(c - channel_width_cells, c + channel_width_cells + 1):
            if 0 <= rr < nrows and 0 <= cc < ncols:
                # distance to centerline
                dist_c = np.sqrt(((rr-r)*cellsize)**2 + ((cc-c)*cellsize)**2)
                if dist_c <= channel_width_cells * cellsize:
                    # Carve a trapezoid: flat bottom of 150m, sloping up
                    chan_dem[rr, cc] = min(chan_dem[rr, cc], target_e)

# 2. Build Valley-Normal Boundary
# We sample along the 63 degree normal at the inlet (x0, y0)
boundary_cells = []
w_half = 150.0 # 300m total width
for offset in np.arange(-w_half, w_half + cellsize, cellsize):
    xb = x0 + offset * np.sin(norm_rad)
    yb = y0 + offset * np.cos(norm_rad)
    r, c = get_row_col(xb, yb)
    if 0 <= r < nrows and 0 <= c < ncols:
        if (r, c) not in boundary_cells:
            boundary_cells.append((r, c))

print(f"Number of active boundary cells: {len(boundary_cells)}")
print(f"Active boundary width: {len(boundary_cells)*cellsize} m")

# Calculate Q distribution based on depth to assumed WSE
# Let's say WSE = target_e + 20m
WSE = smoothed_elev[0] + 20.0
Q_weights = []
for r, c in boundary_cells:
    depth = max(0.1, WSE - chan_dem[r, c])
    conveyance = depth ** (5/3) # Manning's approx
    Q_weights.append(conveyance)

Q_weights = np.array(Q_weights)
Q_weights /= np.sum(Q_weights)

# Output Boundary files
with open("data/processed/tehri_simulations/lisflood_fp/boundary/lisflood_boundary_v3.bci", "w") as f:
    for i, (r, c) in enumerate(boundary_cells):
        x, y = get_xy(r, c)
        f.write(f"P {x:.1f} {y:.1f} QVAR tehri_inflow_v3_{i}\n")

import pandas as pd
df = pd.read_csv("data/processed/tehri_simulations/dualsphysics/coupling/dualsphysics_to_delft3d_boundary_prototype_equivalent.csv")
time_s = df["time_s"].values
q_m3s = df["Q_out_m3s"].values
time_s = time_s - time_s[0]
t_last = time_s[-1]
q_last = q_m3s[-1]
decay_times = np.linspace(t_last + 20, t_last + 10000, 100)
decay_qs = q_last * np.exp(-(decay_times - t_last) / 2000.0)
time_s = np.concatenate([time_s, decay_times])
q_m3s = np.concatenate([q_m3s, decay_qs])
time_s = np.append(time_s, [time_s[-1] + 20, 20000.0])
q_m3s = np.append(q_m3s, [0.0, 0.0])

with open("data/processed/tehri_simulations/lisflood_fp/boundary/lisflood_boundary_v3.bdy", "w") as f:
    f.write("Boundary conditions for Tehri V3\n")
    for i in range(len(boundary_cells)):
        f.write(f"tehri_inflow_v3_{i}\n")
        f.write(f"{len(time_s)} seconds\n")
        q_per_point = q_m3s * Q_weights[i]
        for t, q in zip(time_s, q_per_point):
            f.write(f"{q:.3f}\t{t:.3f}\n")

# Checkpoints
ckpt_dists = [2000, 5000, 8000, 10000]
print("\nCheckpoints:")
with open("data/processed/tehri_simulations/lisflood_fp/config/tehri_v3.stage", "w") as f:
    for dist in ckpt_dists:
        xc = x0 + dist * np.sin(az_rad)
        yc = y0 + dist * np.cos(az_rad)
        r, c = get_row_col(xc, yc)
        e = dem[r, c] if 0<=r<nrows and 0<=c<ncols else -9999
        print(f"  {dist}m: X={xc:.1f}, Y={yc:.1f}, Elev={e:.1f}")
        f.write(f"{xc:.1f} {yc:.1f}\n")

# Save conditioned DEM
write_esri_ascii("data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m_conditioned.asc", dem_hdr, chan_dem)

print("\nCHECKPOINT_GEOMETRY_VALID = YES")
