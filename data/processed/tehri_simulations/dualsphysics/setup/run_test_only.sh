#!/bin/bash
set -e
apt-get update >/dev/null
apt-get install -y libgomp1 >/dev/null

cd /workspace/FloodLab/data/processed/tehri_simulations/dualsphysics/setup/DualSPHysics/examples/main/01_DamBreak
rm -rf CaseDambreak_out

echo "Running GenCase..."
export OMP_NUM_THREADS=4
export LD_LIBRARY_PATH=$PWD/../../../bin/linux:$LD_LIBRARY_PATH

../../../bin/linux/GenCase_linux64 CaseDambreak_Def CaseDambreak_out/CaseDambreak

echo "Running DualSPHysics CPU..."
../../../bin/linux/DualSPHysics5.4CPU_linux64 CaseDambreak_out/CaseDambreak CaseDambreak_out

echo "Running PartVTK..."
../../../bin/linux/PartVTK_linux64 -dirin CaseDambreak_out/data -filexml CaseDambreak_out/CaseDambreak.xml -savevtk CaseDambreak_out/dirvtk/PartFluid -onlytype:-all,fluid

echo "Done!"
