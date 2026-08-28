"""
Standalone Delft3D FM run script.

Usage:
  python scripts/run_delft3d.py --scenario tehri_base --coupling-run-id sph_test_001
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "backend"))
from floodlab.engines.delft3d.dflowfm_adapter import Delft3DFMAdapter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default="tehri_base")
    parser.add_argument("--run-id", default="delft_test_001")
    args = parser.parse_args()

    adapter = Delft3DFMAdapter()
    run_dir = Path("storage/simulations") / args.run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    res = adapter.run({"reach_length_km": 100.0}, {"peak_Q_m3s": 25000.0}, run_dir)
    print(f"Delft3D execution completed. Inundated area: {res.get('inundated_area_km2')} km2")

if __name__ == "__main__":
    main()
