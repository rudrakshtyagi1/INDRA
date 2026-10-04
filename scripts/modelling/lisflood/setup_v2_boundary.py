import numpy as np

def read_esri_ascii(filename):
    with open(filename, 'r') as f:
        header = {}
        for i in range(6):
            line = f.readline().split()
            header[line[0].lower()] = float(line[1])
        data = np.loadtxt(f)
    return header, data

header, dem = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/terrain/downstream_dem_ascii.asc")

cellsize = header['cellsize']
xll = header['xllcorner']
yll = header['yllcorner']
nrows = int(header['nrows'])
ncols = int(header['ncols'])
nodata = header['nodata_value']

y_target = 3362755.0
# Y coordinates in ESRI ASCII: row 0 is ymax
ymax = yll + nrows * cellsize
row = int((ymax - y_target) / cellsize)

# Get the row from DEM
dem_row = dem[row, :]

# V1 diagnosis
x_v1 = [257425.0, 257455.0, 257485.0, 257515.0, 257545.0]
cols_v1 = [int((x - xll) / cellsize) for x in x_v1]
unique_cols_v1 = list(set(cols_v1))
print("--- V1 DIAGNOSIS ---")
print(f"Number of inflow cells used: {len(unique_cols_v1)}")
print(f"Physical width: {len(unique_cols_v1) * cellsize} m")
print(f"Elevations at V1 cells: {[dem_row[c] for c in unique_cols_v1]}")
print("Concentrated: YES")

# V2 setup
# We want to distribute across a wider physical section, e.g., 900m-1500m (10-17 cells).
# Find the lowest point in this row, which should be the river channel.
valid_dem = dem_row[dem_row != nodata]
min_elev = np.min(valid_dem)
min_col = np.where(dem_row == min_elev)[0][0]

# Expand left and right until we have about 15 cells (width = 1350m) 
# or until elevation rises too much.
target_width_cells = 15
cols_v2 = list(range(min_col - target_width_cells//2, min_col + target_width_cells//2 + 1))
cols_v2 = [c for c in cols_v2 if 0 <= c < ncols and dem_row[c] != nodata]

print("\n--- V2 BOUNDARY ---")
print(f"V2 Selected Cells: {len(cols_v2)}")
print(f"V2 Physical width: {len(cols_v2) * cellsize} m")
print(f"Elevations: {[dem_row[c] for c in cols_v2]}")

# Write new .bci
with open("data/processed/tehri_simulations/lisflood_fp/boundary/lisflood_boundary_v2.bci", "w") as f:
    for i, c in enumerate(cols_v2):
        x = xll + (c + 0.5) * cellsize
        f.write(f"P {x:.1f} {y_target:.1f} QVAR tehri_inflow_v2_{i}\n")

# Write new .bdy
# Read the original Q(t) and divide by len(cols_v2)
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

num_points = len(cols_v2)
q_per_point = q_m3s / num_points
peak_q = np.max(q_per_point)
print(f"V2 Peak Q per cell: {peak_q:.2f} m3/s")

with open("data/processed/tehri_simulations/lisflood_fp/boundary/lisflood_boundary_v2.bdy", "w") as f:
    f.write("Boundary conditions for Tehri V2\n")
    for i in range(num_points):
        f.write(f"tehri_inflow_v2_{i}\n")
        f.write(f"{len(time_s)} seconds\n")
        for t, q in zip(time_s, q_per_point):
            f.write(f"{q:.3f}\t{t:.3f}\n")

