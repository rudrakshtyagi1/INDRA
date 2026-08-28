# Hydrology Methodology

## Rainfall-Runoff: SCS Curve Number Method

Reference: USDA-SCS National Engineering Handbook, Section 4 (1972) / NRCS TR-55.

### Step 1: Potential Maximum Retention

S = (25400 / CN) - 254    [mm]

where CN is the Curve Number (0-100).

### Step 2: Initial Abstraction

Ia = 0.2 * S    [mm]

(Standard NRCS coefficient; can be overridden in config to 0.05 for urban.)

### Step 3: Direct Runoff Depth

For P > Ia:

Pe = (P - Ia)^2 / (P - Ia + S)    [mm]

where P = total storm rainfall [mm].

### Step 4: Runoff Volume

V = Pe [mm] * A [km2] * 1000    [m3]

## Dimensionless Unit Hydrograph

Reference: NRCS TR-55 (1986).

Time to peak:
  tp = 0.6 * tc

where tc = time of concentration [hours].

Peak discharge factor: Qu = 0.208 * A / tp
(for tc in hours, A in km2, peak in m3/s)

Triangular UH approximation:
- Rising limb: 0 to Qp over duration tp
- Recession limb: Qp to 0 over duration 1.67*tp
- Total base time: tb = 2.67 * tp

## Convolution with Rainfall Excess

The storm is disaggregated into hourly increments.
Each increment generates a lagged unit hydrograph response.
Total hydrograph = superposition of all lagged responses.

## Reservoir Routing

Modified Puls (storage-indication) method:
- Storage-outflow function from stage-area curves
- Iterative solution of continuity equation
- I1 + I2 + (2S1/dt - Q1) = 2S2/dt + Q2
