import os
import pytest
from fastapi.testclient import TestClient
from floodlab.api.main import app

client = TestClient(app)


def test_tehri_v3_registered():
    response = client.get("/api/scenarios/TEHRI_V3_BENCHMARK")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] in {"Tehri Dam V3 Benchmark", "Tehri V3 Verified Prototype"}
    assert data["provenance"] == "PRECOMPUTED VERIFIED PROTOTYPE RESULT"


def test_scenario_creation_and_retrieval():
    payload = {
        "scenario_id": "test_scenario_1",
        "name": "Test Scenario",
        "source_type": "ENGINEERED_DAM_BREAK",
        "provenance": "TEST",
        "river_dam_metadata": {
            "dam_name": "Test Dam",
            "latitude": 30.38,
            "longitude": 78.48,
        },
        "input_configuration": {
            "dem_filename": "terrain.tif",
            "dem_crs": "EPSG:32644",
            "dam_height": 260.5,
            "reservoir_storage": 3.54e9,
            "breach_width": 248.5,
            "breach_time": 1.85,
            "simulation_duration_s": 3600,
            "output_interval_s": 60,
            "far_field_solver": "LISFLOOD-FP",
        },
    }
    resp1 = client.post("/api/scenarios", json=payload)
    assert resp1.status_code == 200

    resp2 = client.get("/api/scenarios/test_scenario_1")
    assert resp2.status_code == 200
    assert resp2.json()["name"] == "Test Scenario"


def test_scenario_validation_success():
    resp = client.post("/api/scenarios/test_scenario_1/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "PASS"
    assert len(data["errors"]) == 0


def test_scenario_validation_failure():
    payload = {
        "scenario_id": "test_scenario_fail",
        "name": "Fail Scenario",
        "source_type": "NATURAL_RIVER_BLOCKAGE",
        "provenance": "TEST",
        "river_dam_metadata": {
            "latitude": 999.0,
            "longitude": 78.48,
        },
        "input_configuration": {
            "simulation_duration_s": -1,
            "output_interval_s": -1,
            "hydrology_type": "upload",
            "hydrograph_filename": "hydro.csv",
            "hydrograph_timestamps": [0, 60],
            "hydrograph_discharges": [-50.0, 100.0],
        },
    }
    client.post("/api/scenarios", json=payload)
    resp = client.post("/api/scenarios/test_scenario_fail/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "FAIL"
    assert any("duration must be > 0" in e.lower() for e in data["errors"])
    assert any("discharge values must be non-negative" in e.lower() for e in data["errors"])
    assert any("coordinates invalid" in e.lower() for e in data["errors"])


def test_run_creation_and_status():
    resp = client.post("/api/scenarios/test_scenario_1/runs")
    assert resp.status_code == 200
    data = resp.json()
    run_id = data["run_id"]
    assert data["status"] == "READY"

    # check dir creation
    assert os.path.exists(f"data/runs/test_scenario_1/{run_id}/inputs")

    # retrieve run
    resp2 = client.get(f"/api/runs/{run_id}")
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "READY"


def test_v3_api_compatibility():
    # Make sure v3 endpoints still work
    resp = client.get("/api/scenarios/v3/summary")
    assert resp.status_code != 404
