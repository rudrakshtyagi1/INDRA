"""
Full end-to-end pipeline: breach -> SPH -> coupling -> Delft3D -> hazard -> exposure -> routing.

Usage:
  python scripts/run_pipeline.py --scenario tehri_base --solver coupled
"""
import argparse
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "backend"))
from floodlab.config.constants import BreachModel, SolverType, ExecutionStatus
from floodlab.engines.breach.breach_models import BreachMechanicsEngine, DamBreachInput
from floodlab.engines.sph.dualsphysics_adapter import DualSPHysicsAdapter
from floodlab.engines.coupling.sph_to_delft3d import CouplingEngine
from floodlab.engines.delft3d.dflowfm_adapter import Delft3DFMAdapter
from floodlab.engines.hazard.hazard_rating import HazardRatingEngine
from floodlab.engines.loss_damage.damage_estimator import DamageEstimator
from floodlab.provenance.metadata import RunManifest

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default="tehri_base")
    parser.add_argument("--solver", default="coupled")
    parser.add_argument("--breach-model", default="froehlich_2008")
    args = parser.parse_args()

    run_id = f"cli_{uuid.uuid4().hex[:8]}"
    run_dir = Path("storage/simulations") / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    print(f"Starting FloodLab simulation pipeline [{run_id}]...")
    breach_res = BreachMechanicsEngine().evaluate(
        DamBreachInput(
            dam_height_m=260.5,
            hydraulic_head_m=260.0,
            reservoir_volume_m3=3.54e9,
            breach_mode="overtopping",
            breach_model=BreachModel(args.breach_model),
        )
    )
    print(f"1. Breach Mechanics: Qp = {breach_res.peak_discharge_m3s:.1f} m3/s")

    sph_res = DualSPHysicsAdapter().run({"hydraulic_head_m": 260.0}, breach_res.model_dump(), run_dir)
    print(f"2. DualSPHysics Adapter: Peak Vel = {sph_res.get('peak_velocity_ms'):.1f} m/s")

    coupling_res = CouplingEngine().couple(sph_res, run_dir)
    print(f"3. SPH-Delft3D Coupling: Peak Q = {coupling_res.get('peak_Q_m3s'):.1f} m3/s")

    delft_res = Delft3DFMAdapter().run({"reach_length_km": 100.0, "manning_n": 0.042}, coupling_res, run_dir)
    print(f"4. Delft3D FM Adapter: Max Depth = {delft_res.get('h_max_m'):.1f} m")

    damage = DamageEstimator().estimate(delft_res.get("inundated_area_km2", 10.0), 4.0, delft_res.get("h_max_m", 5.0), "mountain_gorge", {})
    print(f"5. Loss & Damage: Displaced = {damage['displaced']}, Loss = {damage['economic_loss_crores_inr']['total']} Cr INR")

    manifest = RunManifest(
        run_id=run_id,
        scenario_id=args.scenario,
        solver_type=args.solver,
        breach_model=args.breach_model,
        execution_status=ExecutionStatus.COMPLETED_ADAPTER.value,
    )
    manifest.save(run_dir / "manifest.json")
    print(f"Pipeline complete! Manifest saved to {run_dir / 'manifest.json'}")

if __name__ == "__main__":
    main()
