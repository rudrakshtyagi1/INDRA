"""
HydroBreach API - Loss & Damage Router
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

from hydrobreach.models.loss_damage.damage_estimator import LossAndDamageEngine
from hydrobreach.api.routers.simulation import SIMULATION_STORE

router = APIRouter(prefix="/api/damage", tags=["Loss and Damage"])


class DamageEvaluationRequest(BaseModel):
    run_id: Optional[str] = None
    scenario_params: Optional[Dict[str, Any]] = None
    max_inundated_area_km2: float = Field(default=12.5, ge=0.1)
    peak_velocity_ms: float = Field(default=14.0, ge=0.0)
    max_depth_m: float = Field(default=8.5, ge=0.1)
    valley_type: str = Field(default="mountain_gorge")


@router.post("/evaluate")
async def evaluate_damage(req: DamageEvaluationRequest):
    """
    Calculates detailed loss and damage assessment and HADR emergency response logistics.
    """
    if req.run_id and req.run_id in SIMULATION_STORE:
        run = SIMULATION_STORE[req.run_id]
        params = run.get("scenario_params", {})
        summary = (run.get("sph_result") or run.get("delft3d_result") or {}).get("summary", {})
        max_area = summary.get("max_inundated_area_km2", req.max_inundated_area_km2)
        peak_v = summary.get("peak_surge_velocity_ms", req.peak_velocity_ms)
        max_d = params.get("dam_height_m", 35.0) * 0.4
        v_type = params.get("valley_type", req.valley_type)
    else:
        params = req.scenario_params or {"dam_name": "Custom Simulation", "reach_name": "Downstream Catchment"}
        max_area = req.max_inundated_area_km2
        peak_v = req.peak_velocity_ms
        max_d = req.max_depth_m
        v_type = req.valley_type

    res = LossAndDamageEngine.evaluate_scenario_damage(
        scenario_params=params,
        max_inundated_area_km2=max_area,
        peak_velocity_ms=peak_v,
        max_depth_m=max_d,
        valley_type=v_type
    )
    return res
