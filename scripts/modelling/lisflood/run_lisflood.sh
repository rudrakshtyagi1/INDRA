#!/bin/bash
set -e
apt-get update
apt-get install -y libgomp1 libnuma1 libnetcdf19
cd /workspace/data/processed/tehri_simulations/lisflood_fp/config
# Run LISFLOOD-FP
/workspace/data/processed/tehri_simulations/lisflood_fp/setup/LISFLOOD-FP-8.1/build/lisflood tehri_downstream_coarse.par > ../qa/solver_execution_log.txt 2>&1
