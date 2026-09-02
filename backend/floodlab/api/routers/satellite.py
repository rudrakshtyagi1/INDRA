"""Google Earth Engine / Sentinel-1 observation endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from floodlab.schemas.satellite import ModelComparisonRequest, SARAnalysisRequest
from floodlab.satellite.observation_comparator import ObservationComparator, available_model_products
from floodlab.satellite.sentinel1 import Sentinel1AnalysisService

router = APIRouter()


def _service() -> Sentinel1AnalysisService:
    return Sentinel1AnalysisService()


@router.get("/status")
async def status():
    """Safe provider state. No API key, token, or credential path is returned."""
    return _service().status()


@router.get("/zones")
async def zones():
    return {"zones": _service().list_zones()}


@router.get("/analyses")
async def analyses(limit: int = 20):
    limit = max(1, min(limit, 100))
    records = _service().list_analyses(limit=limit)
    return {"analyses": records, "count": len(records)}


@router.get("/analyses/{analysis_id}")
async def analysis(analysis_id: str):
    try:
        return _service().get_analysis(analysis_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="SATELLITE_ANALYSIS_NOT_FOUND")


@router.get("/alerts")
async def alerts():
    """Derived alerts from actual persisted analyses only; never synthetic detections."""
    records = _service().list_analyses(limit=50)
    alerts_out = []
    for record in records:
        area_ha = (record.get("metrics") or {}).get("new_surface_water_area_ha") or 0.0
        if area_ha <= 0:
            continue
        alerts_out.append(
            {
                "analysis_id": record.get("analysis_id"),
                "detected_area_ha": area_ha,
                "status": "SURFACE_WATER_CHANGE_DETECTED",
                "provenance": "DERIVED FROM SENTINEL-1 OBSERVATION",
            }
        )
    return {"alerts": alerts_out, "total_active_alerts": len(alerts_out)}


@router.post("/analyse")
async def analyse(request: SARAnalysisRequest):
    service = _service()
    status_info = service.status()["google_earth_engine"]
    if not status_info["configured"]:
        raise HTTPException(status_code=503, detail="GEE_PROJECT_NOT_CONFIGURED")
    if not status_info["authenticated"]:
        raise HTTPException(
            status_code=503,
            detail={"code": "GEE_AUTHENTICATION_UNAVAILABLE", "message": status_info.get("error")},
        )
    try:
        return service.analyse(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        # Do not echo secrets. Earth Engine exceptions are generally dataset/auth/compute
        # diagnostics, but keep the public message compact.
        raise HTTPException(
            status_code=502,
            detail=f"EARTH_ENGINE_ANALYSIS_FAILED: {type(exc).__name__}",
        )


@router.get("/model-products")
async def model_products():
    return {"products": available_model_products()}


@router.post("/compare-model")
async def compare_model(request: ModelComparisonRequest):
    service = _service()
    try:
        analysis_payload = service.get_analysis(request.analysis_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="SATELLITE_ANALYSIS_NOT_FOUND")
    try:
        return ObservationComparator().compare_saved_analysis(
            analysis_payload, request.run_id, request.purpose
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
