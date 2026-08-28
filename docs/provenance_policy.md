# FloodLab Provenance Policy

## Overview

Every data value, parameter, and model output in FloodLab carries a provenance label
that describes how it was produced. Provenance attaches to the *value-generation
process*, not permanently to a variable type.

## The Five-Level Taxonomy

### OBSERVED
Direct sensor or Earth Observation measurement. No model intermediary.

Examples:
- Sentinel-1 GRD backscatter acquisition
- Sentinel-2 optical reflectance
- Rain gauge measurement
- River stage gauge reading

### REPORTED
Official documented specification from a government body, operator, or published reference.
The value was determined by a third party and we are using it as stated.

Examples:
- THDC dam structural height: 260.5 m
- CWC river reach length
- NDRF standard operating procedure thresholds
- JRC depth-damage curve coefficients

### MODELLED
Physics-solver or numerical-model output. Value was computed by DualSPHysics, Delft3D FM,
or a calibrated empirical formula.

Examples:
- Delft3D FM flood depth at location X, time T
- DualSPHysics particle velocity field
- Froehlich 2008 peak breach discharge (empirical formula output)
- SCS-CN direct runoff depth

### ASSUMED
Manually specified parameter without observational or official backing. Analyst judgement.

Examples:
- Manually entered breach width override
- Manning's n entered by analyst (not derived from land-cover)
- Assumed debris factor for a reach without survey data

### DERIVED
Computed from other provenance levels. A combination or transformation of two or more
upstream provenance sources.

Examples:
- Manning's n raster mapped from ESA WorldCover (OBSERVED/REPORTED) via lookup table (REPORTED) -> DERIVED
- Exposed population: MODELLED inundation extent + OBSERVED WorldPop grid -> DERIVED
- Economic loss estimate: DERIVED from MODELLED depth + REPORTED depth-damage curves
- Q(t) coupling output: DERIVED from DualSPHysics (MODELLED) via flux integration

## Provenance is Process-Based

The same variable can have different provenance depending on HOW it was determined:

| Parameter | Method | Provenance |
|-----------|--------|-----------|
| Manning's n | Analyst enters 0.042 manually | ASSUMED |
| Manning's n | Mapped from ESA WorldCover + lookup table | DERIVED |
| Manning's n | From CWC published survey | REPORTED |

## Execution Status (Separate from Provenance)

Execution status tracks the operational state of a simulation run, not the provenance of data.

Status values:
- PENDING: run queued, not started
- RUNNING: solver actively computing
- COMPLETED_BINARY: completed via actual DualSPHysics / Delft3D binary
- COMPLETED_ADAPTER: completed via adapter stub (binary not available)
- FAILED: run terminated with error

## Run Manifest

Every simulation generates a manifest.json in storage/simulations/<run_id>/:

```json
{
  "run_id": "tehri_20260101_abc123",
  "scenario_id": "tehri_base",
  "created_at": "2026-01-01T00:00:00Z",
  "execution_status": "COMPLETED_BINARY",
  "software": {
    "python_version": "3.12.3",
    "dualsphysics_version": "5.2.1",
    "dflowfm_version": "2024.03",
    "git_commit": "abc123"
  },
  "dem": {
    "source": "Copernicus DEM GLO-30",
    "version": "2023-01",
    "resolution_m": 30.0,
    "file_hash": "sha256:...",
    "provenance": "REPORTED"
  },
  "physical_assumptions": {
    "manning_n": {
      "value": 0.042,
      "provenance": "ASSUMED",
      "note": "Representative Himalayan gorge value"
    },
    "breach_model": {
      "value": "froehlich_2008",
      "provenance": "MODELLED"
    }
  },
  "provenance_map": {
    "dam_height_m": {"level": "REPORTED", "source": "THDC India Limited"},
    "reservoir_volume_m3": {"level": "REPORTED", "source": "THDC India Limited"},
    "manning_n": {"level": "ASSUMED", "source": "analyst_input"},
    "flood_depth_grid": {"level": "MODELLED", "source": "Delft3D FM 2024.03"},
    "exposed_population": {"level": "DERIVED", "source": "WorldPop + Delft3D extent"}
  },
  "artifact_uris": {
    "breach_hydrograph": "hydrology/breach_hydrograph.json",
    "sph_output": "sph/Part_0000/",
    "coupling_tim": "coupling/discharge_boundary.tim",
    "delft3d_map": "delft3d/FloodSim_map.nc",
    "hazard_geojson": "exports/hazard_zones.geojson"
  }
}
```

## Input File Hashing

All input files referenced in the manifest are SHA256-hashed at run start.
This ensures the run is fully reproducible.
