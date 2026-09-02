"""Exposure assessment endpoints."""
from fastapi import APIRouter

router = APIRouter()


@router.post("/evaluate")
async def evaluate_exposure(body: dict):
    from floodlab.engines.loss_damage.damage_estimator import DamageEstimator

    engine = DamageEstimator()
    result = engine.estimate(
        inundated_area_km2=body.get("inundated_area_km2", 10.0),
        peak_velocity_ms=body.get("peak_velocity_ms", 3.0),
        max_depth_m=body.get("max_depth_m", 4.0),
        valley_type=body.get("valley_type", "mountain_gorge"),
        scenario_params=body,
    )
    return result
