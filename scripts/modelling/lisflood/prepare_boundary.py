import pandas as pd
import numpy as np

# Read the SPH hydrograph
df = pd.read_csv("data/processed/tehri_simulations/dualsphysics/coupling/dualsphysics_to_delft3d_boundary_prototype_equivalent.csv")
time_s = df["time_s"].values
q_m3s = df["Q_out_m3s"].values

# Shift time to start at 0
time_s = time_s - time_s[0]

# We need to append a decay tail to let the water propagate
# Let's say it decays to 0 over the next 10,000 seconds (approx 3 hours)
t_last = time_s[-1]
q_last = q_m3s[-1]

# Append points
decay_times = np.linspace(t_last + 20, t_last + 10000, 100)
# Simple exponential decay
decay_qs = q_last * np.exp(-(decay_times - t_last) / 2000.0)

time_s = np.concatenate([time_s, decay_times])
q_m3s = np.concatenate([q_m3s, decay_qs])

# Make sure it ends at exactly 0
time_s = np.append(time_s, time_s[-1] + 20)
q_m3s = np.append(q_m3s, 0.0)

# Also extend the time out to 15000s with 0 flow just to be safe
time_s = np.append(time_s, 15000.0)
q_m3s = np.append(q_m3s, 0.0)

# Write .bdy file
with open("data/processed/tehri_simulations/lisflood_fp/boundary/lisflood_boundary.bdy", "w") as f:
    f.write("tehri_inflow\n")
    f.write(f"{len(time_s)} seconds\n")
    for t, q in zip(time_s, q_m3s):
        f.write(f"{q:.3f} {t:.3f}\n")

# Write boundary_metadata.json
import json
meta = {
    "provenance": "BACK-SCALED DUALSPHYSICS MODEL RESULT",
    "extension": "DERIVED BENCHMARK HYDROGRAPH EXTENSION",
    "extension_rule": "Exponential decay tau=2000s appended after the SPH coupling period to allow flood propagation."
}
with open("data/processed/tehri_simulations/lisflood_fp/boundary/boundary_metadata.json", "w") as f:
    json.dump(meta, f, indent=4)
