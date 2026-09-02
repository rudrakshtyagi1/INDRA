import json
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

V3_BASE = os.environ.get("DATA_DIR", "/app/data/processed/tehri_simulations")

@router.get("/summary")
async def get_v3_summary():
    """Returns the WHAT-IF HYDRODYNAMIC BENCHMARK summary."""
    return {
        "status": "WHAT-IF HYDRODYNAMIC BENCHMARK",
        "validation": "PHYSICAL VALIDATION: NOT AVAILABLE",
        "model": "DualSPHysics -> LISFLOOD-FP",
        "simulation_window_s": 800,
        "downstream_reach": "approximately current V3 solver reach only",
        "terrain": "Copernicus DEM-derived",
        "near_field": "DualSPHysics",
        "downstream": "LISFLOOD-FP 8.1",
        "grid_resolution": "30 m",
        "hydraulic_roughness": "Assumed uniform Manning n = 0.06",
        "channel_geometry": "Simplified numerical coupling geometry",
        "boundary": "Back-scaled DualSPHysics benchmark"
    }

@router.get("/hazard")
async def get_v3_hazard():
    """Returns the inundation extent GeoJSON."""
    path = f"{V3_BASE}/lisflood_fp/outputs/v3_geometry_corrected/rasters/inundation_extent_v3.geojson"
    if os.path.exists(path):
        return FileResponse(path, media_type="application/geo+json")
    raise HTTPException(404, "MODEL OUTPUT UNAVAILABLE")

@router.get("/exposure")
async def get_v3_exposure():
    """Returns the exposure summary JSON."""
    path = f"{V3_BASE}/exposure/v3/summary/hazard_exposure_summary.json"
    if os.path.exists(path):
        return FileResponse(path, media_type="application/json")
    raise HTTPException(404, "MODEL OUTPUT UNAVAILABLE")
    
@router.get("/hadr/routes")
async def get_v3_routes():
    """Returns HADR routes summary."""
    path = f"{V3_BASE}/hadr/v3/summary/hadr_routing_summary.json"
    if os.path.exists(path):
        return FileResponse(path, media_type="application/json")
    raise HTTPException(404, "MODEL OUTPUT UNAVAILABLE")

@router.get("/hadr/route/normal")
async def get_v3_normal_route():
    path = f"{V3_BASE}/hadr/v3/routes/normal_route.geojson"
    if os.path.exists(path):
        return FileResponse(path, media_type="application/geo+json")
    raise HTTPException(404, "MODEL OUTPUT UNAVAILABLE")

@router.get("/hadr/route/hazard_aware")
async def get_v3_hazard_aware_route():
    path = f"{V3_BASE}/hadr/v3/routes/hazard_aware_route.geojson"
    if os.path.exists(path):
        return FileResponse(path, media_type="application/geo+json")
    raise HTTPException(404, "MODEL OUTPUT UNAVAILABLE")

@router.get("/exposure/roads")
async def get_v3_exposure_roads():
    path = f"{V3_BASE}/exposure/v3/roads/exposed_roads.geojson"
    if os.path.exists(path):
        return FileResponse(path, media_type="application/geo+json")
    raise HTTPException(404, "MODEL OUTPUT UNAVAILABLE")

@router.get("/hazard/arrival_time")
async def get_v3_arrival_time():
    """Returns the arrival time TIF for dynamic playback."""
    path = f"{V3_BASE}/lisflood_fp/outputs/v3_geometry_corrected/rasters/arrival_time_v3.tif"
    if os.path.exists(path):
        return FileResponse(path, media_type="image/tiff")
    raise HTTPException(404, "MODEL OUTPUT UNAVAILABLE")

@router.get("/frames/{time_sec}")
async def get_v3_frame(time_sec: int):
    """
    Returns the precomputed GeoJSON arrival-time propagation mask.
    time_sec should be snapped to nearest 50s.
    """
    snapped = int(round(time_sec / 50.0) * 50)
    snapped = max(0, min(800, snapped))
    path = f"{V3_BASE}/lisflood_fp/outputs/v3_geometry_corrected/rasters/frames/frame_{snapped:03d}.geojson"
    if os.path.exists(path):
        return FileResponse(path, media_type="application/geo+json")
    raise HTTPException(404, "FRAME NOT FOUND")
