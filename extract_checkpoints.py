import pyvista as pv
import pandas as pd
import numpy as np
import glob
import os

vtk_dir = 'data/processed/tehri_simulations/dualsphysics/outputs/vtk'
vtk_files = sorted(glob.glob(os.path.join(vtk_dir, 'PartFluid_*.vtk')))

times = []
q_out = []
vol_x20 = []
dp = 0.5
part_vol = dp**3
rho = 1000

for f in vtk_files:
    try:
        # Extract time from filename, e.g., PartFluid_0012.vtk -> 12 * 2.0s = 24.0s
        idx = int(f.split('_')[-1].split('.')[0])
        t = idx * 2.0  # TimeOut was 2.0s
        
        mesh = pv.read(f)
        pts = mesh.points
        
        # Volume of fluid past x=20
        mask = pts[:, 0] > 20.0
        v_past = np.sum(mask) * part_vol
        
        times.append(t)
        vol_x20.append(v_past)
        
    except Exception as e:
        print(f"Error reading {f}: {e}")

# Compute Q by differentiating volume past x=20
times = np.array(times)
vol_x20 = np.array(vol_x20)
q_out_arr = np.zeros_like(vol_x20)

if len(times) > 1:
    q_out_arr[1:] = np.diff(vol_x20) / np.diff(times)
    # smoothing
    q_out_arr = pd.Series(q_out_arr).rolling(3, min_periods=1, center=True).mean().values

# Q model to Q prototype
# Scale is 100
lambda_L = 100
q_scale = lambda_L ** 2.5
t_scale = lambda_L ** 0.5

t_proto = times * t_scale + 167200
q_proto = q_out_arr * q_scale

df_out = pd.DataFrame({
    'time_s': t_proto,
    'Q_out_m3s': q_proto
})

df_out.to_csv('data/processed/tehri_simulations/dualsphysics/coupling/dualsphysics_to_delft3d_boundary.csv', index=False)
print("Extracted coupling CSV.")
print("Max Q_out Prototype:", q_proto.max())

