import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from fastapi import APIRouter, HTTPException

from floodlab.schemas.boundary import BoundaryGenerateRequest, BoundaryHydrograph
from floodlab.schemas.control import Run, RunStatus, Scenario, SourceType
from floodlab.services.boundary_service import BoundaryValidationError, boundary_service

router = APIRouter()

SCENARIOS_DB: Dict[str, Scenario] = {}
RUNS_DB: Dict[str, Run] = {}


def register_tehri_benchmark():
    if "TEHRI_V3_BENCHMARK" not in SCENARIOS_DB:
        SCENARIOS_DB["TEHRI_V3_BENCHMARK"] = Scenario(
            scenario_id="TEHRI_V3_BENCHMARK",
            name="Tehri Dam V3 Benchmark",
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
                "grid_resolution_m": 30,
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


def setup_run_directory(scenario_id: str, run_id: str) -> Path:
    base_path = Path("data") / "runs" / scenario_id / run_id
    for d in ["inputs", "config", "solver", "outputs", "qa", "logs", "exports"]:
        (base_path / d).mkdir(parents=True, exist_ok=True)
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


def _validate_numeric(cfg, key, label, errors, *, positive=False, nonnegative=False, required=True):
    value = cfg.get(key)
    if value in (None, ""):
        if required:
            errors.append(f"Required parameter missing: {label}.")
        return
    try:
        value = float(value)
    except (TypeError, ValueError):
        errors.append(f"{label} must be numeric.")
        return
    if positive and value <= 0:
        errors.append(f"{label} must be > 0.")
    if nonnegative and value < 0:
        errors.append(f"{label} must be >= 0.")


@router.post("/{scenario_id}/validate")
async def validate_scenario(scenario_id: str):
    if scenario_id not in SCENARIOS_DB:
        raise HTTPException(404, "Scenario not found")

    scen = SCENARIOS_DB[scenario_id]
    cfg = scen.input_configuration
    meta = scen.river_dam_metadata

    errors = []
    warnings = []

    lat = meta.get("latitude")
    lon = meta.get("longitude")
    if lat is None or lon is None:
        errors.append("Coordinates missing. Latitude and longitude are required.")
    else:
        try:
            lat_f, lon_f = float(lat), float(lon)
            if not (-90 <= lat_f <= 90) or not (-180 <= lon_f <= 180):
                errors.append("Coordinates invalid. Latitude must be -90 to 90, Longitude -180 to 180.")
        except (TypeError, ValueError):
            errors.append("Coordinates must be numeric.")

    dem = cfg.get("dem_filename")
    if dem:
        if not str(dem).lower().endswith((".tif", ".tiff")):
            errors.append("Unsupported DEM format. GeoTIFF required.")
        if not cfg.get("dem_crs"):
            warnings.append("DEM CRS is not yet verified by backend raster inspection; metadata is provisional.")
    else:
        warnings.append("No explicit DEM provided; fallback terrain will be evaluated before hydraulic execution.")

    times = cfg.get("hydrograph_timestamps", []) or []
    discharges = cfg.get("hydrograph_discharges", []) or []
    if times or discharges:
        if len(times) != len(discharges) or len(times) < 2:
            errors.append("Hydrograph requires equal-length time/discharge arrays with at least two points.")
        else:
            try:
                t = [float(x) for x in times]
                q = [float(x) for x in discharges]
                if any(x < 0 for x in q):
                    errors.append("Discharge values must be non-negative.")
                if any(t[i] >= t[i + 1] for i in range(len(t) - 1)):
                    errors.append("Hydrograph timestamps must be strictly increasing.")
            except (TypeError, ValueError):
                errors.append("Hydrograph timestamps and discharges must be numeric.")

    if scen.source_type == SourceType.ENGINEERED_DAM_BREAK and not (times and discharges):
        _validate_numeric(cfg, "dam_height", "Dam height", errors, positive=True)
        _validate_numeric(cfg, "reservoir_storage", "Reservoir storage", errors, positive=True)
        _validate_numeric(cfg, "breach_width", "Breach width", errors, positive=True)
        _validate_numeric(cfg, "breach_time", "Breach formation time", errors, positive=True)

    if scen.source_type == SourceType.NATURAL_RIVER_BLOCKAGE and not (times and discharges):
        _validate_numeric(cfg, "impounded_volume_m3", "Impounded lake volume", errors, positive=True)
        _validate_numeric(cfg, "blockage_height_m", "Blockage height", errors, positive=True)
        _validate_numeric(cfg, "blockage_breach_width_m", "Blockage breach width", errors, positive=True)
        _validate_numeric(cfg, "failure_duration_s", "Failure duration", errors, positive=True)
        _validate_numeric(cfg, "upstream_water_depth_m", "Upstream water depth", errors, positive=True, required=False)

    if scen.source_type == SourceType.CONTROLLED_RELEASE and not (times and discharges):
        _validate_numeric(cfg, "release_start_time_s", "Release start time", errors, nonnegative=True)
        _validate_numeric(cfg, "release_ramp_up_s", "Ramp-up duration", errors, positive=True)
        _validate_numeric(cfg, "peak_release_m3s", "Peak release", errors, nonnegative=True)
        _validate_numeric(cfg, "release_hold_s", "Hold duration", errors, nonnegative=True)
        _validate_numeric(cfg, "release_ramp_down_s", "Ramp-down duration", errors, positive=True)

    try:
        duration = float(cfg.get("simulation_duration_s", 0))
        if duration <= 0:
            errors.append("Simulation duration must be > 0.")
    except (TypeError, ValueError):
        errors.append("Simulation duration must be numeric.")

    try:
        interval = float(cfg.get("output_interval_s", 0))
        if interval <= 0:
            errors.append("Output interval must be > 0.")
    except (TypeError, ValueError):
        errors.append("Output interval must be numeric.")

    if cfg.get("far_field_solver") == "Delft3D-FM":
        errors.append("Unsupported solver selected. Delft3D-FM is on the integration path but not executable.")

    if errors:
        return {"status": "FAIL", "errors": errors, "warnings": warnings}
    if warnings:
        return {"status": "WARNING", "errors": [], "warnings": warnings}
    return {"status": "PASS", "errors": [], "warnings": []}


@router.post("/{scenario_id}/boundary/generate", response_model=BoundaryHydrograph)
async def generate_boundary(scenario_id: str, request: BoundaryGenerateRequest = BoundaryGenerateRequest()):
    if scenario_id not in SCENARIOS_DB:
        raise HTTPException(404, "Scenario not found")
    scenario = SCENARIOS_DB[scenario_id]
    try:
        return boundary_service.generate(scenario, request.model_dump(exclude_none=True))
    except BoundaryValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/{scenario_id}/boundary", response_model=BoundaryHydrograph)
async def get_boundary(scenario_id: str):
    if scenario_id not in SCENARIOS_DB:
        raise HTTPException(404, "Scenario not found")
    boundary = boundary_service.get(scenario_id)
    if boundary is None:
        raise HTTPException(404, "Boundary hydrograph has not been generated for this scenario")
    return boundary


@router.post("/{scenario_id}/runs", response_model=Run)
async def create_run(scenario_id: str):
    if scenario_id not in SCENARIOS_DB:
        raise HTTPException(404, "Scenario not found")

    run_id = f"run_{uuid.uuid4().hex[:8]}"
    base_path = setup_run_directory(scenario_id, run_id)
    input_paths = boundary_service.persist_to_run(scenario_id, run_id, base_path)

    run = Run(
        run_id=run_id,
        scenario_id=scenario_id,
        status=RunStatus.READY,
        qa_status="PENDING",
        input_paths=input_paths,
        solver_configuration={
            "near_field_solver": SCENARIOS_DB[scenario_id].input_configuration.get("near_field_solver"),
            "far_field_solver": SCENARIOS_DB[scenario_id].input_configuration.get("far_field_solver"),
            "boundary_status": "READY" if input_paths else "NOT_GENERATED",
        },
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
