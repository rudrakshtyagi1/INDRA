# FloodLab Architecture

## Overview

FloodLab is an end-to-end dam-break and flash flood simulation platform integrating
DualSPHysics (near-field 3D SPH) with Delft3D FM (far-field 2D shallow water) through
a first-class coupling subsystem, supplemented by satellite surveillance, hazard rating,
exposure assessment, and HADR (Humanitarian Assistance and Disaster Relief) routing.

## System Pipeline

```
INPUTS
  DEM (Copernicus/CartoDEM/SRTM - source+version+resolution in manifest)
  Rainfall (IMD gridded / GPM)
  Reservoir specs (THDC REPORTED)
  Land cover (ESA WorldCover)
  OSM roads + settlements
  Population (WorldPop 100m)
  Satellite (Sentinel-1 SAR, Sentinel-2 optical)
        |
        v
  HYDROLOGY ENGINE
  SCS Curve Number rainfall-runoff
  S = (25400/CN) - 254   Ia = 0.2*S
  Pe = (P - Ia)^2 / (P - Ia + S)
  Unit hydrograph convolution
  Modified Puls reservoir routing
        |
        v
  BREACH / RELEASE ENGINE
  Froehlich 2008 / MacDonald 1984 / Von Thun 1990
  Ritter instantaneous / LDOF Costa-Schuster
  Total dam release hydrograph Q_breach(t)
        |
        v
  DUALSPHYSICS
  Near-field 3D Smoothed Particle Hydrodynamics
  Wendland kernel, Symplectic integration
  Tait EOS: P = rho0*c0^2/gamma * ((rho/rho0)^gamma - 1)
  Artificial viscosity, CFL-adaptive timestep
        |
        v
  Q(t)  [discharge timeseries across coupling transect]
  Q(t) = integral over A of v . n dA
        |
        v
  COUPLING ENGINE (first-class subsystem)
  Flux extraction from SPH PartVTK particles
  Temporal resampling: SPH variable-dt -> Delft3D fixed-dt
  Mass conservation check (tolerance < 5%)
  Boundary file generation: .tim (timeseries) + .ext (forcing)
        |
        v
  DELFT3D FM (D-Flow FM)
  Far-field 2D Shallow Water Equations on flexible mesh
  HydroMT grid and boundary builder
  Manning roughness from land-cover lookup (DERIVED provenance)
  UGRID NetCDF output (*_map.nc, *_his.nc)
        |
        +------ Flood depth grid
        |------ Velocity grid
        |------ Arrival time grid
        |------ Inundation extent polygon
                |
    +-----------+-----------+-----------+
    |           |           |           |
 UNCERTAINTY  HAZARD     EXPOSURE   SATELLITE
 Monte Carlo  HR Rating  Population  Sentinel-1
 P10/P50/P90  CSI/POD    Village     SAR change
 Sensitivity  HADR zones  Priority   detection
    +-----------+-----------+-----------+
                |
          HADR ENGINE
                |
    +-----------+-----------+
    |                       |
EVACUATION              RESCUE
Mission A               Mission B
Village -> Shelter      NDRF -> Village
Flood lead-time vs      Road traversability
travel-time             Vehicle-class-aware*
                        (* when agency thresholds configured)
    +-----------+-----------+
                |
         SAFEST ROUTE
         (time-dependent graph cost)
```

## Storage Layout

Every simulation run is stored under:

```
storage/simulations/<run_id>/
  manifest.json      <- immutable run provenance record
  inputs/            <- snapshot of all input parameters
  hydrology/         <- SCS-CN outputs, inflow hydrograph
  sph/               <- DualSPHysics case files and output
  coupling/          <- Q(t) timeseries, .tim/.ext files
  delft3d/           <- D-Flow FM mesh, MDU, output NetCDF
  hazard/            <- depth/velocity/arrival rasters, HR grid
  uncertainty/       <- ensemble members, P10/P50/P90 grids
  exposure/          <- population, infrastructure, road exposure
  routing/           <- evacuation and rescue route GeoJSON
  exports/           <- GeoJSON, KML, Shapefile, CSV exports
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| SPH solver | DualSPHysics (external binary, subprocess adapter) |
| 2D flood model | Delft3D FM / D-Flow FM (external binary, HydroMT builder) |
| Coupling | Custom Python subsystem (discharge_extractor, temporal_resampler, hydrograph_converter) |
| API | FastAPI (async), Uvicorn |
| Database | PostgreSQL 16 + PostGIS (primary), SQLite (dev/test fallback) |
| Task queue | Celery + Redis |
| GIS frontend | MapLibre GL JS + Deck.gl (2D operational) |
| 3D visualisation | CesiumJS (optional digital twin) |
| Satellite | Google Earth Engine Python API |
| Geospatial | NumPy, SciPy, Shapely, NetworkX |
