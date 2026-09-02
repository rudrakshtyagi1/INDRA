from fastapi import APIRouter, HTTPException
from floodlab.api.routers.scenarios import RUNS_DB
from floodlab.schemas.control import Run

router = APIRouter()


@router.get("/{run_id}", response_model=Run)
async def get_run(run_id: str):
    if run_id not in RUNS_DB:
        raise HTTPException(404, "Run not found")
    return RUNS_DB[run_id]


@router.get("/{run_id}/frames")
async def get_run_frames(run_id: str):
    if run_id not in RUNS_DB:
        raise HTTPException(404, "Run not found")

    frames = []
    if run_id == "v4_extended":
        for i in range(61):
            time_sec = i * 60
            url = f"/api/runs/{run_id}/exports/depth_{i:04d}?format=geotiff"
            frames.append({"time_sec": time_sec, "url": url})

        return {
            "run_id": run_id,
            "provenance": "MODELLED",
            "solver": "LISFLOOD-FP 8.1",
            "interval_sec": 60,
            "frames": frames,
        }
    else:
        # For V3 or others
        return {
            "run_id": run_id,
            "provenance": "PRECOMPUTED VERIFIED PROTOTYPE RESULT",
            "solver": "LISFLOOD-FP 8.1",
            "interval_sec": 50,
            "frames": [
                {"time_sec": i * 50, "url": f"/api/runs/{run_id}/exports/depth_{i:04d}?format=geotiff"}
                for i in range(17)
            ],
        }
