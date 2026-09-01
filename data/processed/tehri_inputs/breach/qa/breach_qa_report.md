# FloodLab — Step 8: What-If Reservoir Routing & Breach Hydrograph QA Report

## 1. Provenance & Operational Qualification
- **Study Mode**: **WHAT-IF EMERGENCY-PLANNING SCENARIO**
- **Validation Context**: This is a hypothetical civil defense / disaster-preparedness benchmark. It is **NOT** a historical event reconstruction or real-time operational prediction.
- **Current Reservoir State**: `CURRENT_TEHRI_RESERVOIR_LEVEL = DATA UNAVAILABLE`.

## 2. Stage-Storage Data Audit
- **Status**: `TEHRI_STAGE_STORAGE_DATA_FOUND = NO` (Granular bathymetric hydrographic survey table is proprietary/unobserved).
- **Benchmark Hypsometry**: Monotonic power-law canyon hypsometry (S(z) = a*(z - 570)^b, b=3.165) strictly anchored to verified reported structural specifications:
  - Bed Elevation: **570.0 m MSL** (0 MCM)
  - Minimum Operating Level (MDDL): **740.0 m MSL** (925.0 MCM)
  - Full Reservoir Level (FRL): **830.0 m MSL** (3,540.0 MCM)
  - Dam Crest Elevation: **839.5 m MSL** (3,950.0 MCM)

## 3. Scenario Matrix & Hydrograph Summary
| Scenario | Initial Elevation | Initial Storage | Inflow Series | Max Breach Width | Formation Time | Peak Q_breach | Time to Peak | Total Release Volume | Drawdown | Mass-Balance Error |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **SCENARIO_LOW** | 740.0 m | 925.0 MCM | Step 7 LOW | 120.0 m | 3.5 h | **8,660.7 m3/s** | 48.5 h | 466.9 MCM | -1.8 m | -0.000044% |
| **SCENARIO_BASE** | 815.0 m | 2,860.0 MCM | Step 7 BASE | 220.0 m | 2.0 h | **723,731.3 m3/s** | 46.6 h | 3,273.4 MCM | 133.7 m | 0.000003% |
| **SCENARIO_HIGH** | 830.0 m | 3,540.0 MCM | Step 7 HIGH | 350.0 m | 1.2 h | **2,246,710.5 m3/s** | 45.8 h | 4,228.6 MCM | 229.0 m | 0.000000% |

## 4. Timestep Sensitivity
- Numerical integration was evaluated at 60s, 30s, 10s, and 5s.
- Peak discharge variation between 10s and 5s is <0.05%, with absolute mass balance error < 0.00001%.
- Selected canonical solver timestep: **dt = 10.0 seconds**.

## 5. Downstream Boundary Coupling
- Primary coupling hydrograph created at `data/processed/tehri_inputs/breach/hydrographs/breach_boundary_hydrograph.csv` for hydrodynamic dam-toe inflow coupling.
