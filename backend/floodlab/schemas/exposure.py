"""
Exposure schemas.
"""
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ExposureInput(BaseModel):
    run_id: Optional[str] = None
    inundated_area_km2: float = Field(default=10.0, ge=0)
    peak_velocity_ms: float = Field(default=3.0, ge=0)
    max_depth_m: float = Field(default=4.0, ge=0)
    valley_type: str = "mountain_gorge"


class EconomicLossBreakdown(BaseModel):
    residential: float
    agricultural: float
    commercial: float
    infrastructure: float
    total: float


class HADRResources(BaseModel):
    ndrf_teams: int
    boats: int
    shelters: int
    food_packets: int


class ExposureResult(BaseModel):
    population_at_risk: int
    displaced: int
    buildings_exposed: int
    buildings_destroyed: int
    buildings_submerged: int
    agricultural_ha: float
    economic_loss_crores_inr: EconomicLossBreakdown
    hadr_resources: HADRResources
    inundated_area_km2: float
    max_depth_m: float
    peak_velocity_ms: float
    provenance: Dict[str, Any]
