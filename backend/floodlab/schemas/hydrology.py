"""
Hydrology schemas.
"""
from typing import List
from pydantic import BaseModel, Field


class HydrologyInput(BaseModel):
    catchment_area_km2: float = Field(..., gt=0, description="Catchment area [km²]")
    curve_number_cn: float = Field(..., ge=1, le=100, description="SCS Curve Number")
    rainfall_24h_mm: float = Field(..., ge=0, description="24-hour storm rainfall [mm]")
    time_of_concentration_hrs: float = Field(..., gt=0, description="Time of concentration [hrs]")
    antecedent_moisture_condition: int = Field(default=2, ge=1, le=3)
    base_flow_m3s: float = Field(default=0.0, ge=0)
    ia_coefficient: float = Field(default=0.2)


class HydrologyResult(BaseModel):
    runoff_depth_mm: float
    peak_inflow_m3s: float
    time_to_peak_hrs: float
    time_series_hrs: List[float]
    inflow_hydrograph_m3s: List[float]
    provenance_level: str = "MODELLED"
    method: str = "SCS-CN + NRCS UH"

    model_config = {"protected_namespaces": ()}
