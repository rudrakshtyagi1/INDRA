# FloodLab — Hydrologic Forcing Quality Assurance & Provenance Report (Step 6B)

## 1. Actual Precipitation Source & Provenance
- **Source Product**: **ECMWF ERA5-Land Hourly Surface Reanalysis** (served via Open-Meteo Historical Weather Archive API)
- **Provider**: European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus Climate Change Service (C3S)
- **Product ID**: `ERA5-Land Hourly (Total Precipitation)`
- **Version**: `ERA5-Land v1.0`
- **Native Spatial Resolution**: 0.1° × 0.1° (~9 km grid)
- **Native Temporal Resolution**: 1 hour (60 minutes)
- **Native Units & Semantics**: `mm` (Hourly precipitation accumulation in mm per 1-hour interval)
- **Raw Cache Path**: `data/raw/meteorology/imerg/satellite_precip_96cells_2024-06-01_2024-09-30.json`

## 2. Catchment Fractional Area-Weighted Averaging
- **Target Basin**: `tehri_catchment_dem_conditioned.gpkg` (Metric Area: **7,300.30 km²** in EPSG:32644)
- **Intersecting Grid Cells**: 96 regular 0.1° cells
- **Sum of Intersection Areas**: 7,300.3016 km² (Exact geometric match, difference < 0.00001 km²)
- **Sum of Normalized Area Weights**: 1.000000

## 3. Gauge QA & Limitations
- **In-Catchment Gauge**: `ID Uttarkashi` (30.7311°N, 78.4275°E) inside the Upper Bhagirathi valley.
- **Classification**: **LIMITED POINT-GAUGE QA** (3 daily records available: 2024-06-29 to 2024-07-03; not suitable for statistical bias correction or full calibration due to limited sample size).

## 4. CWC Streamflow Telemetry & Functional Roles
- **Tekhla (30.7481°N, 78.4533°E)**:
  - Role: **UPSTREAM OBSERVATION / PARTIAL INFLOW CALIBRATION CANDIDATE**
  - Sampling Interval: 15-minute telemetry (62,624 intervals, 98.66% dominant)
  - Scientific Boundary: Gauges the Upper Bhagirathi river basin (~5,807 km²). It does NOT represent total Tehri reservoir inflow because the Bhilangna river (~1,481 km²) and lateral tributary valleys join downstream of Tekhla.
- **Koteshwar (30.2653°N, 78.5033°E)**:
  - Role: **DOWNSTREAM HYDROLOGIC OBSERVATION / RELEASE-AFFECTED VALIDATION CANDIDATE**
  - Sampling Interval: 15-minute telemetry (88,587 intervals, 99.40% dominant)
  - Scientific Boundary: Observed streamflow downstream of Tehri/Koteshwar is governed by reservoir regulation, powerhouse turbine releases, spillway discharge, and pondage. It cannot be treated as natural rainfall-runoff response.

## 5. Unobserved Quantities & Scientific Boundaries
- **Bhilangna River Discharge**: `BHILANGNA DIRECT DISCHARGE OBSERVATION = NOT AVAILABLE`. Future hydrologic inflows must be marked `MODELLED / DERIVED HYDROLOGIC INFLOW`.
- **Reservoir Level**: `CURRENT_TEHRI_RESERVOIR_LEVEL = DATA UNAVAILABLE`. Full Reservoir Level (830 m MSL) is a structural capacity limit and must not be used as measured initial condition.
- **Prototype Event**: Late July – Early August 2024 Monsoon Storm (2024-07-30 00:00 to 2024-08-04 23:00 UTC) is designated strictly as a **SELECTED HYDROMETEOROLOGIC PROTOTYPE EVENT**.
