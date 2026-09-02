"""Schemas for the Google Earth Engine / Sentinel-1 observation workflow."""
from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class SARAnalysisRequest(BaseModel):
    """Request for bitemporal Sentinel-1 surface-water change detection."""

    bbox: list[float] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="[min_lon, min_lat, max_lon, max_lat] in EPSG:4326",
    )
    pre_date: date
    post_date: date
    window_days: int = Field(default=12, ge=3, le=45)
    polarization: Literal["VV", "VH"] = "VV"
    orbit_pass: Optional[Literal["ASCENDING", "DESCENDING"]] = None
    exclude_permanent_water: bool = True
    post_water_threshold_db: float = Field(default=-14.0, ge=-30.0, le=-5.0)
    min_patch_area_m2: float = Field(default=900.0, ge=100.0, le=100000.0)

    @field_validator("bbox")
    @classmethod
    def validate_bbox(cls, value: list[float]) -> list[float]:
        min_lon, min_lat, max_lon, max_lat = value
        if not (-180 <= min_lon < max_lon <= 180):
            raise ValueError("bbox longitudes must satisfy -180 <= min_lon < max_lon <= 180")
        if not (-90 <= min_lat < max_lat <= 90):
            raise ValueError("bbox latitudes must satisfy -90 <= min_lat < max_lat <= 90")
        # Keep on-demand processing bounded. This is not a continental batch endpoint.
        if (max_lon - min_lon) > 3.0 or (max_lat - min_lat) > 3.0:
            raise ValueError("bbox is too large for on-demand analysis; maximum span is 3 degrees per axis")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.pre_date >= self.post_date:
            raise ValueError("pre_date must be earlier than post_date")
        return self


class ModelComparisonRequest(BaseModel):
    analysis_id: str = Field(..., min_length=8, max_length=128)
    run_id: str = Field(..., min_length=1, max_length=128)
    purpose: Literal["context", "historical_validation"] = "context"
