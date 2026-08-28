"""
Scenario schemas.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DownstreamStationSchema(BaseModel):
    id: str
    name: str
    chainage_km: float
    landmark: Optional[str] = None


class ScenarioBase(BaseModel):
    scenario_id: str
    name: str
    dam_name: str
    river: str
    state: str
    country: str = "India"
    latitude: float
    longitude: float

    dam_type: str = "rockfill_earthfill_composite"
    breach_mode: str = "overtopping"
    structural_height_m: float
    hydraulic_head_m: float
    reservoir_volume_m3: float
    crest_length_m: Optional[float] = None
    full_reservoir_level_msl: Optional[float] = None
    crest_elevation_msl: Optional[float] = None
    river_bed_elevation_msl: Optional[float] = None
    installed_capacity_mw: Optional[float] = None
    operator: Optional[str] = None

    reach_length_km: float = 100.0
    valley_width_m: float = 450.0
    bed_slope: float = 0.0055
    valley_type: str = "mountain_gorge"
    manning_n: float = 0.042

    breach_model: str = "froehlich_2008"

    downstream_stations: List[DownstreamStationSchema] = Field(default_factory=list)
    observation_validation_status: str = "NOT_AVAILABLE"
    observation_validation_note: Optional[str] = None
    is_hypothetical: bool = True
    provenance_map: Optional[Dict[str, Any]] = None


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    breach_mode: Optional[str] = None
    breach_model: Optional[str] = None
    manning_n: Optional[float] = None


class ScenarioRead(ScenarioBase):
    id: Optional[str] = None

    model_config = {"from_attributes": True}
