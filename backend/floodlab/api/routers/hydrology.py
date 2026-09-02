"""Hydrology calculation endpoint."""
from fastapi import APIRouter
from hydrobreach.models.hydrology.hydrology_engine import (
    HydrologyEngine as HydroBreachHydrology,
    HydrologyInput as HBInput,
)

router = APIRouter()


@router.post("/calculate")
async def calculate_hydrology(body: dict):
    inp = HBInput(
        catchment_area_km2=float(body.get("catchment_area_km2", 7500.0)),
        curve_number_cn=float(body.get("curve_number_cn", 78.0)),
        rainfall_24h_mm=float(body.get("rainfall_24h_mm", 180.0)),
        time_of_concentration_hrs=float(body.get("time_of_concentration_hrs", 6.5)),
        initial_reservoir_level_m=float(body.get("initial_reservoir_level_m", 825.0)),
        frl_m=float(body.get("frl_m", 830.0)),
        max_spillway_capacity_m3s=float(body.get("max_spillway_capacity_m3s", 15500.0)),
    )
    result = HydroBreachHydrology.calculate_scs_cn_runoff(inp)
    data = result.model_dump()
    # Add alias fields for floodlab schema compatibility
    data["runoff_depth_mm"] = data["total_runoff_depth_pe_mm"]
    data["peak_inflow_m3s"] = data["peak_inflow_discharge_m3s"]
    data["provenance_level"] = "MODELLED"
    return data
