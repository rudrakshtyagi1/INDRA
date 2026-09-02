import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import APIRouter, HTTPException

from floodlab.schemas.control import Run, RunStatus, Scenario, SourceType

router = APIRouter()

SCENARIOS_DB: Dict[str, Scenario] = {}
RUNS_DB: Dict[str, Run] = {}


def register_tehri_benchmark():
    if "TEHRI_V3_BENCHMARK" not in SCENARIOS_DB:
        SCENARIOS_DB["TEHRI_V3_BENCHMARK"] = Scenario(
            scenario_id="TEHRI_V3_BENCHMARK",
            name="Tehri V3 Verified Prototype",
            source_type=SourceType.ENGINEERED_DAM_BREAK,
            river_dam_metadata={
                "dam_name": "Tehri Dam",
                "river": "Bhagirathi",
                "state": "Uttarakhand",
                "latitude": 30.37,
                "longitude": 78.48,
            },
            input_configuration={
                "boundary": "300,000 m3/s",
                "breach_mode": "Instantaneous / Overtopping",
                "simulation_duration_s": 800,
                "output_interval_s": 50,
                "near_field_solver": "DualSPHysics",
                "far_field_solver": "LISFLOOD-FP",
            },
            provenance="PRECOMPUTED VERIFIED PROTOTYPE RESULT",
            created_at=datetime.now(timezone.utc),
        )


def register_tehri_v4():
    run_id = "v4_extended"
    if run_id not in RUNS_DB:
        RUNS_DB[run_id] = Run(
            run_id=run_id,
            scenario_id="TEHRI_V3_BENCHMARK",
            status=RunStatus.COMPLETED,
            qa_status="PASS",
            created_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            solver_configuration={"solver": "LISFLOOD-FP 8.1", "duration": 3600, "interval": 60},
        )


register_tehri_benchmark()
register_tehri_v4()


def setup_run_directory(scenario_id: str, run_id: str):
    base_path = f"data/runs/{scenario_id}/{run_id}"
    dirs = ["inputs", "config", "solver", "outputs", "qa", "logs", "exports"]
    for d in dirs:
        os.makedirs(f"{base_path}/{d}", exist_ok=True)
    return base_path


@router.post("", response_model=Scenario)
async def create_scenario(scenario: Scenario):
    if scenario.scenario_id in SCENARIOS_DB:
        raise HTTPException(400, "Scenario already exists")
    SCENARIOS_DB[scenario.scenario_id] = scenario
    return scenario


@router.get("", response_model=List[Scenario])
async def list_scenarios():
    return sorted(list(SCENARIOS_DB.values()), key=lambda x: x.created_at, reverse=True)


@router.get("/presets")
async def list_presets():
    """List supported Indian benchmark dam preset scenarios."""
    from hydrobreach.data.preset_scenarios import INDIAN_PRESET_SCENARIOS

    return INDIAN_PRESET_SCENARIOS


@router.get("/{scenario_id}", response_model=Scenario)
async def get_scenario(scenario_id: str):
    if scenario_id not in SCENARIOS_DB:
        raise HTTPException(404, "Scenario not found")
    return SCENARIOS_DB[scenario_id]


@router.post("/{scenario_id}/validate")
async def validate_scenario(scenario_id: str):
    if scenario_id not in SCENARIOS_DB:
        raise HTTPException(404, "Scenario not found")

    scen = SCENARIOS_DB[scenario_id]
    cfg = scen.input_configuration
    meta = scen.river_dam_metadata

    errors = []
    warnings = []

    if not scen.source_type:
        errors.append("Scenario type not present.")

    lat = meta.get("latitude")
    lon = meta.get("longitude")
    if lat is None or lon is None:
        errors.append("Coordinates missing. Latitude and longitude are required.")
    elif not (-90 <= float(lat) <= 90) or not (-180 <= float(lon) <= 180):
        errors.append("Coordinates invalid. Latitude must be -90 to 90, Longitude -180 to 180.")

    dem = cfg.get("dem_filename")
    if dem:
        if not dem.lower().endswith((".tif", ".tiff")):
            errors.append("Unsupported DEM format. GeoTIFF required.")
        if not cfg.get("dem_crs"):
            errors.append("DEM CRS missing or undetected.")
    else:
        warnings.append("No explicit DEM provided; fallback terrain will be evaluated.")

    hydro_type = cfg.get("hydrology_type")
    if hydro_type == "upload":
        hydro = cfg.get("hydrograph_filename")
        if hydro and not hydro.lower().endswith(".csv"):
            errors.append("Hydrograph must be CSV format.")

        times = cfg.get("hydrograph_timestamps", [])
        discharges = cfg.get("hydrograph_discharges", [])
        if times and discharges:
            if any(d < 0 for d in discharges):
                errors.append("Discharge values must be non-negative.")
            if times != sorted(times):
                errors.append("Hydrograph timestamps must be monotonically increasing.")

    if scen.source_type == SourceType.ENGINEERED_DAM_BREAK:
        if not cfg.get("dam_height"):
            errors.append("Required breach parameter missing: Dam Height.")

    if cfg.get("simulation_duration_s", 1) <= 0:
        errors.append("Simulation duration must be > 0.")

    if cfg.get("output_interval_s", 1) <= 0:
        errors.append("Output interval must be > 0.")

    solver = cfg.get("far_field_solver")
    if solver == "Delft3D-FM":
        errors.append("Unsupported solver selected. Delft3D-FM is on the integration path but not executable.")

    if errors:
        return {"status": "FAIL", "errors": errors, "warnings": warnings}
    elif warnings:
        return {"status": "WARNING", "errors": [], "warnings": warnings}
    else:
        return {"status": "PASS", "errors": [], "warnings": []}


@router.post("/{scenario_id}/runs", response_model=Run)
async def create_run(scenario_id: str):
    if scenario_id not in SCENARIOS_DB:
        raise HTTPException(404, "Scenario not found")

    run_id = f"run_{uuid.uuid4().hex[:8]}"
    setup_run_directory(scenario_id, run_id)

    run = Run(
        run_id=run_id,
        scenario_id=scenario_id,
        status=RunStatus.READY,  # Expected initial state for Phase 2 UI
        qa_status="PENDING",
    )
    RUNS_DB[run_id] = run
    return run


@router.get("/{scenario_id}/runs", response_model=List[Run])
async def list_scenario_runs(scenario_id: str):
    return sorted(
        [r for r in RUNS_DB.values() if r.scenario_id == scenario_id],
        key=lambda x: x.created_at,
        reverse=True,
    )
