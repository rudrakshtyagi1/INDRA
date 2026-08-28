"""
ProvenanceRegistry: tracks provenance records for all values in a run.
"""
from typing import Dict, Optional

from floodlab.domain.provenance import ProvenanceRecord
from floodlab.config.constants import ProvenanceLevel


class ProvenanceRegistry:
    def __init__(self):
        self._records: Dict[str, ProvenanceRecord] = {}

    def register(self, key: str, record: ProvenanceRecord) -> None:
        self._records[key] = record

    def get(self, key: str) -> Optional[ProvenanceRecord]:
        return self._records.get(key)

    def to_dict(self) -> Dict[str, dict]:
        return {k: v.to_dict() for k, v in self._records.items()}

    @classmethod
    def from_dict(cls, d: dict) -> "ProvenanceRegistry":
        registry = cls()
        for key, val in d.items():
            registry._records[key] = ProvenanceRecord.from_dict(val)
        return registry

    def all_keys(self) -> list[str]:
        return list(self._records.keys())

    def filter_by_level(self, level: ProvenanceLevel) -> Dict[str, ProvenanceRecord]:
        return {k: v for k, v in self._records.items() if v.level == level}
