"""
FloodLab FastAPI application.

Registers all routers, CORS middleware, and health endpoint.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from floodlab.config.settings import get_settings
from floodlab.api.routers import (
    export,
    exports,
    exposure,
    hydrology,
    jobs,
    routing,
    runs,
    satellite,
    scenarios,
    science,
    simulations,
    uncertainty,
    v3,
    validation,
)

settings = get_settings()

app = FastAPI(
    title="FloodLab API",
    description="Dam Break & Flash Flood Simulation Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(v3.router, prefix="/api/scenarios/v3", tags=["v3"])
app.include_router(simulations.router, prefix="/api/simulations", tags=["simulations"])
app.include_router(hydrology.router, prefix="/api/hydrology", tags=["hydrology"])
app.include_router(scenarios.router, prefix="/api/scenarios", tags=["scenarios"])
app.include_router(runs.router, prefix="/api/runs", tags=["runs"])
app.include_router(exports.router, prefix="/api/runs/{run_id}/exports", tags=["exports"])
app.include_router(uncertainty.router, prefix="/api/uncertainty", tags=["uncertainty"])
app.include_router(satellite.router, prefix="/api/satellite", tags=["satellite"])
app.include_router(exposure.router, prefix="/api/exposure", tags=["exposure"])
app.include_router(routing.router, prefix="/api/routing", tags=["routing"])
app.include_router(validation.router, prefix="/api/validation", tags=["validation"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(science.router, prefix="/api/science", tags=["science"])
app.include_router(science.runs_science_router, prefix="/api/runs", tags=["science_runs"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/system/services")
async def get_system_services_status():
    """
    Returns public health/readiness status of integrated external services.
    Never exposes credentials, tokens, or private endpoints.
    """
    from floodlab.services.nasa_earthdata import nasa_service
    settings = get_settings()
    nasa = nasa_service.get_service_status()

    return {
        "carto": {
            "name": "CARTO Basemap",
            "layer": "2D High-Contrast Operational Basemap",
            "tier": "Client-side (VITE_CARTO_BASEMAP_KEY)",
            "status": "CONFIGURED",
        },
        "cesium_ion": {
            "name": "Cesium Ion",
            "layer": "3D Himalayan Terrain Engine",
            "tier": "Client-side (VITE_CESIUM_ION_ACCESS_TOKEN)",
            "status": "CONFIGURED",
        },
        "nasa_earthdata": {
            "name": "NASA Earthdata (GPM / IMERG)",
            "layer": "Hydrometeorological Precipitation Data",
            "tier": "Backend Authenticated (NASA_EARTHDATA_TOKEN)",
            "configured": nasa["configured"],
            "status": nasa["status"],
        },
        "google_earth_engine": {
            "name": "Google Earth Engine",
            "layer": "Satellite Surface Water Monitoring",
            "tier": "Project-based Authentication",
            "configured": bool(settings.gee_project_id or settings.gee_service_account),
            "status": "NOT_CONNECTED",
        },
        "copernicus": {
            "name": "Copernicus Data Space",
            "layer": "Sentinel-1/2 SAR Outburst Surveillance",
            "tier": "OAuth2 Client Credentials",
            "configured": bool(settings.copernicus_client_id),
            "status": "NOT_CONFIGURED",
        },
    }


@app.get("/api/system/services/verify-nasa")
async def verify_nasa_earthdata_connectivity():
    """
    Lightweight backend authentication check against NASA Earthdata CMR.
    """
    from floodlab.services.nasa_earthdata import nasa_service
    return await nasa_service.verify_connectivity()


@app.get("/")
async def root():
    return {
        "name": "FloodLab API",
        "version": "1.0.0",
        "docs": "/docs",
    }
