"""Celery job status endpoint."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/{job_id}")
async def get_job(job_id: str):
    return {"job_id": job_id, "status": "UNKNOWN", "note": "Celery not configured"}
