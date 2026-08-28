# SPH to Delft3D FM Coupling

## Concept

DualSPHysics provides a near-field 3D Lagrangian (particle-based) simulation
of the dam-break flow in the immediate breach zone and upstream valley.
Delft3D FM provides a far-field 2D Eulerian (grid-based) simulation of flood
propagation across the downstream reach.

These two solvers are coupled through a discharge timeseries Q(t) extracted
at a coupling transect plane.

```
DualSPHysics --> Q(t) --> Delft3D FM

Q(t) = integral over A of v . n dA
```

## Step 1: DualSPHysics Near-Field Simulation

DualSPHysics simulates:
- Initial reservoir water surface (particles initialised above breach crest)
- Dam structure as boundary particles (mk_bound geometry)
- Valley channel walls as boundary geometry
- Breach opening evolving over formation_time_hrs

Key SPH parameters recorded in manifest:
- Kernel: Wendland
- Step algorithm: Symplectic
- Viscosity: Artificial (alpha, beta coefficients)
- Particle spacing Dp (controls resolution)
- CFL: 0.2 (adaptive timestep)

Output: PartVTK particle files (pos_x, pos_y, pos_z, vel_x, vel_y, vel_z, rhop)

## Step 2: Flux Extraction (DischargeExtractor)

A coupling transect plane is defined at the downstream boundary of the SPH domain,
typically 1-3 km downstream of the breach.

For each PartVTK timestep frame:
1. Filter particles within transect band (x in [transect_x - dx/2, transect_x + dx/2])
2. Sum cross-sectional discharge:

   Q(t) = sum over particles i of (m_i / rho_i) * v_xi / Delta_t

where m_i = particle mass, rho_i = density, v_xi = velocity normal to transect.

## Step 3: Temporal Resampling (TemporalResampler)

DualSPHysics uses an adaptive CFL-controlled timestep (~0.001-0.01 s).
Delft3D FM requires fixed-interval boundary conditions (typically 30-300 s intervals).

Resampling:
- Monotonic linear interpolation (numpy.interp)
- Mass conservation check: |Vol_original - Vol_resampled| / Vol_original < 5%
- CouplingValidationError raised if conservation tolerance exceeded

## Step 4: Boundary File Generation (HydrographConverter)

Generates Delft3D FM boundary forcing files:

### discharge_boundary.tim (timeseries file)
```
# Time [min]    Discharge [m3/s]
0.0             0.0
0.5             125.3
1.0             4823.7
...
```

### boundary.ext (external forcing linkage)
```
QUANTITY=dischargebnd
FILENAME=discharge_boundary.tim
FILETYPE=1
METHOD=3
LOCATIONFILE=upstream_boundary.pli
```

## Step 5: Delft3D FM Boundary Injection

The .tim and .ext files are referenced in the .mdu Master Definition File.
D-Flow FM reads the discharge timeseries as an inflow boundary condition
at the upstream end of the computational domain.

## Mass Conservation

Mass conservation is verified at coupling:
- SPH domain volume = integral of Q_SPH(t) dt
- Resampled volume = integral of Q_resampled(t) dt
- Relative error must be < 5% (configurable in configs/modelling.yaml)

## Provenance

| Output | Provenance |
|--------|-----------|
| PartVTK particle fields | MODELLED (DualSPHysics) |
| Q(t) timeseries | DERIVED (flux integration from MODELLED particles) |
| .tim boundary file | DERIVED (resampled Q(t)) |
| Delft3D FM flood depth | MODELLED (Delft3D FM) |
