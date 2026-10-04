#!/bin/bash
set -e
apt-get update
apt-get install -y libgomp1 libnuma1 libnetcdf19
cd /workspace/LISFLOOD-FP-8.1/testing/T001_buscot
/workspace/LISFLOOD-FP-8.1/build/lisflood buscot.par
