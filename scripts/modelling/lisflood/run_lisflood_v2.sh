#!/bin/bash
set -e
apt-get update
apt-get install -y libgomp1 libnuma1 libnetcdf19 time
cd /workspace/data/processed/tehri_simulations/lisflood_fp/config
# Run LISFLOOD-FP
/usr/bin/time -v /workspace/data/processed/tehri_simulations/lisflood_fp/setup/LISFLOOD-FP-8.1/build/lisflood tehri_downstream_coarse_v2.par > ../outputs/v2_boundary_corrected/qa/solver_execution_log.txt 2>&1
