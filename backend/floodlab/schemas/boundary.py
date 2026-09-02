"""Schemas for generalized source-boundary hydrographs."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from floodlab.schemas.control import SourceType


class HydrographPoint(BaseModel):
    time_sec: float = Field(ge=0)
    discharge_m3s: float = Field(ge=0)


class BoundaryGenerateRequest(BaseModel):
    """Optional overrides for generating a scenario boundary hydrograph.

    Most parameters are normally taken from the scenario's input_configuration.
    Uploaded Q(t) arrays can be supplied here explicitly when required.
    """

    hydrograph_timestamps: Optional[List[float]] = None
    hydrograph_discharges: Optional[List[float]] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)


class BoundaryStatistics(BaseModel):
    peak_discharge_m3s: float
    time_to_peak_sec: float
    total_released_volume_m3: float
    duration_sec: float
    point_count: int


class BoundaryHydrograph(BaseModel):
    scenario_id: str
    source_type: SourceType
    provenance: str
    generation_method: str
    assumptions: List[str] = Field(default_factory=list)
    generated_at: datetime
    units: Dict[str, str] = Field(default_factory=lambda: {
        "time": "seconds",
        "discharge": "m3/s",
    })
    statistics: BoundaryStatistics
    hydrograph: List[HydrographPoint]
