#!/bin/bash
set -e
apt-get update
apt-get install -y cmake g++ make libnuma-dev libnetcdf-dev
cd /workspace/LISFLOOD-FP-8.1
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j 4
