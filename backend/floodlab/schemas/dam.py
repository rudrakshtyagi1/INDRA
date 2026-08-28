"""
Dam schemas.
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class DamBase(BaseModel):
    name: str = Field(..., description="Name of the dam")
    river: str = Field(..., description="River name")
    state: str = Field(..., description="State or province")
    country: str = Field(default="India")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    dam_type: str = Field(default="rockfill_earthfill_composite")
    structural_height_m: float = Field(..., gt=0)
    hydraulic_head_m: float = Field(..., gt=0)
    reservoir_volume_m3: float = Field(..., gt=0)
    crest_length_m: Optional[float] = None
    full_reservoir_level_msl: Optional[float] = None
    crest_elevation_msl: Optional[float] = None
    river_bed_elevation_msl: Optional[float] = None
    installed_capacity_mw: Optional[float] = None
    operator: Optional[str] = None
    provenance_map: Optional[Dict[str, Any]] = None


class DamCreate(DamBase):
    pass


class DamUpdate(BaseModel):
    name: Optional[str] = None
    river: Optional[str] = None
    state: Optional[str] = None
    structural_height_m: Optional[float] = None
    hydraulic_head_m: Optional[float] = None
    reservoir_volume_m3: Optional[float] = None
    operator: Optional[str] = None


class DamRead(DamBase):
    id: str

    model_config = {"from_attributes": True}
