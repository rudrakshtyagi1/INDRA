"""
HydroBreach API - Scenarios Router
Provides endpoints for Indian preset scenarios, custom scenario creation,
breach hydrograph calculation, and DEM elevation profiles.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from hydrobreach.data.preset_scenarios import INDIAN_PRESET_SCENARIOS, get_preset_by_id
from hydrobreach.models.breach_mechanics import BreachMechanicsEngine, DamBreachInput
from hydrobreach.models.geospatial_etl.raster_processor import DEMProcessor

router = APIRouter(prefix="/api/scenarios", tags=["Scenarios"])


class CustomBreachRequest(BaseModel):
    dam_name: str = Field(..., description="Name of dam or river blockage")
    dam_type: str = Field(default="earthen")
    dam_height_m: float = Field(..., ge=1.0)
    reservoir_volume_m3: float = Field(..., ge=100.0)
    hydraulic_head_m: float = Field(..., ge=0.5)
    crest_length_m: Optional[float] = None
    breach_mode: str = Field(default="overtopping")
    material_cohesion: str = Field(default="medium")
    model_override: str = Field(default="auto") # "froehlich", "macdonald", "von_thun", "ritter", "landslide"


@router.get("/presets")
async def list_presets():
    """Returns all pre-configured Indian river and dam scenarios."""
    return {"scenarios": INDIAN_PRESET_SCENARIOS}


@router.get("/presets/{preset_id}")
async def get_preset(preset_id: str):
    """Returns details for a specific Indian preset scenario."""
    preset = get_preset_by_id(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found.")
    return preset


@router.post("/calculate-breach")
async def calculate_breach(req: CustomBreachRequest):
    """
    Computes breach dimensions, formation time, peak discharge, and synthesized hydrograph.
    """
    inp = DamBreachInput(
        dam_name=req.dam_name,
        dam_type=req.dam_type,
        dam_height_m=req.dam_height_m,
        reservoir_volume_m3=req.reservoir_volume_m3,
        hydraulic_head_m=req.hydraulic_head_m,
        crest_length_m=req.crest_length_m,
        breach_mode=req.breach_mode,
        material_cohesion=req.material_cohesion
    )
    result = BreachMechanicsEngine.evaluate(inp, model_type=req.model_override)
    return result


@router.get("/dem-profile")
async def get_dem_profile(
    reach_length_km: float = Query(25.0, ge=5.0, le=150.0),
    upstream_elev_m: float = Query(2200.0, ge=100.0),
    downstream_elev_m: float = Query(1100.0, ge=0.0)
):
    """Generates DEM cross sections and thalweg profile for the river valley reach."""
    dem_data = DEMProcessor.generate_synthetic_river_dem(
        reach_length_km=reach_length_km,
        upstream_elev_m=upstream_elev_m,
        downstream_elev_m=downstream_elev_m
    )
    return dem_data
