"""
HydroBreach API - Google Earth Engine & Sentinel-1 SAR Router
"""

from fastapi import APIRouter, Query
from typing import Dict, Any, List
from pydantic import BaseModel, Field

from hydrobreach.models.gee_monitor.gee_service import GEESentinel1Monitor

router = APIRouter(prefix="/api/gee", tags=["Google Earth Engine SAR"])


class SARAnalysisRequest(BaseModel):
    bbox: List[float] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    pre_event_date: str = Field(default="2026-08-10")
    post_event_date: str = Field(default="2026-08-24")
    polarization: str = Field(default="VV")


@router.get("/alerts")
async def get_active_alerts():
    """Returns active real-time satellite surveillance alerts."""
    alerts = GEESentinel1Monitor.get_active_alerts()
    return {"alerts": alerts, "total_active_alerts": len(alerts)}


@router.get("/zones")
async def list_monitoring_zones():
    """Returns all pre-configured Himalayan and river surveillance zones."""
    return {"zones": GEESentinel1Monitor.SURVEILLANCE_ZONES}


@router.post("/analyze")
async def run_sar_analysis(req: SARAnalysisRequest):
    """
    Triggers automated Sentinel-1 SAR change detection and Otsu water thresholding.
    """
    result = GEESentinel1Monitor.run_on_demand_sar_analysis(
        bbox=req.bbox,
        pre_date=req.pre_event_date,
        post_date=req.post_event_date,
        polarization=req.polarization
    )
    return result
