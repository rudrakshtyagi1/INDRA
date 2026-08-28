"""Scenario registry and breach calculation endpoints."""
import os
import yaml
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from hydrobreach.data.preset_scenarios import INDIAN_PRESET_SCENARIOS, get_preset_by_id
from hydrobreach.models.breach_mechanics import BreachMechanicsEngine, DamBreachInput
from hydrobreach.models.geospatial_etl.raster_processor import DEMProcessor

router = APIRouter()

SCENARIO_DIR = Path(__file__).parents[4] / "configs" / "scenarios"


class CustomBreachRequest(BaseModel):
    dam_name: str = Field(..., description="Name of dam or river blockage")
    dam_type: str = Field(default="rockfill")
    dam_height_m: float = Field(..., ge=1.0)
    reservoir_volume_m3: float = Field(..., ge=100.0)
    hydraulic_head_m: float = Field(..., ge=0.5)
    crest_length_m: Optional[float] = None
    breach_mode: str = Field(default="overtopping")
    material_cohesion: str = Field(default="medium")
    model_override: str = Field(default="auto")


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


@router.get("")
async def list_scenarios():
    return {"scenarios": INDIAN_PRESET_SCENARIOS}


@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str):
    preset = get_preset_by_id(scenario_id)
    if preset:
        return preset
    if SCENARIO_DIR.exists():
        for f in SCENARIO_DIR.glob("*.yaml"):
            with open(f) as fh:
                data = yaml.safe_load(fh)
            if data.get("scenario_id") == scenario_id or f.stem == scenario_id:
                return data
    raise HTTPException(404, f"Scenario {scenario_id} not found")


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
        material_cohesion=req.material_cohesion,
    )
    result = BreachMechanicsEngine.evaluate(inp, model_type=req.model_override)
    return result


@router.get("/dem-profile")
async def get_dem_profile(
    reach_length_km: float = Query(25.0, ge=5.0, le=150.0),
    upstream_elev_m: float = Query(2200.0, ge=100.0),
    downstream_elev_m: float = Query(1100.0, ge=0.0),
):
    """Generates DEM cross sections and thalweg profile for the river valley reach."""
    return DEMProcessor.generate_synthetic_river_dem(
        reach_length_km=reach_length_km,
        upstream_elev_m=upstream_elev_m,
        downstream_elev_m=downstream_elev_m,
    )
