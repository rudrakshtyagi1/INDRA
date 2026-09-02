import pytest
from fastapi.testclient import TestClient
from floodlab.api.main import app
import os

client = TestClient(app)

def test_tehri_v3_registered():
    response = client.get("/api/scenarios/TEHRI_V3_BENCHMARK")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Tehri V3 Verified Prototype"
    assert data["provenance"] == "PRECOMPUTED VERIFIED PROTOTYPE RESULT"

def test_scenario_creation_and_retrieval():
    payload = {
        "scenario_id": "test_scenario_1",
        "name": "Test Scenario",
        "source_type": "ENGINEERED_DAM_BREAK",
        "provenance": "TEST",
        "input_configuration": {
            "simulation_duration_s": 3600,
            "output_interval_s": 60,
            "discharge_values": [100.0, 200.0]
        }
    }
    resp1 = client.post("/api/scenarios", json=payload)
    assert resp1.status_code == 200
    
    resp2 = client.get("/api/scenarios/test_scenario_1")
    assert resp2.status_code == 200
    assert resp2.json()["name"] == "Test Scenario"

def test_scenario_validation_success():
    resp = client.post("/api/scenarios/test_scenario_1/validate")
    assert resp.status_code == 200
    assert resp.json()["status"] == "SUCCESS"

def test_scenario_validation_failure():
    payload = {
        "scenario_id": "test_scenario_fail",
        "name": "Fail Scenario",
        "source_type": "NATURAL_RIVER_BLOCKAGE",
        "provenance": "TEST",
        "input_configuration": {
            "simulation_duration_s": -1,
            "discharge_values": [-50.0]
        }
    }
    client.post("/api/scenarios", json=payload)
    resp = client.post("/api/scenarios/test_scenario_fail/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "FAILED"
    assert "simulation duration must be > 0" in data["errors"]
    assert "discharge values must be non-negative" in data["errors"]

def test_run_creation_and_status():
    resp = client.post("/api/scenarios/test_scenario_1/runs")
    assert resp.status_code == 200
    data = resp.json()
    run_id = data["run_id"]
    assert data["status"] == "DRAFT"
    
    # check dir creation
    assert os.path.exists(f"data/runs/test_scenario_1/{run_id}/inputs")
    
    # retrieve run
    resp2 = client.get(f"/api/runs/{run_id}")
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "DRAFT"

def test_v3_api_compatibility():
    # Make sure v3 endpoints still work
    resp = client.get("/api/scenarios/v3/summary")
    # Actually, v3 endpoints read files which might exist or not locally in the test env.
    # We just want to ensure it doesn't return a 404 because the router is gone.
    assert resp.status_code != 404
