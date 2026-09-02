from datetime import datetime, timezone
from typing import Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class SourceType(str, Enum):
    ENGINEERED_DAM_BREAK = "ENGINEERED_DAM_BREAK"
    NATURAL_RIVER_BLOCKAGE = "NATURAL_RIVER_BLOCKAGE"
    CONTROLLED_RELEASE = "CONTROLLED_RELEASE"

class RunStatus(str, Enum):
    DRAFT = "DRAFT"
    VALIDATING = "VALIDATING"
    READY = "READY"
    RUNNING = "RUNNING"
    POSTPROCESSING = "POSTPROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Scenario(BaseModel):
    scenario_id: str
    name: str
    source_type: SourceType
    river_dam_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    input_configuration: Dict[str, Any] = Field(default_factory=dict)
    provenance: str

class Run(BaseModel):
    run_id: str
    scenario_id: str
    status: RunStatus
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    solver_configuration: Dict[str, Any] = Field(default_factory=dict)
    input_paths: Dict[str, str] = Field(default_factory=dict)
    output_paths: Dict[str, str] = Field(default_factory=dict)
    execution_trace: Dict[str, Any] = Field(default_factory=dict)
    qa_status: str = "PENDING"
    error_message: Optional[str] = None
