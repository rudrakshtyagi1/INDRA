# Delft3D / D-Flow FM Installation Report

**Status**: BLOCKED_BUILD_COMPLEXITY

## Environment
- Host: macOS Apple Silicon arm64 (M4)
- Container: ubuntu:22.04 linux/amd64
- Host Free Space: 35 GiB

## Repository
- URL: https://github.com/Deltares/Delft3D.git
- Commit: 534e9c7aba0741b138f18fc0f844839dab102848

## Evaluation
The official Delft3D CMake/Conan build system was evaluated. 
Attempting to pull the official pre-built dependency image (`containers.deltares.nl/delft3d-dev/delft3d-third-party-libs:oneapi-2024-ifx-release`) failed due to required Nexus private authentication (`authorization failed: no basic auth credentials`).

The alternative external open-source workflow (`run_conan.py initialize external` + `--build-dependencies`) requires building the entire third-party scientific ecosystem from source, including:
- Intel oneAPI Fortran Compiler (ifx)
- PETSc
- NetCDF-C & NetCDF-Fortran
- HDF5
- GDAL & PROJ
- Boost
- Eigen

Building this stack from source inside a Rosetta 2 emulated `linux/amd64` container on a 16GB macOS host is estimated to take multiple hours and excessive storage footprint. Per the compute safety limits, the build was aborted.

## External Dependency Note
Delft3D is treated as an optional external dependency and is not bundled into Git tracking. When available on an external Linux host, runs can be executed using the adapter in `backend/floodlab/engines/delft3d/`.
