# LISFLOOD-FP Installation Report
## Source Provenance
- Repository: https://github.com/taytay-77/LISFLOOD-FP-8.1
- Version: 8.1.0 (float)
- Date Cloned: 2026-09-02

## Execution Platform
- Host: macOS Apple M4 arm64
- Container: Ubuntu 22.04 (linux/arm64 native execution)
- Dependencies: cmake, g++, make, libnuma-dev, libnetcdf-dev, libgomp1

## Build Process
- Toolchain: GCC 11.4.0, CMake 3.22.1
- Build Type: Release
- Architecture: arm64
- Commands: `cmake -S . -B build -DCMAKE_BUILD_TYPE=Release`, `cmake --build build -j 4`
- Status: Build successful, compiled to `LISFLOOD-FP-8.1/build/lisflood`.

## Official Test Case: T001_buscot
- Case Details: Real river test case using a boundary condition hydrograph
- Inputs: `buscot.par` (Parameter file), `buscot.dem.ascii` (DEM), `buscot.bdy` (Boundary file)
- Outputs generated: depth files (`.wd`), maximum depths (`.max`), mass balance logs (`.mass`)
- Run Status: SUCCESS
- Numerical QA: No NaNs, no Infs observed in mass balance. Time steps reached 100000.0 successfully.
