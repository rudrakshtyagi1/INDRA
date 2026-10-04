import pandas as pd
import numpy as np

# Read the SPH hydrograph
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

time_s = np.append(time_s, time_s[-1] + 20)
q_m3s = np.append(q_m3s, 0.0)
time_s = np.append(time_s, 20000.0)
q_m3s = np.append(q_m3s, 0.0)

num_points = 5
q_per_point = q_m3s / num_points

# Write .bdy file with 5 identical boundaries
with open("data/processed/tehri_simulations/lisflood_fp/boundary/lisflood_boundary.bdy", "w") as f:
    f.write(f"Boundary conditions for Tehri\n")
    for i in range(num_points):
        f.write(f"tehri_inflow_{i}\n")
        f.write(f"{len(time_s)} seconds\n")
        for t, q in zip(time_s, q_per_point):
            f.write(f"{q:.3f}\t{t:.3f}\n")

