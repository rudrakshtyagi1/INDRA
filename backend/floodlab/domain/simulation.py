"""
Simulation domain model.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Optional
from floodlab.config.constants import ExecutionStatus, SolverType, BreachModel


@dataclass
class SimulationDomain:
    run_id: str
    scenario_id: str
    solver_type: SolverType
    breach_model: BreachModel
    status: ExecutionStatus = ExecutionStatus.PENDING
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    dualsphysics_version: Optional[str] = None
    dflowfm_version: Optional[str] = None
    python_version: str = "3.12"
    git_commit: Optional[str] = None
    artifact_uris: Dict[str, str] = field(default_factory=dict)
