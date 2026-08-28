"""
Celery application and asynchronous jobs.
"""
from typing import Any, Dict
from floodlab.config.settings import get_settings

settings = get_settings()

try:
    from celery import Celery
    celery_app = Celery(
        "floodlab",
        broker=settings.redis_url,
        backend=settings.redis_url,
    )
    celery_app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
    )
except ImportError:
    celery_app = None


def run_simulation_task(run_id: str, scenario_params: Dict[str, Any], solver_type: str, breach_model: str):
    """Placeholder celery task."""
    return {"run_id": run_id, "status": "COMPLETED"}
