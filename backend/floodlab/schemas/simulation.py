"""
Simulation schemas.
"""
from typing import Any, Dict, Optional
from pydantic import BaseModel
from floodlab.config.constants import BreachModel, ExecutionStatus, SolverType


class RunSimulationRequest(BaseModel):
    scenario_id: Optional[str] = None
    solver_type: SolverType = SolverType.COUPLED
    breach_model: BreachModel = BreachModel.FROEHLICH_2008
    custom_params: Optional[Dict[str, Any]] = None

    model_config = {"protected_namespaces": ()}


class SimulationStatus(BaseModel):
    run_id: str
    status: ExecutionStatus
    progress_pct: Optional[float] = None
    message: Optional[str] = None
    elapsed_s: Optional[float] = None


class SimulationResult(BaseModel):
    run_id: str
    status: str
    breach_mechanics: Dict[str, Any]
    sph_summary: Dict[str, Any]
    coupling_summary: Dict[str, Any]
    delft3d_summary: Dict[str, Any]
    hazard_rating: float
    damage_assessment: Dict[str, Any]
    manifest_path: str
