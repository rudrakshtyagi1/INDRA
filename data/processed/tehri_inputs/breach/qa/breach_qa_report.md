# FloodLab — Step 8B: Theoretical Breach Benchmark QA & Scientific Audit Report

## 1. Provenance Classification & Project Safety Gate
- **Tehri-Specific Stage-Storage Status**: **`NOT AVAILABLE`**
- **Tehri-Specific Reservoir Routing Status**: **`BLOCKED_STAGE_STORAGE_DATA`**
- **Simplified Theoretical Breach Benchmark Status**: **`AVAILABLE (READY FOR SOLVER INTEGRATION TESTING ONLY)`**
- **Study Mode & UI/Video Label**: **`PRECOMPUTED WHAT-IF EMERGENCY-PLANNING SCENARIO`** / **`SIMPLIFIED THEORETICAL BREACH BENCHMARK`**
- **Non-Affirmation Statement**: This benchmark is **NOT** an operational prediction, historical Tehri reconstruction, or real-time simulation.

## 2. Stage-Storage Data Audit & Hypsometry Relabeling
- A granular bathymetric survey table for Tehri Dam is unobserved/proprietary.
- The mathematical curve $S(z) = a(z - 570.0)^b$ ($b=3.165$) is classified as:
  **`ASSUMED THEORETICAL RESERVOIR HYPSOMETRY`** / **`SIMPLIFIED EMERGENCY-PLANNING BENCHMARK HYPSOMETRY`**.
- Artifact renamed: `data/processed/tehri_inputs/breach/reservoir_reference/assumed_theoretical_stage_storage_benchmark.csv`.

## 3. Structural Design Anchors vs Assumed States
- **Crest Elevation (839.5 m MSL)**: `REPORTED DESIGN SPECIFICATION (THDC / CWC)`
- **Full Reservoir Level (830.0 m MSL, 3,540 MCM)**: `REPORTED DESIGN SPECIFICATION (THDC / CWC)`
- **Minimum Drawdown Level (740.0 m MSL, 925 MCM)**: `REPORTED DESIGN SPECIFICATION (THDC / CWC)`
- **Riverbed Elevation (570.0 m MSL)**: `REPORTED DESIGN SPECIFICATION (THDC / CWC)`
- **BASE Scenario Storage at 815 m (2,934.2 MCM)**: **`DERIVED FROM ASSUMED BENCHMARK HYPSOMETRY`** *(NOT reported Tehri storage)*.

## 4. Extreme Peak Discharge Investigation ($Q_{\text{peak}}$ Analysis)
The theoretical reservoir routing produced the following peak discharges:
- **`SCENARIO_LOW`**: **$8,660.7	ext{ m}^3/	ext{s}$** *(THEORETICAL NOTCH BENCHMARK)*
- **`SCENARIO_BASE`**: **$723,731.3	ext{ m}^3/	ext{s}$** *(EXTRAPOLATED THEORETICAL BENCHMARK)*
- **`SCENARIO_HIGH`**: **$2,246,710.5	ext{ m}^3/	ext{s}$** *(EXTRAPOLATED THEORETICAL BENCHMARK)*

### Why are BASE and HIGH peak discharges so large?
1. **Extreme Hydrostatic Head ($H_b pprox 135 - 230	ext{ m}$)**:
   Tehri Dam is the tallest dam in India ($260.5	ext{ m}$). Standard empirical weir discharge scales as $Q \propto B \cdot H_b^{1.5}$. At $H_b = 135	ext{ m}$ (BASE) with breach width $B = 220	ext{ m}$, the instantaneous broad-crested weir opening capacity exceeds $700,000	ext{ m}^3/	ext{s}$.
2. **Gigantic Stored Potential Energy ($S_0 pprox 2.93 - 3.54	ext{ BCM}$)**:
   A reservoir holding nearly $3.5	ext{ billion cubic meters}$ behind a $260	ext{m}$ barrier contains immense flood potential. Rapid breach development ($t_f = 2.0	ext{ h}$) empties $>3	ext{ BCM}$ in hours.
3. **Empirical Regression Extrapolation Warning**:
   The Froehlich (2008) dataset consists almost entirely of small/medium dams (median height $pprox 20	ext{ m}$). Applying this equation to a $260.5	ext{ m}$ rockfill dam with a thick clay core and riprap slope protection is an **extreme extrapolation**. Real rockfill dams of this size would experience significant erosion resistance, structural interlocking, and tailwater backpressure that are unrepresented in simple uncoupled broad-crested weir formulas.
4. **Dominant Sensitivity Drivers**:
   - **Initial Head / Elevation ($Z_0$)**: Greatest impact on initial discharge intensity.
   - **Breach Depth / Final Invert ($Z_{\text{inv}}$)**: Controls total drained volume.
   - **Breach Formation Time ($t_f$)**: Controls hydrograph sharpness and peak compression.
   - **Parameters were NOT artificially tuned**: The physics and mathematics are presented transparently without cosmetic suppression.

## 5. Numerical Consistency vs Physical Validation
- **Numerical Consistency**: **PASS**
  - Timestep stability confirmed across $60	ext{s}, 30	ext{s}, 10	ext{s}, 5	ext{s}$ (selected $\Delta t = 10.0	ext{ s}$).
  - Conservation of mass verified: absolute residual $< 100	ext{ m}^3$ on a $3.27	ext{ BCM}$ event ($< 0.000003\%$ error).
- **Physical Validation**: **UNVALIDATED THEORETICAL BENCHMARK**
  - Demonstrates numerical conservation only.
  - Does NOT validate real Tehri breach physics, geotechnical failure mechanics, or actual downstream wave propagation.

## 6. Solver Coupling Artifact Status
- `breach_boundary_hydrograph.csv` is designated: **`SIMPLIFIED_THEORETICAL_BREACH_BOUNDARY`**.
- It is approved for **solver integration testing, UI playback testing, and numerical pipeline verification only**.
- Downstream water level column is labeled: **`MODELLED FROM ASSUMED BENCHMARK HYPSOMETRY`**.

## 7. Required Missing Data for Full Tehri Reservoir Routing
To unblock full, validated Tehri-specific reservoir routing:
1. Official hydrographic Elevation-Area-Capacity table from THDC India Limited / CWC.
2. Verified multi-beam reservoir bathymetry.
3. Timestamped operational reservoir water-level records during the event period.
