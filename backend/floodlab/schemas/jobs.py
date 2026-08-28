"""
Jobs schemas.
"""
from typing import Optional
from pydantic import BaseModel


class JobStatus(BaseModel):
    job_id: str
    status: str
    progress_pct: Optional[float] = None
    result_url: Optional[str] = None
    error: Optional[str] = None
