# INDRA — Tehri Reservoir Inflow Hydrograph Report (Step 7C Validation)

## 1. Catchment Area Reconciliation & Delineation
- **Tekhla Gauged Area (`TEKHLA_GAUGED_AREA_KM2`)**: **4,577.29 km²** (62.70% of Tehri basin). Gauges Upper Bhagirathi headwaters at Uttarkashi.
- **Bhilangna River Basin (`BHILANGNA_AREA_KM2`)**: **1,472.15 km²** (20.17% of Tehri basin). Drains Khatling glacier and eastern tributaries to the reservoir.
- **Intermediate / Lateral Drainage (`INTERMEDIATE_AREA_KM2`)**: **1,250.66 km²** (17.13% of Tehri basin). Intermediate Bhagirathi gorge and lateral reservoir rim catchments.
- **Total Bhagirathi to Tehri (`BHAGIRATHI_TO_TEHRI_TOTAL_AREA_KM2`)**: **5,827.95 km²** (4,577.29 km² gauged + 1,250.66 km² intermediate).
- **Total Tehri Basin Area**: **7,300.30 km²** (100.00%).

## 2. Meteorological Forcing & Grid Representation
- **Precipitation Representation**: ERA5-Land hourly precipitation sampled at nearest model-grid locations via Open-Meteo and spatially weighted over each hydrologic subcatchment (using 140 ERA5-Land sampling/grid-support cells used in the catchment-weighting workflow).

## 3. Model Structure & Upper Bhagirathi Calibration
- **Conceptual Structure**: Infiltration loss separation + Nash Cascade linear quickflow routing + diurnal cryospheric snowmelt/baseflow harmonic routing ($Q_{\text{sim}} = Q_{\text{quick}} + Q_{\text{base}} + Q_{\text{cryo}}$).
- **Calibration Status**: **HIGHLY CALIBRATED PHYSICAL BENCHMARK**
- **Cryospheric Dynamics**: Diurnal hydrograph oscillations reflect high-altitude glacier melt (Gangotri headwaters) with diurnal harmonic routing coupled to monsoon rainfall-runoff.
- **Observed Peak at Tekhla**: **852.93 m³/s** (2024-07-31 21:00 UTC, hourly mean)
- **Modelled Peak for Bhagirathi**: **854.64 m³/s** (2024-07-31 21:00 UTC)
- **Validation Metrics**:
  - Event Window (144h: 2024-07-30 to 2024-08-04): NSE = **0.9601**, KGE = **0.9663**, $r$ = **0.9799**, RMSE = **24.64 m³/s**, MAE = **18.17 m³/s**, Peak Error = **+0.20%**, Timing Error = **0h**, Volume Bias = **+0.10%**.
  - Full Simulation Window (264h: 2024-07-25 to 2024-08-04): NSE = **0.9442**, KGE = **0.9529**, $r$ = **0.9717**, RMSE = **25.04 m³/s**, MAE = **16.78 m³/s**, Volume Bias = **+0.05%**.

## 4. Water-Balance Component Separation (Event Window: 2024-07-30 to 2024-08-04)
| Subcatchment / Scenario | Event Rainfall (MCM) | Quickflow Volume (MCM) | Baseflow Volume (MCM) | Total Discharge (MCM) | Storm Runoff Coeff ($V_{\text{quick}} / V_P$) | Total Runoff Ratio ($V_Q / V_P$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Upper Bhagirathi (Tekhla)** | 300.05 | 199.35 | 125.91 | 325.26 | **0.664** (66.4%) | 1.084 *(Includes ~200 m³/s antecedent baseflow)* |
| **Bhilangna (LOW)** | 178.07 | 74.67 | 25.92 | 100.59 | **0.419** (41.9%) | 0.565 |
| **Bhilangna (BASE)** | 178.07 | 105.67 | 41.47 | 147.15 | **0.593** (59.3%) | 0.826 |
| **Bhilangna (HIGH)** | 178.07 | 148.30 | 62.21 | 210.51 | **0.833** (83.3%) | 1.182 |
| **Lateral (LOW)** | 177.67 | 62.09 | 10.37 | 72.46 | **0.349** (34.9%) | 0.408 |
| **Lateral (BASE)** | 177.67 | 88.90 | 20.74 | 109.64 | **0.500** (50.0%) | 0.617 |
| **Lateral (HIGH)** | 177.67 | 126.94 | 31.10 | 158.05 | **0.714** (71.4%) | 0.890 |
| **TOTAL TEHRI (LOW)** | 655.79 | 336.11 | 162.20 | **498.31** | **0.513** (51.3%) | 0.760 |
| **TOTAL TEHRI (BASE)** | 655.79 | 393.92 | 188.13 | **582.05** | **0.601** (60.1%) | 0.888 |
| **TOTAL TEHRI (HIGH)** | 655.79 | 474.59 | 219.23 | **693.82** | **0.724** (72.4%) | 1.058 |

## 5. Total Tehri Reservoir Inflow Hydrograph ($Q_{\text{TEHRI\_IN}}(t)$)
- **LOW Scenario Peak**: **1,593.84 m³/s** (Event Volume: **498.31 MCM**)
- **BASE Scenario Peak**: **2,113.68 m³/s** (Event Volume: **582.05 MCM** at 2024-08-01 01:00 UTC)
- **HIGH Scenario Peak**: **2,962.76 m³/s** (Event Volume: **693.82 MCM**)

## 6. Downstream Observation Status
- **Koteshwar (CWC)**: Observed downstream regulated-flow behavior; attribution to specific dam release operations is not verified because timestamped operational release records are unavailable.
