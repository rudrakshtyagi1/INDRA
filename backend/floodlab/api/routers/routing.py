"""Evacuation and rescue routing endpoints."""
from typing import Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class EvacuationRequest(BaseModel):
    village_coords: List[Dict]
    safe_zones: Optional[List[Dict]] = None
    flood_arrival_times: Optional[Dict[str, float]] = None
    agency_thresholds: Optional[Dict] = None


class RescueRequest(BaseModel):
    ndrf_base: Dict
    target_settlements: List[Dict]
    flood_arrival_times: Optional[Dict[str, float]] = None
    agency_thresholds: Optional[Dict] = None


@router.post("/evacuate")
async def plan_evacuation(req: EvacuationRequest):
    from floodlab.engines.routing.evacuation import EvacuationPlanner

    planner = EvacuationPlanner()
    return planner.plan(
        req.village_coords,
        req.safe_zones or [],
        req.flood_arrival_times or {},
        req.agency_thresholds,
    )


@router.post("/rescue")
async def plan_rescue(req: RescueRequest):
    from floodlab.engines.routing.evacuation import RescueRouteEngine

    engine = RescueRouteEngine()
    return engine.plan_rescue(
        req.ndrf_base,
        req.target_settlements,
        req.flood_arrival_times or {},
        req.agency_thresholds,
    )
