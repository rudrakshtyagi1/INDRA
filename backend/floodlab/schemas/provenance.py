"""
Provenance schemas.
"""
from typing import Any, Dict, Optional
from pydantic import BaseModel
from floodlab.config.constants import ProvenanceLevel


class ProvenanceRecordSchema(BaseModel):
    level: ProvenanceLevel
    source: str
    notes: Optional[str] = ""
    value_hash: Optional[str] = ""


class ManifestSchema(BaseModel):
    run_id: str
    scenario_id: str
    solver_type: str
    breach_model: str
    execution_status: str
    created_at: str
    completed_at: Optional[str] = None
    software: Dict[str, Any] = {}
    dem: Dict[str, Any] = {}
    physical_assumptions: Dict[str, Any] = {}
    input_data: Dict[str, Any] = {}
    provenance_map: Dict[str, Any] = {}
    artifact_uris: Dict[str, str] = {}
    input_file_hashes: Dict[str, str] = {}
