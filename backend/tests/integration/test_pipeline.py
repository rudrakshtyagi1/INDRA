"""Full end-to-end simulation pipeline integration test."""
from floodlab.config.constants import BreachModel, SolverType
from floodlab.engines.breach.breach_models import BreachMechanicsEngine, DamBreachInput
from floodlab.engines.sph.dualsphysics_adapter import DualSPHysicsAdapter
from floodlab.engines.coupling.sph_to_delft3d import CouplingEngine
from floodlab.engines.delft3d.dflowfm_adapter import Delft3DFMAdapter
from floodlab.engines.hazard.hazard_rating import HazardRatingEngine
from floodlab.engines.loss_damage.damage_estimator import DamageEstimator
from floodlab.provenance.metadata import RunManifest


def test_full_pipeline(tmp_path):
    run_id = "test_pipeline_001"
    run_dir = tmp_path / run_id
    run_dir.mkdir()

    # 1. Breach
    breach_inp = DamBreachInput(
        dam_height_m=260.5,
        hydraulic_head_m=260.0,
        reservoir_volume_m3=3.54e9,
        breach_mode="overtopping",
        breach_model=BreachModel.FROEHLICH_2008,
    )
    breach_res = BreachMechanicsEngine().evaluate(breach_inp)

    # 2. SPH
    sph_res = DualSPHysicsAdapter().run(
        {"hydraulic_head_m": 260.0, "reservoir_volume_m3": 3.54e9},
        breach_res.model_dump(),
        run_dir,
    )

    # 3. Coupling
    coupling_res = CouplingEngine().couple(sph_res, run_dir)

    # 4. Delft3D
    delft_res = Delft3DFMAdapter().run(
        {"reach_length_km": 100.0, "manning_n": 0.042, "valley_type": "mountain_gorge"},
        coupling_res,
        run_dir,
    )

    # 5. Hazard & Loss
    hr = HazardRatingEngine().compute_hr(delft_res["h_max_m"], 4.0, "mountain_gorge")
    damage = DamageEstimator().estimate(
        delft_res["inundated_area_km2"], 4.0, delft_res["h_max_m"],
        "mountain_gorge", {"population_density_per_km2": 150.0},
    )

    # 6. Manifest
    manifest = RunManifest(
        run_id=run_id,
        scenario_id="tehri_base",
        solver_type=SolverType.COUPLED.value,
        breach_model=BreachModel.FROEHLICH_2008.value,
    )
    manifest.mark_complete(
        status=__import__("floodlab.config.constants", fromlist=["ExecutionStatus"]).ExecutionStatus.COMPLETED_ADAPTER
    )
    manifest.save(run_dir / "manifest.json")

    assert (run_dir / "manifest.json").exists()
    loaded_manifest = RunManifest.load(run_dir / "manifest.json")
    assert loaded_manifest.run_id == run_id
    assert damage["population_at_risk"] >= 0
