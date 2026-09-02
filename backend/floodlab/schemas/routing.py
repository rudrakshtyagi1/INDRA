"""
Routing schemas.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class EvacuationRequest(BaseModel):
    village_coords: List[Dict[str, Any]]
    safe_zones: Optional[List[Dict[str, Any]]] = None
    flood_arrival_times: Optional[Dict[str, float]] = None
    agency_thresholds: Optional[Dict[str, float]] = None


class EvacuationRoute(BaseModel):
    village_id: str
    village_name: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lon: Optional[float] = None
    destination_id: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lon: Optional[float] = None
    distance_km: Optional[float] = None
    travel_time_min: Optional[float] = None
    lead_time_available_min: Optional[float] = None
    status: str
    path_coords: Optional[List[List[float]]] = None


class RescueRequest(BaseModel):
    ndrf_base: Dict[str, Any]
    target_settlements: List[Dict[str, Any]]
    flood_arrival_times: Optional[Dict[str, float]] = None
    agency_thresholds: Optional[Dict[str, float]] = None


class RescueRoute(BaseModel):
    settlement_id: str
    settlement_name: Optional[str] = None
    ndrf_base_lat: Optional[float] = None
    ndrf_base_lon: Optional[float] = None
    target_lat: Optional[float] = None
    target_lon: Optional[float] = None
    distance_km: Optional[float] = None
    travel_time_min: Optional[float] = None
    flood_arrival_min: Optional[float] = None
    traversability_note: Optional[str] = None
    path_coords: Optional[List[List[float]]] = None
