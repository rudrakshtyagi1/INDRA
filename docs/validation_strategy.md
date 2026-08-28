# Validation Strategy

## Three-Tier Validation Framework

### Tier 1: Solver Verification

Verifies that the numerical solver produces physically correct solutions
against known analytical benchmarks (not observational data).

**Ritter (1892) instantaneous dam-break wave:**
- Dry-bed analytical solution for rectangular channel
- Positive wave front speed: c_front = 2*sqrt(g*h0)
- Wave speed: c = sqrt(g*h)
- Verified against DualSPHysics and Delft3D FM output for idealised geometry

**Mass conservation check:**
- Inflow volume (from breach hydrograph) vs outflow volume (at downstream boundary)
- Acceptable relative error: < 2%

### Tier 2: Model Comparison (SPH vs Delft3D)

Compares the two solvers against each other. Neither is treated as "truth";
differences characterise inter-model uncertainty.

**Inundation extent (wet/dry classification):**
- CSI (Critical Success Index) = TP / (TP + FP + FN)
- POD (Probability of Detection) = TP / (TP + FN)
- FAR (False Alarm Ratio) = FP / (TP + FP)

**Continuous depth comparison:**
- RMSE: root mean square error of depth grids
- MAE: mean absolute error
- Depth difference: Dh (spatial grid difference map)

**Hydrograph comparison at gauge stations:**
- RMSE: root mean square error of Q(t) timeseries
- Peak discharge error: DQp = (Q_mod_peak - Q_ref_peak) / Q_ref_peak
- Time-to-peak error: Dtp = t_mod_peak - t_ref_peak [hours]

All comparison metrics are labelled provenance=DERIVED (from two MODELLED sources).

### Tier 3: Observation Validation

Compares model output against real-world observations.

**Rishi Ganga 2021 event benchmark:**
- Used to benchmark the observation-comparison workflow and methodology
- Sentinel-1 post-event imagery compared to model inundation extent
- CSI/POD/FAR between simulated and SAR-detected flood extent
- IMPORTANT: This event validates the METHODOLOGY, not the Tehri Dam scenario.
  Rishi Ganga does NOT validate Tehri. The physics, terrain, reservoir volumes,
  and failure modes are different.

**Tehri catastrophic breach:**
- Observation validation: NOT_AVAILABLE
- Reason: Tehri catastrophic breach is a what-if planning scenario.
  No historical event data exists.
- When queried, the system returns:
  {available: false, reason: "Observation validation not available for hypothetical scenarios.
   Tehri catastrophic breach has no historical event record.
   Solver methodology is independently verified via Tier 1 and Tier 2 validation."}

## Historical Events in the Benchmark Registry

| Event | Year | Use | Observation Available |
|-------|------|-----|----------------------|
| Rishi Ganga / Chamoli | 2021 | Methodology benchmark | Yes (Sentinel-1) |
| Tehri catastrophic breach | N/A | What-if scenario | NOT_AVAILABLE |
