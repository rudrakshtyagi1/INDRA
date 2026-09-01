"""
FloodLab application settings loaded from environment variables / .env file.
"""
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_env: str = "development"
    secret_key: str = "changeme"
    debug: bool = True
    log_level: str = "INFO"

    # Database — primary: PostgreSQL+PostGIS; fallback: SQLite for dev/test
    database_url: str = "sqlite+aiosqlite:///./floodlab_dev.db"
    test_database_url: str = "sqlite+aiosqlite:///./floodlab_test.db"

    # DualSPHysics — version discovered at runtime, not hardcoded
    dualsphysics_bin_dir: Optional[str] = None
    dualsphysics_version: Optional[str] = None  # populated at runtime

    # Delft3D FM — version discovered at runtime, not hardcoded
    dflowfm_bin_dir: Optional[str] = None
    dflowfm_version: Optional[str] = None  # populated at runtime

    # Storage
    storage_root: str = "./storage"
    data_root: str = "./data"

    # External Services Authentication (Backend Only — Never exposed in API responses)
    nasa_earthdata_token: Optional[str] = None

    # Google Earth Engine (Project-based authentication)
    gee_project_id: Optional[str] = None
    gee_service_account: Optional[str] = None
    gee_key_file: Optional[str] = None

    # Copernicus Data Space (OAuth2)
    copernicus_client_id: Optional[str] = None
    copernicus_client_secret: Optional[str] = None

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # Frontend
    vite_api_base_url: str = "http://localhost:8000"

    @property
    def is_postgres(self) -> bool:
        return "postgresql" in self.database_url or "postgres" in self.database_url

    @property
    def storage_path(self) -> Path:
        return Path(self.storage_root)

    @property
    def data_path(self) -> Path:
        return Path(self.data_root)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
