#!/bin/bash
echo "Waiting for PartFluid_0040.vtk to be created..."
while [ ! -f data/processed/tehri_simulations/dualsphysics/outputs/vtk/PartFluid_0040.vtk ]; do
  sleep 5
done
echo "Simulation VTK generated! Running extraction script..."
python3 extract_checkpoints.py
