"""
HydroBreach API - Hydrology Router
Endpoints for SCS-CN rainfall-runoff estimation and catchment hydrograph routing.
"""

from fastapi import APIRouter
from hydrobreach.models.hydrology.hydrology_engine import HydrologyEngine, HydrologyInput, HydrologyResult

router = APIRouter(prefix="/api/hydrology", tags=["Hydrology"])


@router.post("/calculate", response_model=HydrologyResult)
async def calculate_hydrology(inp: HydrologyInput):
    """
    Calculates catchment SCS-CN rainfall-runoff depth, inflow hydrograph, and Tehri reservoir level rise.
    """
    return HydrologyEngine.calculate_scs_cn_runoff(inp)
