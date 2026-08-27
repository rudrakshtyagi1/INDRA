"""
HydroBreach API - Uncertainty & Sensitivity Router
Endpoints for Monte Carlo ensemble simulations, arrival time confidence bounds, and parameter sensitivity rankings.
"""

from fastapi import APIRouter
from hydrobreach.models.uncertainty.uncertainty_engine import UncertaintyEngine, UncertaintyInput, UncertaintyResult

router = APIRouter(prefix="/api/uncertainty", tags=["Uncertainty"])


@router.post("/run-ensemble", response_model=UncertaintyResult)
async def run_uncertainty_ensemble(inp: UncertaintyInput):
    """
    Executes a Monte Carlo ensemble simulation to compute disaster prediction uncertainty bounds.
    """
    return UncertaintyEngine.run_ensemble(inp)
