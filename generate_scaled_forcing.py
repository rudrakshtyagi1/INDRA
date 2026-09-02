import pandas as pd
import numpy as np

df = pd.read_csv('data/processed/tehri_inputs/breach/hydrographs/breach_boundary_hydrograph.csv')

lambda_L = 100
q_scale = lambda_L ** 2.5
t_scale = lambda_L ** 0.5

# Extract 167200 (Q=622k) to 168000 (Q=692k)
df_window = df[(df['time_s'] >= 167200) & (df['time_s'] <= 168000)].copy()

t_new = np.arange(167200, 168001, 1.0)
q_interp = np.interp(t_new, df_window['time_s'].values, df_window['Q_breach_m3s'].values)

df_scaled = pd.DataFrame({'time_prototype_s': t_new, 'Q_prototype_m3s': q_interp})
df_scaled['time_model_s'] = (df_scaled['time_prototype_s'] - 167200) / t_scale
df_scaled['Q_model_m3s'] = df_scaled['Q_prototype_m3s'] / q_scale

inlet_area_model = 2.0 * 1.81
df_scaled['V_inlet_model_ms'] = df_scaled['Q_model_m3s'] / inlet_area_model

df_scaled.to_csv('data/processed/tehri_simulations/dualsphysics/config/breach_boundary_hydrograph_scaled.csv', index=False)

# DualSPHysics requires a CSV for the inlet with Time and Velocity!
# Format: Time, Velocity
df_inlet = df_scaled[['time_model_s', 'V_inlet_model_ms']].copy()
df_inlet.to_csv('data/processed/tehri_simulations/dualsphysics/config/inlet_velocity.csv', index=False, header=False)

print("Scale:", lambda_L)
print("Qpeak Prototype:", df_scaled['Q_prototype_m3s'].max())
print("Qpeak Model:", df_scaled['Q_model_m3s'].max())
print("Max Inlet Velocity:", df_scaled['V_inlet_model_ms'].max())
print("Model simulation duration:", df_scaled['time_model_s'].max())
