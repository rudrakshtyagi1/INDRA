import pyvista as pv
import glob, os, numpy as np

f = 'data/processed/tehri_simulations/dualsphysics/outputs/vtk/PartFluid_0007.vtk'
mesh = pv.read(f)
pts = mesh.points
vel = mesh.point_data['Vel']
mask = (pts[:, 0] > 19.5) & (pts[:, 0] < 20.5)
if np.sum(mask) > 0:
    v_max = np.max(np.linalg.norm(vel[mask], axis=1))
    print("Vmax model:", v_max)
    print("Vmax proto:", v_max * 10)
