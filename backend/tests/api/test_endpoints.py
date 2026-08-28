"""API endpoints tests using TestClient."""
import pytest
from fastapi.testclient import TestClient
from floodlab.api.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_list_presets():
    res = client.get("/api/scenarios/presets")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list) or "scenarios" in data


def test_calculate_hydrology():
    res = client.post("/api/hydrology/calculate", json={
        "catchment_area_km2": 100.0,
        "curve_number_cn": 80.0,
        "rainfall_24h_mm": 150.0,
        "time_of_concentration_hrs": 4.0,
    })
    assert res.status_code == 200
    data = res.json()
    assert data.get("peak_inflow_m3s", 0) > 0 or data.get("peak_inflow_discharge_m3s", 0) > 0


def test_run_simulation():
    res = client.post("/api/simulations/run", json={
        "scenario_id": "tehri_base",
        "solver_type": "coupled",
        "breach_model": "froehlich_2008",
    })
    assert res.status_code == 200
    data = res.json()
    assert "run_id" in data
    assert "breach_mechanics" in data
    assert "damage_assessment" in data

    # Retrieve run status
    run_id = data["run_id"]
    status_res = client.get(f"/api/simulations/{run_id}/status")
    assert status_res.status_code == 200
