"""
Uncertainty schemas.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class UncertaintyRequest(BaseModel):
    scenario_id: Optional[str] = None
    ensemble_size: int = Field(default=50, ge=5, le=500)
    breach_width_variation_pct: float = Field(default=25.0, ge=0, le=100)
    formation_time_variation_pct: float = Field(default=30.0, ge=0, le=100)
    head_variation_m: float = Field(default=5.0, ge=0)
    manning_variation_pct: float = Field(default=20.0, ge=0, le=100)


class StationUncertainty(BaseModel):
    station_id: str
    station_name: str
    arrival_p10_hrs: float
    arrival_p50_hrs: float
    arrival_p90_hrs: float
    depth_p10_m: float
    depth_p50_m: float
    depth_p90_m: float


class SensitivityRank(BaseModel):
    parameter: str
    correlation: float
    rank: int
    impact: str


class UncertaintyResult(BaseModel):
    ensemble_size: int
    peak_Q_p10_m3s: float
    peak_Q_p50_m3s: float
    peak_Q_p90_m3s: float
    stations: Optional[List[StationUncertainty]] = None
    sensitivity_rankings: Optional[List[SensitivityRank]] = None
    provenance: str = "DERIVED"
