"""
GeoJSON and KML Exporters.
"""
from pathlib import Path
from typing import Any, Dict
import json


class GeoJSONExporter:
    def export_inundation(self, run_id: str, hazard_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "type": "FeatureCollection",
            "properties": {"run_id": run_id},
            "features": [],
        }

    def save(self, geojson_dict: Dict[str, Any], output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(geojson_dict, indent=2))
        return output_path


class KMLExporter:
    def export_hazard_zones(self, geojson_data: Dict[str, Any], output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        kml = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>FloodLab Simulation Export</name>
  </Document>
</kml>
"""
        output_path.write_text(kml)
        return output_path
