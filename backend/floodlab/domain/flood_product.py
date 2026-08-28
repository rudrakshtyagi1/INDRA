"""
Flood product domain model.
"""
from dataclasses import dataclass, field
from typing import Any, Dict
from floodlab.domain.provenance import ProvenanceRecord


@dataclass
class FloodProduct:
    run_id: str
    product_type: str
    provenance: ProvenanceRecord
    file_path: str
    metadata: Dict[str, Any] = field(default_factory=dict)
