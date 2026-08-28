"""
Standalone DualSPHysics run script.

Usage:
  python scripts/run_sph.py --scenario tehri_base --run-id test_001
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "backend"))
from floodlab.engines.sph.dualsphysics_adapter import DualSPHysicsAdapter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default="tehri_base")
    parser.add_argument("--run-id", default="sph_test_001")
    args = parser.parse_args()

    adapter = DualSPHysicsAdapter()
    run_dir = Path("storage/simulations") / args.run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    res = adapter.run({"hydraulic_head_m": 260.0}, {"peak_discharge_m3s": 25000.0}, run_dir)
    print(f"SPH execution completed. Peak velocity: {res.get('peak_velocity_ms')} m/s")

if __name__ == "__main__":
    main()
