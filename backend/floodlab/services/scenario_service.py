"""
Scenario service.
"""
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml


class ScenarioService:
    def __init__(self, scenarios_dir: Optional[Path] = None):
        self.scenarios_dir = scenarios_dir or (Path(__file__).parents[4] / "configs" / "scenarios")

    def list_presets(self) -> List[Dict[str, Any]]:
        presets = []
        if self.scenarios_dir.exists():
            for f in sorted(self.scenarios_dir.glob("*.yaml")):
                with open(f) as fh:
                    data = yaml.safe_load(fh)
                presets.append({
                    "id": data.get("scenario_id", f.stem),
                    "name": data.get("name", f.stem),
                    "dam_name": data.get("dam_name"),
                    "is_hypothetical": data.get("is_hypothetical", True),
                    "observation_validation_status": data.get("observation_validation_status", "NOT_AVAILABLE"),
                })
        return presets

    def get_preset_by_id(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        if self.scenarios_dir.exists():
            for f in self.scenarios_dir.glob("*.yaml"):
                with open(f) as fh:
                    data = yaml.safe_load(fh)
                if data.get("scenario_id") == scenario_id or f.stem == scenario_id:
                    return data
        return None
