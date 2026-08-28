"""Uncertainty ensemble endpoints."""
from fastapi import APIRouter
from hydrobreach.models.uncertainty.uncertainty_engine import UncertaintyEngine, UncertaintyInput

router = APIRouter()


@router.post("/run")
@router.post("/ensemble")
async def run_uncertainty(body: dict):
    inp = UncertaintyInput(
        preset_id=body.get("preset_id") or body.get("scenario_id") or "tehri_dam_bhagirathi",
        ensemble_size=int(body.get("ensemble_size", 20)),
        variation_breach_width_pct=float(body.get("variation_breach_width_pct", 25.0)),
        variation_formation_time_pct=float(body.get("variation_formation_time_pct", 30.0)),
        variation_reservoir_level_m=float(body.get("variation_reservoir_level_m", 5.0)),
        variation_manning_n_pct=float(body.get("variation_manning_n_pct", 20.0)),
    )
    result = UncertaintyEngine.run_ensemble(inp)
    return result.model_dump()
