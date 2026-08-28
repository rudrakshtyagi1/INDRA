"""
Breach schemas.
"""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from floodlab.config.constants import BreachModel


class BreachInput(BaseModel):
    dam_height_m: float = Field(..., gt=0)
    hydraulic_head_m: float = Field(..., gt=0)
    reservoir_volume_m3: float = Field(..., gt=0)
    breach_mode: str = Field(default="overtopping")
    breach_model: BreachModel = Field(default=BreachModel.FROEHLICH_2008)
    avg_breach_width_override_m: Optional[float] = None
    formation_time_override_hrs: Optional[float] = None

    model_config = {"protected_namespaces": ()}


class BreachResult(BaseModel):
    avg_breach_width_m: float
    side_slope_z: float
    formation_time_hrs: float
    peak_discharge_m3s: float
    time_to_peak_hrs: float
    hydrograph_times_hrs: List[float]
    hydrograph_flows_m3s: List[float]
    eroded_volume_m3: Optional[float] = None
    model_used: str
    provenance_map: Dict[str, str]

    model_config = {"protected_namespaces": ()}
