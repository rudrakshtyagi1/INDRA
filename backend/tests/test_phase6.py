from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from floodlab.api.routers import scenarios as scenarios_router

app = FastAPI()
app.include_router(scenarios_router.router, prefix="/api/scenarios")
client = TestClient(app)


def create_scenario(sid, source_type, cfg):
    payload = {
        "scenario_id": sid,
        "name": sid,
        "source_type": source_type,
        "river_dam_metadata": {
            "dam_name": "Test Source",
            "river": "Test River",
            "state": "Uttarakhand",
            "latitude": 30.3,
            "longitude": 78.4,
        },
        "input_configuration": {
            "simulation_duration_s": 3600,
            "output_interval_s": 60,
            "near_field_solver": "DualSPHysics",
            "far_field_solver": "LISFLOOD-FP",
            **cfg,
        },
        "provenance": "TEST",
    }
    response = client.post("/api/scenarios", json=payload)
    assert response.status_code == 200, response.text
    return payload


def test_engineered_dam_break_boundary_generation():
    sid = "phase6_engineered"
    create_scenario(sid, "ENGINEERED_DAM_BREAK", {
        "dam_height": 100,
        "hydraulic_head_m": 90,
        "reservoir_storage": 2.0e8,
        "breach_width": 80,
        "breach_time": 0.5,
    })
    val = client.post(f"/api/scenarios/{sid}/validate").json()
    assert val["status"] in {"PASS", "WARNING"}
    resp = client.post(f"/api/scenarios/{sid}/boundary/generate", json={})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["source_type"] == "ENGINEERED_DAM_BREAK"
    assert data["generation_method"] == "THEORETICAL_BROAD_CRESTED_BREACH_APPROXIMATION"
    assert data["statistics"]["peak_discharge_m3s"] > 0
    assert data["statistics"]["total_released_volume_m3"] <= 2.0e8 * 0.95 + 1


def test_natural_blockage_boundary_generation():
    sid = "phase6_blockage"
    create_scenario(sid, "NATURAL_RIVER_BLOCKAGE", {
        "impounded_volume_m3": 5.0e7,
        "blockage_height_m": 45,
        "blockage_breach_width_m": 60,
        "failure_duration_s": 900,
        "upstream_water_depth_m": 35,
    })
    val = client.post(f"/api/scenarios/{sid}/validate").json()
    assert val["status"] in {"PASS", "WARNING"}
    resp = client.post(f"/api/scenarios/{sid}/boundary/generate", json={})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["generation_method"] == "THEORETICAL_BLOCKAGE_BREACH_WEIR_APPROXIMATION"
    assert data["statistics"]["total_released_volume_m3"] <= 5.0e7 * 0.95 + 1


def test_controlled_release_schedule_and_zero_hold():
    sid = "phase6_release"
    create_scenario(sid, "CONTROLLED_RELEASE", {
        "release_start_time_s": 300,
        "release_ramp_up_s": 600,
        "peak_release_m3s": 2500,
        "release_hold_s": 0,
        "release_ramp_down_s": 900,
    })
    val = client.post(f"/api/scenarios/{sid}/validate").json()
    assert val["status"] in {"PASS", "WARNING"}
    resp = client.post(f"/api/scenarios/{sid}/boundary/generate", json={})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["generation_method"] == "DETERMINISTIC_CONTROLLED_RELEASE_SCHEDULE"
    assert data["statistics"]["peak_discharge_m3s"] == 2500
    assert data["statistics"]["time_to_peak_sec"] == 900


def test_uploaded_qt_takes_precedence():
    sid = "phase6_uploaded"
    create_scenario(sid, "NATURAL_RIVER_BLOCKAGE", {
        "hydrograph_timestamps": [0, 300, 900],
        "hydrograph_discharges": [10, 500, 0],
    })
    resp = client.post(f"/api/scenarios/{sid}/boundary/generate", json={})
    assert resp.status_code == 200
    data = resp.json()
    assert data["generation_method"] == "UPLOADED_QT_HYDROGRAPH"
    assert data["provenance"] == "USER_CONFIGURED"
    assert data["statistics"]["peak_discharge_m3s"] == 500


def test_negative_discharge_rejected():
    sid = "phase6_bad_q"
    create_scenario(sid, "CONTROLLED_RELEASE", {
        "hydrograph_timestamps": [0, 60],
        "hydrograph_discharges": [0, -1],
    })
    val = client.post(f"/api/scenarios/{sid}/validate").json()
    assert val["status"] == "FAIL"
    resp = client.post(f"/api/scenarios/{sid}/boundary/generate", json={})
    assert resp.status_code == 422


def test_non_monotonic_timestamps_rejected():
    sid = "phase6_bad_time"
    create_scenario(sid, "ENGINEERED_DAM_BREAK", {
        "hydrograph_timestamps": [0, 60, 30],
        "hydrograph_discharges": [0, 100, 50],
    })
    val = client.post(f"/api/scenarios/{sid}/validate").json()
    assert val["status"] == "FAIL"
    resp = client.post(f"/api/scenarios/{sid}/boundary/generate", json={})
    assert resp.status_code == 422


def test_missing_blockage_input_rejected():
    sid = "phase6_missing_blockage"
    create_scenario(sid, "NATURAL_RIVER_BLOCKAGE", {
        "impounded_volume_m3": 1e7,
        "blockage_height_m": 30,
        # missing breach width + failure duration
    })
    val = client.post(f"/api/scenarios/{sid}/validate").json()
    assert val["status"] == "FAIL"
    assert any("Blockage breach width" in e for e in val["errors"])


def test_run_receives_persisted_boundary_files(tmp_path, monkeypatch):
    sid = "phase6_run_persist"
    create_scenario(sid, "CONTROLLED_RELEASE", {
        "release_start_time_s": 0,
        "release_ramp_up_s": 60,
        "peak_release_m3s": 100,
        "release_hold_s": 60,
        "release_ramp_down_s": 60,
    })
    gen = client.post(f"/api/scenarios/{sid}/boundary/generate", json={})
    assert gen.status_code == 200
    run = client.post(f"/api/scenarios/{sid}/runs")
    assert run.status_code == 200
    data = run.json()
    assert data["status"] == "READY"
    assert data["solver_configuration"]["boundary_status"] == "READY"
    assert "boundary_hydrograph_csv" in data["input_paths"]
    assert Path(data["input_paths"]["boundary_hydrograph_csv"]).exists()


def test_get_boundary_endpoint():
    sid = "phase6_get_boundary"
    create_scenario(sid, "CONTROLLED_RELEASE", {
        "release_start_time_s": 0,
        "release_ramp_up_s": 60,
        "peak_release_m3s": 100,
        "release_hold_s": 60,
        "release_ramp_down_s": 60,
    })
    client.post(f"/api/scenarios/{sid}/boundary/generate", json={})
    resp = client.get(f"/api/scenarios/{sid}/boundary")
    assert resp.status_code == 200
    assert resp.json()["scenario_id"] == sid


def test_zero_duration_release_rejected():
    sid = "phase6_zero_duration"
    create_scenario(sid, "CONTROLLED_RELEASE", {
        "release_start_time_s": 0,
        "release_ramp_up_s": 0,
        "peak_release_m3s": 100,
        "release_hold_s": 0,
        "release_ramp_down_s": 60,
    })
    val = client.post(f"/api/scenarios/{sid}/validate").json()
    assert val["status"] == "FAIL"
    assert any("Ramp-up duration" in e for e in val["errors"])
