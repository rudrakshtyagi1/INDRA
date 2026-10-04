import pandas as pd
import numpy as np

# Original CSV was prototype scale
df = pd.read_csv('data/processed/tehri_simulations/dualsphysics/coupling/dualsphysics_to_delft3d_boundary.csv')

# Clean negative flows (artifact of particle deletion)
df['Q_out_m3s'] = df['Q_out_m3s'].clip(lower=0)

# This is prototype scale
df_proto = df.copy()
df_proto.to_csv('data/processed/tehri_simulations/dualsphysics/coupling/dualsphysics_to_delft3d_boundary_prototype_equivalent.csv', index=False)

# Create model scale
# time_proto = time_model * 10 -> time_model = time_proto / 10
# Wait, time_proto in the CSV already has 167200 offset.
# So time_model = (time_proto - 167200) / 10
df_model = df.copy()
df_model['time_s'] = (df['time_s'] - 167200) / 10.0
df_model['Q_out_m3s'] = df['Q_out_m3s'] / 100000.0
df_model.to_csv('data/processed/tehri_simulations/dualsphysics/coupling/dualsphysics_to_delft3d_boundary_model_scale.csv', index=False)

print("Max Model:", df_model['Q_out_m3s'].max())
print("Max Proto:", df_proto['Q_out_m3s'].max())
