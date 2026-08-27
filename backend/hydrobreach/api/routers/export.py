"""
HydroBreach API - Geospatial and Reporting Export Router
Provides file downloads for Shapefiles (.shp.zip), Google Earth (.kml), GeoJSON, and CSV reports.
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse, PlainTextResponse
from typing import Dict, Any, Optional
from pydantic import BaseModel
import io
import zipfile

from hydrobreach.models.exporters.vector_exporter import GeospatialExporter
from hydrobreach.models.delft3d_engine.delft3d_adapter import Delft3DHydroSolver
from hydrobreach.api.routers.simulation import SIMULATION_STORE

router = APIRouter(prefix="/api/export", tags=["Export"])


class ExportRequest(BaseModel):
    run_id: Optional[str] = None
    scenario_name: str = "HydroBreach_Simulation"
    lat: float = 30.485
    lon: float = 79.738
    reach_length_km: float = 25.0


def _get_geojson_for_request(req: ExportRequest) -> Dict[str, Any]:
    if req.run_id and req.run_id in SIMULATION_STORE:
        run = SIMULATION_STORE[req.run_id]
        p = run.get("scenario_params", {})
        sc_name = p.get("name", req.scenario_name)
        lat = p.get("lat", req.lat)
        lon = p.get("lon", req.lon)
        reach_km = p.get("reach_length_km", req.reach_length_km)
    else:
        sc_name = req.scenario_name
        lat = req.lat
        lon = req.lon
        reach_km = req.reach_length_km

    return GeospatialExporter.generate_geojson(
        scenario_name=sc_name,
        dam_coords=(lat, lon),
        reach_length_km=reach_km
    )


@router.post("/geojson")
async def export_geojson(req: ExportRequest):
    """Returns standard GeoJSON FeatureCollection."""
    geojson_data = _get_geojson_for_request(req)
    return geojson_data


@router.post("/kml")
async def export_kml(req: ExportRequest):
    """Downloads styled Google Earth KML file."""
    geojson_data = _get_geojson_for_request(req)
    kml_str = GeospatialExporter.generate_kml(geojson_data)
    
    filename = f"{req.scenario_name.replace(' ', '_')}_inundation.kml"
    return Response(
        content=kml_str,
        media_type="application/vnd.google-earth.kml+xml",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/shapefile")
async def export_shapefile(req: ExportRequest):
    """Downloads ESRI Shapefile package (.shp, .shx, .dbf, .prj) in a ZIP file."""
    geojson_data = _get_geojson_for_request(req)
    zip_bytes = GeospatialExporter.generate_shapefile_zip(geojson_data)

    filename = f"{req.scenario_name.replace(' ', '_')}_shapefile.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/report-csv")
async def export_report_csv(req: ExportRequest):
    """Downloads tabulated HADR Disaster Impact Report in CSV format."""
    damage_data = {}
    if req.run_id and req.run_id in SIMULATION_STORE:
        damage_data = SIMULATION_STORE[req.run_id].get("damage_assessment", {})
    
    if not damage_data:
        damage_data = {
            "scenario_name": req.scenario_name,
            "reach_name": f"{req.reach_length_km} km River Reach",
            "hazard_metrics": {"hazard_level": "EXTREME", "hazard_rating_hr": 2.45, "max_flood_depth_m": 8.5, "peak_velocity_ms": 15.2},
            "exposure_and_loss": {"population_at_risk": 4500, "displaced_persons": 3800, "total_buildings_exposed": 870, "destroyed_structures": 560, "submerged_structures": 310, "inundated_agricultural_ha": 310.0, "total_economic_loss_crores_inr": 185.4},
            "resource_allocation": {"inflatable_rescue_boats": 16, "ndrf_sdrf_battalions": 2, "emergency_relief_shelters": 8, "food_water_packets_per_day": 11400}
        }

    csv_content = GeospatialExporter.generate_hadr_situation_report_csv(damage_data)
    filename = f"{req.scenario_name.replace(' ', '_')}_HADR_Report.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/delft3d-files")
async def export_delft3d_files(req: ExportRequest):
    """Downloads Delft3D Flexible Mesh project files (.mdu, .ext, .tim) in a ZIP."""
    scenario_clean = req.scenario_name.replace(" ", "_")
    params = {"reach_length_km": req.reach_length_km, "dam_height_m": 45.0, "manning_n": 0.038}
    hydro_times = [0.0, 0.5, 1.0, 2.0, 4.0]
    hydro_flows = [0.0, 4200.0, 1800.0, 650.0, 120.0]

    files_dict = Delft3DHydroSolver.generate_delft3d_fm_project_files(
        scenario_name=scenario_clean,
        params=params,
        hydro_times=hydro_times,
        hydro_flows=hydro_flows
    )

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for fname, content in files_dict.items():
            zf.writestr(fname, content)
    zip_buf.seek(0)

    filename = f"{scenario_clean}_delft3d_fm.zip"
    return Response(
        content=zip_buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
