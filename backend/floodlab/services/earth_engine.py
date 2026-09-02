"""Lazy, backend-only Google Earth Engine authentication.

Secrets are never returned by this module.  Earth Engine is optional for the core
FloodLab benchmark; when it is unavailable the satellite API reports a truthful
standby state rather than synthesising observations.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from floodlab.config.settings import get_settings


@dataclass(frozen=True)
class EarthEngineStatus:
    configured: bool
    authenticated: bool
    auth_method: str
    project_id: Optional[str]
    library_available: bool
    error: Optional[str] = None

    def safe_dict(self) -> dict[str, Any]:
        return {
            "configured": self.configured,
            "authenticated": self.authenticated,
            "auth_method": self.auth_method,
            "project_id": self.project_id,
            "library_available": self.library_available,
            "error": "AUTHENTICATION_FAILED" if self.error else None,
        }


class EarthEngineClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._ee = None
        self._initialized = False
        self._last_error: Optional[str] = None
        self._auth_method = "NONE"

    def _import_ee(self):
        if self._ee is None:
            try:
                import ee  # type: ignore
            except ImportError as exc:  # pragma: no cover - depends on optional package
                raise RuntimeError(
                    "earthengine-api is not installed in the backend runtime"
                ) from exc
            self._ee = ee
        return self._ee

    def configured(self) -> bool:
        return bool(self.settings.gee_project_id)

    def initialize(self):
        if self._initialized:
            return self._ee
        if not self.settings.gee_project_id:
            raise RuntimeError("GEE_PROJECT_ID is not configured")

        ee = self._import_ee()
        project = self.settings.gee_project_id
        try:
            if self.settings.gee_service_account and self.settings.gee_key_file:
                key_path = Path(self.settings.gee_key_file).expanduser()
                if not key_path.exists():
                    raise RuntimeError("Configured GEE service-account key file does not exist")
                credentials = ee.ServiceAccountCredentials(
                    self.settings.gee_service_account,
                    str(key_path),
                )
                ee.Initialize(credentials=credentials, project=project)
                self._auth_method = "SERVICE_ACCOUNT"
            else:
                # Earth Engine's normal authorized-user / ADC path. This reads credentials
                # from the runtime's Earth Engine or Google application credential store.
                ee.Initialize(project=project)
                self._auth_method = "AUTHORIZED_USER_OR_ADC"

            # Harmless server call proving that initialization is not merely syntactic.
            ee.Number(1).getInfo()
            self._initialized = True
            self._last_error = None
            return ee
        except Exception as exc:
            self._last_error = str(exc)
            self._initialized = False
            raise

    def status(self, probe: bool = True) -> EarthEngineStatus:
        if not self.configured():
            return EarthEngineStatus(
                configured=False,
                authenticated=False,
                auth_method="NONE",
                project_id=None,
                library_available=self._library_available(),
                error=None,
            )
        if probe and not self._initialized:
            try:
                self.initialize()
            except Exception:
                pass
        return EarthEngineStatus(
            configured=True,
            authenticated=self._initialized,
            auth_method=self._auth_method if self._initialized else "UNRESOLVED",
            project_id=self.settings.gee_project_id,
            library_available=self._library_available(),
            error=self._last_error,
        )

    def _library_available(self) -> bool:
        try:
            self._import_ee()
            return True
        except Exception:
            return False


_CLIENT: Optional[EarthEngineClient] = None


def get_earth_engine_client() -> EarthEngineClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = EarthEngineClient()
    return _CLIENT
