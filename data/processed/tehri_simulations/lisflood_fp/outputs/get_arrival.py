import numpy as np

# Read stage file
# The stage file format:
# Row 1: Time, Pt1_Depth, Pt2_Depth ...
lines = open('data/processed/tehri_simulations/lisflood_fp/outputs/raw/tehri_coarse.stage').readlines()
data = []
for line in lines:
    parts = line.strip().split()
    if len(parts) > 1:
        try:
            data.append([float(x) for x in parts])
        except:
            pass

data = np.array(data)

# Checkpoints at ~2km, ~5km, ~10km, ~15km
# Pt1 is data[:,1], Pt2 is data[:,2]...
threshold = 0.05
arrival_times = []
max_depths = []

for pt_idx in range(1, data.shape[1]):
    depths = data[:, pt_idx]
    max_depths.append(np.max(depths))
    
    # Find first time depth > threshold
    above = np.where(depths > threshold)[0]
    if len(above) > 0:
        arrival_times.append(data[above[0], 0])
    else:
        arrival_times.append(-1)

dists = ["2km", "5km", "10km", "15km"]
for d, at, md in zip(dists, arrival_times, max_depths):
    print(f"Checkpoint {d}: Arrival Time = {at} s, Max Depth = {md:.2f} m")

