"""
FastAPI Router for Computer Vision Dam Monitoring and Breach Detection.
"""
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query

from floodlab.cv.camera_service import camera_service
from floodlab.cv.schemas import (
    CameraPose,
    CVEvidenceFrame,
    CVSimulationSyncRequest,
)

router = APIRouter()


@router.get("/cameras", response_model=List[CameraPose])
def get_cameras():
    """List all registered and calibrated dam surveillance cameras."""
    return camera_service.list_cameras()


@router.get("/status")
def get_cv_status():
    """Get real-time CV engine status, active camera, and breach indicators."""
    frame = camera_service.get_current_frame()
    sync_state = camera_service.get_simulation_sync_state()
    return {
        "engine": "INDRA Optical Dam Perception Core",
        "version": "2.1.0-cv",
        "active_camera_id": camera_service.active_camera_id,
        "active_scenario": camera_service.active_scenario,
        "breach_status": frame.status.value,
        "is_breached": frame.metrics.is_breached,
        "is_overtopping": frame.metrics.is_overtopping,
        "water_elevation_m": frame.metrics.water_elevation_m,
        "crest_elevation_m": frame.metrics.crest_elevation_m,
        "freeboard_m": frame.metrics.freeboard_m,
        "confidence": frame.metrics.confidence,
        "simulation_sync": sync_state,
    }


@router.get("/frame", response_model=CVEvidenceFrame)
def get_camera_frame(
    camera_id: Optional[str] = Query(None, description="Camera ID"),
    scenario_id: Optional[str] = Query(None, description="Scenario ID (normal_ops, monsoon_rise, crest_overtopping, structural_breach)"),
):
    """Retrieve the latest optical CV evidence frame with vector HUD overlay and telemetry."""
    return camera_service.get_current_frame(camera_id=camera_id, scenario_id=scenario_id)


@router.post("/scenario/{scenario_id}")
def switch_scenario(scenario_id: str):
    """Switch the operational scenario for the dam camera sensor."""
    valid_scenarios = ["normal_ops", "monsoon_rise", "crest_overtopping", "structural_breach"]
    if scenario_id not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{scenario_id}'. Valid choices: {valid_scenarios}",
        )
    active = camera_service.set_active_scenario(scenario_id)
    frame = camera_service.get_current_frame()
    return {
        "status": "OK",
        "active_scenario": active,
        "breach_status": frame.status.value,
        "water_elevation_m": frame.metrics.water_elevation_m,
        "is_breached": frame.metrics.is_breached,
    }


@router.post("/sync-simulation")
def sync_cv_to_simulation(req: CVSimulationSyncRequest):
    """
    Directly injects CV dam breach detection results into the simulation model.
    Updates boundary hydrographs and downstream flood propagation parameters.
    """
    return camera_service.sync_to_simulation(req)


@router.get("/simulation-sync")
def get_simulation_sync_state():
    """Retrieve current synchronization state between CV detection and simulation lab."""
    return camera_service.get_simulation_sync_state()
