#!/bin/bash
set -e

echo "Starting Docker environment setup..."
apt-get update
apt-get install -y git wget ca-certificates build-essential libgomp1 cmake jq

cd /workspace/FloodLab/data/processed/tehri_simulations/dualsphysics/setup/

if [ ! -d "DualSPHysics" ]; then
    git clone --depth 1 https://github.com/DualSPHysics/DualSPHysics.git
fi

cd DualSPHysics

echo "Compiling CPU version of DualSPHysics..."
cd src/source
make -f Makefile_cpu -j$(nproc)
cd ../../

# The compiled binary is usually placed in bin/linux and named DualSPHysics5.4CPU_linux64
chmod +x bin/linux/* || true
ls -la bin/linux/

echo "Testing binaries..."
./bin/linux/GenCase_linux64 -h > /dev/null || true
./bin/linux/DualSPHysics5.4CPU_linux64 -h > /dev/null || true

cd examples/main/01_DamBreak
chmod +x *.sh || true
echo "Running the example..."

rm -rf out
./xCaseDambreak_linux64_CPU.sh

echo "Done running test!"
