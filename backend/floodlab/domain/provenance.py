"""
Provenance domain objects.

Provenance labels attach to value-generation processes, not permanently
to variable types. The same variable can have different provenance depending
on HOW it was determined.
"""
import hashlib
import json
from dataclasses import dataclass
from typing import Any

from floodlab.config.constants import ProvenanceLevel


@dataclass
class ProvenanceRecord:
    """
    Describes the provenance of a data value or model output.

    level:   one of OBSERVED / REPORTED / MODELLED / ASSUMED / DERIVED
    source:  human-readable source identifier (e.g. 'THDC India Limited',
             'DualSPHysics 5.2', 'analyst_input')
    notes:   optional additional context
    value_hash: SHA256 of the value itself (populated when needed for audit)
    """
    level: ProvenanceLevel
    source: str
    notes: str = ""
    value_hash: str = ""

    def to_dict(self) -> dict:
        return {
            "level": self.level.value if isinstance(self.level, ProvenanceLevel) else self.level,
            "source": self.source,
            "notes": self.notes,
            "value_hash": self.value_hash,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ProvenanceRecord":
        return cls(
            level=ProvenanceLevel(d["level"]),
            source=d.get("source", ""),
            notes=d.get("notes", ""),
            value_hash=d.get("value_hash", ""),
        )


def compute_value_hash(value: Any) -> str:
    """SHA256 hash of a value's JSON representation."""
    try:
        serialised = json.dumps(value, sort_keys=True, default=str)
    except (TypeError, ValueError):
        serialised = str(value)
    return hashlib.sha256(serialised.encode()).hexdigest()
