# Uncertainty Methodology

## Approach: Monte Carlo Ensemble

Each ensemble member is a complete simulation with independently perturbed input parameters.
Default ensemble size: 50 members (configurable in configs/modelling.yaml).

## Perturbed Parameters

| Parameter | Default Perturbation | Distribution |
|-----------|---------------------|-------------|
| breach_width_m | +/- 25% | Truncated Gaussian (lower bound 50% of base) |
| formation_time_hrs | +/- 30% | Truncated Gaussian (lower bound 20% of base) |
| hydraulic_head_m | +/- 5.0 m | Uniform |
| manning_n | +/- 20% | Truncated Gaussian |

Perturbation ranges are configurable per scenario in configs/modelling.yaml.

## Sampling Strategy

Latin Hypercube Sampling (LHS) is used to ensure better parameter space coverage
than simple random sampling. With N ensemble members and k parameters, LHS divides
each parameter range into N equally probable intervals and samples one value per interval.

## Outputs

For each downstream station and grid point:
- P10 (10th percentile) arrival time and maximum depth
- P50 (50th percentile / median)
- P90 (90th percentile)
- Inundation probability: fraction of ensemble members flooding a cell above threshold (0.3 m)

## Sensitivity Analysis

Pearson correlation coefficient between each perturbed input parameter and the
scalar output of interest (e.g. peak discharge at Rishikesh):

r(Xi, Y) = Cov(Xi, Y) / (sigma_Xi * sigma_Y)

Parameters ranked by |r| descending.
Spearman rank correlation also available for non-linear relationships.

## Provenance

Ensemble inputs: same provenance as base scenario (ASSUMED for manual parameters, REPORTED for THDC specs)
P10/P50/P90 outputs: DERIVED (from multiple MODELLED ensemble members)
