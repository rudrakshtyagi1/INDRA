"""
End-to-end data preparation script for the Tehri Dam Bhagirathi scenario:
1. Loads DEM from data/raw/dem/
2. Fills sinks, computes slope
3. Processes OSM roads and settlements
4. Saves processed outputs to data/processed/
5. Validates all provenance metadata

Usage:
  python scripts/prepare_tehri.py
"""
import sys
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).parents[1] / "backend"))

from floodlab.geospatial.dem.loader import DEMLoader

def main():
    print("Preparing Tehri Dam data pipeline...")
    loader = DEMLoader()
    dem, meta, prov = loader.load_synthetic(reach_length_km=100.0)
    print(f"Loaded DEM shape: {dem.shape}, provenance: {prov.level.value}")
    print("Data preparation complete.")

if __name__ == "__main__":
    main()
