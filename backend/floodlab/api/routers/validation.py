"""Validation endpoints."""
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ValidationRequest(BaseModel):
    run_id: str
    event_id: Optional[str] = None


@router.post("/verify")
async def verify_solver(req: ValidationRequest):
    return {
        "run_id": req.run_id,
        "mass_conservation": {"passed": True, "note": "Stub verification"},
        "ritter_comparison": None,
    }


@router.post("/compare")
async def compare_models(req: ValidationRequest):
    from floodlab.validation.metrics import ModelComparison

    mc = ModelComparison()
    return mc.compare_sph_delft3d({}, {})


@router.post("/observe")
async def observation_validation(req: ValidationRequest):
    from floodlab.validation.metrics import ObservationValidator

    v = ObservationValidator()
    return v.validate({}, observed_event=None)
