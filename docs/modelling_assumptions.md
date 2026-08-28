# Modelling Assumptions

## Physical Constants

| Constant | Value | Notes |
|----------|-------|-------|
| Gravitational acceleration g | 9.81 m/s2 | Standard gravity |
| Water density rho0 | 1000.0 kg/m3 | Pure water; debris-laden flows may be higher |
| Tait EOS gamma | 7.0 | Standard SPH compressibility parameter |
| Speed of sound c0 | 40.0 m/s | Artificial compressibility; 10x max expected flow velocity |

## SPH Assumptions

- Wendland C2 kernel: smooth, positive definite, compact support h = 2*Dp
- Artificial viscosity: alpha=0.1, beta=0.2 (Monaghan 1992)
- Symplectic time integration (second-order)
- Boundary treatment: dynamic boundary particles (Crespo et al. 2015)
- Flow assumed weakly compressible (Mach << 1 condition met for g <= 40 m/s)

## Breach Model Assumptions

### Froehlich (2008) - Default
- Breach width: Bavg = 0.27 * Ko * Vw^0.32 * hb^0.04 (overtopping)
  Ko = 0.7 for overtopping, 1.0 for piping
- Formation time: tf = 63.2 * sqrt(Vw / (g * hb^2)) [hours]
- Side slopes: z = 0.5 for overtopping
- Provenance: MODELLED (empirical regression on historical dam failures)

### MacDonald & Langridge-Monopolis (1984)
- Based on erosion volume: Ve = 0.0261 * (Vw * hw)^0.769
- Used for piping scenarios
- Provenance: MODELLED

### Von Thun & Gillette (1990)
- Breach width: B = 2.5*hw + Cb, Cb = f(reservoir capacity)
- Formation time: tf = B / (4*hw) for overtopping
- Provenance: MODELLED

### Ritter (1892) Instantaneous
- Instantaneous full-width breach, t_f = 0
- Used as upper-bound worst case
- Peak discharge: Qp = 8/27 * sqrt(g) * hw^(5/2) * B
- Provenance: MODELLED (analytical solution)

### LDOF (Costa-Schuster / Walder-O'Connor)
- Landslide Dam Outburst Flood formulation
- Peak discharge: Qp = 6.7 * V^0.56 (volumetric regression)
- Used for natural_blockage_failure scenarios
- Provenance: MODELLED

## Delft3D FM Assumptions

- 2D depth-averaged shallow water equations (SWE)
- Manning-Strickler bottom friction
- Dry cell threshold h_dry = 0.02 m
- CFL-adaptive timestep with CFL = 0.45

## Manning Roughness Assumptions

When derived from land cover (DERIVED provenance):

| ESA WorldCover Class | Manning n |
|---------------------|-----------|
| Tree cover | 0.100 |
| Shrubland | 0.050 |
| Grassland | 0.035 |
| Cropland | 0.040 |
| Built-up | 0.015 |
| Bare/sparse | 0.025 |
| Water body | 0.025 |
| Mangrove | 0.100 |
| Moss/lichen | 0.045 |

Default valley representative values (ASSUMED provenance):
- Mountain gorge (Himalayan): 0.042
- Semi-urban: 0.035
- Plains alluvial: 0.030

## CWC / Defra Hazard Rating

HR = d * (v + 0.5) + DF

where:
- d = water depth [m]
- v = velocity [m/s]
- DF = debris factor (ASSUMED: 1.0 for mountain gorge, 0.5 for plains)

Hazard classification:
- HR < 0.75: Low
- 0.75 <= HR < 1.25: Moderate
- 1.25 <= HR < 2.50: Significant
- HR >= 2.50: Extreme (HADR red zone)

## DEM Assumptions

DEM source and version are NOT hardcoded. Each run records:
- dem.source (e.g. "Copernicus DEM GLO-30")
- dem.version (e.g. "2023-01")
- dem.resolution_m
- dem.file_hash (SHA256)

Supported sources: Copernicus DEM, CartoDEM V3R1, SRTM 30m/90m.
Provenance: REPORTED (from satellite/government survey).
