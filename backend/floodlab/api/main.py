"""
FloodLab FastAPI application.

Registers all routers, CORS middleware, and health endpoint.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from floodlab.config.settings import get_settings
from floodlab.api.routers import (
    simulations, hydrology, scenarios, uncertainty,
    satellite, exposure, routing, validation, export, jobs
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
app.include_router(simulations.router, prefix="/api/simulations", tags=["simulations"])
app.include_router(hydrology.router, prefix="/api/hydrology", tags=["hydrology"])
app.include_router(scenarios.router, prefix="/api/scenarios", tags=["scenarios"])
app.include_router(uncertainty.router, prefix="/api/uncertainty", tags=["uncertainty"])
app.include_router(satellite.router, prefix="/api/satellite", tags=["satellite"])
app.include_router(exposure.router, prefix="/api/exposure", tags=["exposure"])
app.include_router(routing.router, prefix="/api/routing", tags=["routing"])
app.include_router(validation.router, prefix="/api/validation", tags=["validation"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
async def root():
    return {
        "name": "FloodLab API",
        "version": "1.0.0",
        "docs": "/docs",
    }
