# DualSPHysics Installation Report

## Host Environment
- **OS**: macOS (Darwin 25.3.0)
- **Architecture**: arm64
- **CPU**: Apple M4
- **RAM**: 16 GB
- **GPU**: Apple M4
- **CUDA Availability**: No
- **Docker Availability**: Client installed, but daemon is not running.
- **Virtualization Availability**: Yes (Apple Silicon Hypervisor)

## Preferred Version
- DualSPHysics v5.4.x

## Installation Process & Findings
- **macOS Rule Triggered**: DualSPHysics does not provide native precompiled macOS binaries. 
- Attempted to compile DualSPHysics CPU version from source (v5.4.x branch on GitHub).
- Compilation failed due to missing `omp.h` (OpenMP) support in the native Apple Clang compiler.
- According to the MACOS RULE: "DO NOT spend excessive time forcing an unsupported native installation."
- Therefore, native compilation was aborted.

## Binaries
- **DualSPHysics5.4**: NOT AVAILABLE
- **GenCase**: NOT AVAILABLE
- **PartVTK**: NOT AVAILABLE

## Next Steps
To run DualSPHysics integration tests, it is recommended to use:
A. Linux VM/environment
B. remote Linux machine
C. cloud Linux instance
