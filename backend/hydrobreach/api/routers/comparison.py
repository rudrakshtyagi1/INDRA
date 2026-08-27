"""
HydroBreach API - Scenario Comparison Router
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pydantic import BaseModel

from hydrobreach.models.scenario_comparator.comparison import ScenarioComparator
from hydrobreach.api.routers.simulation import SIMULATION_STORE

router = APIRouter(prefix="/api/comparison", tags=["Comparison"])


class ComparisonRequest(BaseModel):
    run_id: str
    threshold_depth_m: float = 0.3


@router.post("/evaluate")
async def evaluate_comparison(req: ComparisonRequest):
    """
    Evaluates co-registration metrics (CSI, POD, FAR, difference rasters) for an existing simulation run.
    """
    if req.run_id not in SIMULATION_STORE:
        raise HTTPException(status_code=404, detail=f"Run {req.run_id} not found.")

    run = SIMULATION_STORE[req.run_id]
    sph_res = run.get("sph_result")
    delft_res = run.get("delft3d_result")

    if not sph_res or not delft_res:
        raise HTTPException(status_code=400, detail="Comparison requires both SPH and Delft3D results. Run with solver_type='dual'.")

    comp = ScenarioComparator.compare_runs(sph_res, delft_res, threshold_depth_m=req.threshold_depth_m)
    run["comparison_result"] = comp
    return comp
