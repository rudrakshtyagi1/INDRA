"""
FastAPI router for FloodLab Scientific Pipeline and Model Observability.
"""
from fastapi import APIRouter
from floodlab.services.artifact_registry import artifact_registry

router = APIRouter()


@router.get("/pipeline")
async def get_pipeline():
    """Returns the 10-stage physics computational pipeline."""
    return artifact_registry.get_pipeline_manifest()


@router.get("/data-sources")
async def get_data_sources():
    """Returns catalog of all ingested datasets."""
    return artifact_registry.get_data_sources_catalog()


# Run-specific science endpoints (also mounted under /api/runs/{run_id}/...)
runs_science_router = APIRouter()


@runs_science_router.get("/{run_id}/hydrology")
async def get_run_hydrology(run_id: str):
    return artifact_registry.get_run_hydrology(run_id)


@runs_science_router.get("/{run_id}/breach")
async def get_run_breach(run_id: str):
    return artifact_registry.get_run_breach(run_id)


@runs_science_router.get("/{run_id}/sph")
async def get_run_sph(run_id: str):
    return artifact_registry.get_run_sph_diagnostics(run_id)


@runs_science_router.get("/{run_id}/sph/frames")
async def get_run_sph_frames(run_id: str):
    return artifact_registry.get_run_sph_frames_summary(run_id)


@runs_science_router.get("/{run_id}/sph/frame/{frame_idx}")
async def get_run_sph_frame(run_id: str, frame_idx: int):
    return artifact_registry.get_run_sph_frame(run_id, frame_idx)


@runs_science_router.get("/{run_id}/coupling")
async def get_run_coupling(run_id: str):
    return artifact_registry.get_run_coupling(run_id)


@runs_science_router.get("/{run_id}/hydraulics")
async def get_run_hydraulics(run_id: str):
    return artifact_registry.get_run_hydraulics(run_id)


@runs_science_router.get("/{run_id}/temporal-metrics")
async def get_run_temporal_metrics(run_id: str):
    return artifact_registry.get_run_temporal_metrics(run_id)


@runs_science_router.get("/{run_id}/qa")
async def get_run_qa(run_id: str):
    return artifact_registry.get_run_qa(run_id)


@runs_science_router.get("/{run_id}/exposure-timeline")
async def get_run_exposure_timeline(run_id: str):
    return artifact_registry.get_run_exposure_timeline(run_id)


@runs_science_router.get("/{run_id}/hadr-timeline")
async def get_run_hadr_timeline(run_id: str):
    return artifact_registry.get_run_hadr_timeline(run_id)
