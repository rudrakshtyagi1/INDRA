"""
Path helpers for run-centric storage layout.
Every simulation run lives under storage/simulations/<run_id>/
"""
from pathlib import Path

from floodlab.config.settings import get_settings


def _settings():
    return get_settings()


def get_simulations_dir() -> Path:
    p = _settings().storage_path / "simulations"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_dir(run_id: str) -> Path:
    p = get_simulations_dir() / run_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_inputs_dir(run_id: str) -> Path:
    p = get_run_dir(run_id) / "inputs"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_hydrology_dir(run_id: str) -> Path:
    p = get_run_dir(run_id) / "hydrology"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_sph_dir(run_id: str) -> Path:
    p = get_run_dir(run_id) / "sph"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_coupling_dir(run_id: str) -> Path:
    p = get_run_dir(run_id) / "coupling"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_delft3d_dir(run_id: str) -> Path:
    p = get_run_dir(run_id) / "delft3d"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_hazard_dir(run_id: str) -> Path:
    p = get_run_dir(run_id) / "hazard"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_uncertainty_dir(run_id: str) -> Path:
    p = get_run_dir(run_id) / "uncertainty"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_exposure_dir(run_id: str) -> Path:
    p = get_run_dir(run_id) / "exposure"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_routing_dir(run_id: str) -> Path:
    p = get_run_dir(run_id) / "routing"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_run_exports_dir(run_id: str) -> Path:
    p = get_run_dir(run_id) / "exports"
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_manifest_path(run_id: str) -> Path:
    return get_run_dir(run_id) / "manifest.json"
