"""Export endpoints."""
import json
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/{run_id}/manifest")
async def get_manifest(run_id: str):
    from floodlab.config.paths import get_manifest_path
    path = get_manifest_path(run_id)
    if not path.exists():
        raise HTTPException(404, f"Manifest for run {run_id} not found")
    return json.loads(path.read_text())


@router.get("/{run_id}/geojson")
async def export_geojson(run_id: str):
    return {"type": "FeatureCollection", "features": [], "run_id": run_id, "stub": True}


@router.get("/{run_id}/kml")
async def export_kml(run_id: str):
    return {"run_id": run_id, "format": "kml", "stub": True}


@router.get("/{run_id}/csv")
async def export_csv(run_id: str):
    return {"run_id": run_id, "format": "csv", "stub": True}


@router.get("/{run_id}/shapefile")
async def export_shapefile(run_id: str):
    return {"run_id": run_id, "format": "shapefile", "stub": True}
