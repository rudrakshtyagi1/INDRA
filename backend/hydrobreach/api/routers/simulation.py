"""
HydroBreach API - Simulation Router
Handles launching and retrieving SPH, Delft3D / 2D SWE, and Dual comparison runs.
"""

import uuid
import time
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from hydrobreach.models.breach_mechanics import BreachMechanicsEngine, DamBreachInput
from hydrobreach.models.sph_engine.sph_solver import SPHHydroSolver, SPHSimulationConfig
from hydrobreach.models.delft3d_engine.delft3d_adapter import Delft3DHydroSolver, Delft3DModelConfig
from hydrobreach.models.scenario_comparator.comparison import ScenarioComparator
from hydrobreach.models.loss_damage.damage_estimator import LossAndDamageEngine
from hydrobreach.data.preset_scenarios import get_preset_by_id

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

# In-memory store for simulation results
SIMULATION_STORE: Dict[str, Dict[str, Any]] = {}


class RunSimulationRequest(BaseModel):
    preset_id: Optional[str] = None
    custom_params: Optional[Dict[str, Any]] = None
    solver_type: str = Field(default="dual", description="sph, delft3d, or dual")
    breach_model: str = Field(default="auto")


@router.post("/run")
async def run_simulation(req: RunSimulationRequest):
    """
    Executes hydrodynamic simulation for selected dam and solver.
    """
    # 1. Resolve Scenario Parameters
    if req.preset_id:
        preset = get_preset_by_id(req.preset_id)
        if not preset:
            raise HTTPException(status_code=404, detail=f"Preset {req.preset_id} not found.")
        params = dict(preset)
    elif req.custom_params:
        params = req.custom_params
    else:
        # Default to Rishi Ganga 2021
        preset = get_preset_by_id("rishi_ganga_2021")
        params = dict(preset)

    # 2. Calculate Breach Hydrograph
    breach_inp = DamBreachInput(
        dam_name=params.get("name", "Dam Break Simulation"),
        dam_type=params.get("dam_type", "earthen"),
        dam_height_m=params.get("dam_height_m", 45.0),
        reservoir_volume_m3=params.get("reservoir_volume_m3", 5e6),
        hydraulic_head_m=params.get("hydraulic_head_m", 40.0),
        crest_length_m=params.get("crest_length_m", 200.0),
        breach_mode=params.get("breach_mode", "overtopping")
    )
    breach_res = BreachMechanicsEngine.evaluate(breach_inp, model_type=req.breach_model)

    hydro_times = breach_res.breach_hydrograph_time_hrs
    hydro_flows = breach_res.breach_hydrograph_discharge_m3s

    run_id = f"sim_{uuid.uuid4().hex[:10]}"
    t_start = time.time()

    sph_res = None
    delft_res = None
    comparison_res = None

    # 3. Run Solvers based on user request
    if req.solver_type in ("sph", "dual", "coupled"):
        sph_solver = SPHHydroSolver()
        sph_res = sph_solver.run_simulation(
            scenario_params=params,
            hydrograph_times=hydro_times,
            hydrograph_discharges=hydro_flows
        )

    if req.solver_type == "coupled" and sph_res:
        # Pass SPH boundary hydrograph into Delft3D far-field solver
        coupled_h = sph_res.get("coupling_hydrograph", {})
        c_times = [t / 60.0 for t in coupled_h.get("time_min", hydro_times)]
        c_flows = coupled_h.get("discharge_m3s", hydro_flows)
        delft_solver = Delft3DHydroSolver()
        delft_res = delft_solver.run_simulation(
            scenario_params=params,
            hydrograph_times=c_times if c_times else hydro_times,
            hydrograph_discharges=c_flows if c_flows else hydro_flows
        )
    elif req.solver_type in ("delft3d", "dual"):
        delft_solver = Delft3DHydroSolver()
        delft_res = delft_solver.run_simulation(
            scenario_params=params,
            hydrograph_times=hydro_times,
            hydrograph_discharges=hydro_flows
        )

    if req.solver_type in ("dual", "coupled") and sph_res and delft_res:
        comparison_res = ScenarioComparator.compare_runs(sph_res, delft_res)

    # 4. Compute Loss & Damage Assessment
    # Determine primary peak values
    primary_summary = (sph_res or delft_res)["summary"]
    damage_assessment = LossAndDamageEngine.evaluate_scenario_damage(
        scenario_params=params,
        max_inundated_area_km2=primary_summary["max_inundated_area_km2"],
        peak_velocity_ms=primary_summary["peak_surge_velocity_ms"],
        max_depth_m=params.get("dam_height_m", 35.0) * 0.4,
        valley_type=params.get("valley_type", "mountain_gorge")
    )

    elapsed_s = round(time.time() - t_start, 2)

    result_payload = {
        "run_id": run_id,
        "scenario_id": req.preset_id,
        "scenario_params": params,
        "status": "COMPLETED_ADAPTER",
        "solver_type": req.solver_type,
        "breach_mechanics": breach_res.model_dump(),
        "sph_result": sph_res,
        "delft3d_result": delft_res,
        "comparison_result": comparison_res,
        "damage_assessment": damage_assessment,
        "provenance": {
            "level": "MODELLED",
            "source": f"HydroBreach Physics Engine ({req.solver_type})",
            "scenario_id": req.preset_id,
            "run_id": run_id,
        },
        "execution_time_seconds": elapsed_s,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    SIMULATION_STORE[run_id] = result_payload
    return result_payload


@router.get("/runs/{run_id}")
async def get_simulation_run(run_id: str):
    """Retrieves cached simulation results for a given run ID."""
    if run_id not in SIMULATION_STORE:
        raise HTTPException(status_code=404, detail=f"Simulation run {run_id} not found.")
    return SIMULATION_STORE[run_id]


@router.get("/recent-runs")
async def list_recent_runs():
    """Lists summary of all executed simulation runs."""
    summaries = []
    for rid, run in SIMULATION_STORE.items():
        summaries.append({
            "run_id": rid,
            "scenario_name": run.get("scenario_params", {}).get("name", "Custom Run"),
            "solver_type": run.get("solver_type"),
            "execution_time_s": run.get("execution_time_seconds"),
            "created_at": run.get("created_at")
        })
    return {"runs": summaries}
