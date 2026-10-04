#!/bin/bash
set -e
apt-get update
apt-get install -y libgomp1 libnuma1 libnetcdf19 time
cd /workspace/data/processed/tehri_simulations/lisflood_fp/config
# Run LISFLOOD-FP
/usr/bin/time -v /workspace/data/processed/tehri_simulations/lisflood_fp/setup/LISFLOOD-FP-8.1/build/lisflood tehri_downstream_v3_geometry_corrected.par > ../outputs/v3_geometry_corrected/qa/solver_execution_log.txt 2>&1
