"""
Export service for generating GeoJSON, Shapefile, KML, CSV reports.
"""
from pathlib import Path
from typing import Any, Dict
import json


class ExportService:
    def export_geojson(self, run_id: str, hazard_data: Dict[str, Any], output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        geojson = {
            "type": "FeatureCollection",
            "run_id": run_id,
            "features": [],
        }
        output_path.write_text(json.dumps(geojson, indent=2))
        return output_path

    def export_csv(self, run_id: str, damage_data: Dict[str, Any], output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            f"Run ID,{run_id}",
            f"Inundated Area (km2),{damage_data.get('inundated_area_km2', 0)}",
            f"Max Depth (m),{damage_data.get('max_depth_m', 0)}",
            f"Peak Velocity (m/s),{damage_data.get('peak_velocity_ms', 0)}",
            f"Population at Risk,{damage_data.get('population_at_risk', 0)}",
            f"Displaced,{damage_data.get('displaced', 0)}",
            f"Buildings Destroyed,{damage_data.get('buildings_destroyed', 0)}",
        ]
        output_path.write_text("\n".join(lines))
        return output_path
