"""
HydroBreach - Main FastAPI Application
Entry point for hydrodynamic simulations, satellite surveillance, damage estimation, and GIS exports.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from hydrobreach.api.routers import scenarios, simulation, comparison, damage, gee, export, hydrology, uncertainty

app = FastAPI(
    title="FLOODLAB - Tehri Dam Break & Flash Flood Decision-Support Platform",
    description="Operational HADR hydrodynamic modeling platform integrating SPH, Delft3D 2D SWE, Sentinel-1 SAR change detection, SCS-CN hydrology, and uncertainty ensembles.",
    version="1.0.0"
)

# CORS middleware for seamless local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(scenarios.router)
app.include_router(simulation.router)
app.include_router(comparison.router)
app.include_router(damage.router)
app.include_router(gee.router)
app.include_router(export.router)
app.include_router(hydrology.router)
app.include_router(uncertainty.router)


@app.get("/")
async def root():
    return {
        "framework": "HydroBreach",
        "version": "1.0.0",
        "status": "OPERATIONAL",
        "supported_solvers": ["WCSPH (Smoothed Particle Hydrodynamics)", "Delft3D Flexible Mesh / 2D SWE"],
        "satellite_engine": "Sentinel-1 SAR / GEE Near-Real-Time",
        "export_formats": [".shp (ESRI Shapefile)", ".kml (Google Earth)", ".geojson", ".csv (HADR Report)"]
    }


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "hydrobreach-backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("hydrobreach.api.main:app", host="0.0.0.0", port=8000, reload=True)
