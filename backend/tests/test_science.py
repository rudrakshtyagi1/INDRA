"""
Automated tests for FloodLab Scientific Pipeline and Artifact Registry endpoints.
"""
from fastapi.testclient import TestClient
from floodlab.api.main import app

client = TestClient(app)


def test_get_science_pipeline():
    response = client.get("/api/science/pipeline")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 10
    assert data[0]["name"] == "Data Ingestion & Preprocessing"
    assert data[3]["name"] == "DualSPHysics 5.4 Near-Field"


def test_get_science_data_sources():
    response = client.get("/api/science/data-sources")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 8


def test_get_run_hydrology():
    response = client.get("/api/runs/v4_extended/hydrology")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "AVAILABLE"
    assert data["evaluation_metrics"]["observed_peak_m3s"] == 852.93
    assert data["evaluation_metrics"]["modelled_peak_m3s"] == 866.81
    assert data["peak_scenarios"]["base_peak_m3s"] == 2113.68


def test_get_run_breach():
    response = client.get("/api/runs/v4_extended/breach")
    assert response.status_code == 200
    data = response.json()
    assert data["benchmark_peaks"]["base_peak_m3s"] == 723705.5


def test_get_run_sph():
    response = client.get("/api/runs/v4_extended/sph")
    assert response.status_code == 200
    data = response.json()
    assert data["solver"] == "DualSPHysics 5.4 CPU"
    assert data["particle_bookkeeping"]["remaining_particles"] == 700
    assert data["checkpoint"]["section_peak_discharge_prototype_m3s"] == 300000.0


def test_get_run_sph_frames():
    response = client.get("/api/runs/v4_extended/sph/frames")
    assert response.status_code == 200
    data = response.json()
    assert data["total_frames"] == 41


def test_get_run_sph_frame_detail():
    response = client.get("/api/runs/v4_extended/sph/frame/0")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "AVAILABLE"
    assert len(data["frame"]["particles"]) == 36


def test_get_run_coupling():
    response = client.get("/api/runs/v4_extended/coupling")
    assert response.status_code == 200
    data = response.json()
    assert data["peak_values"]["downstream_transect_peak_prototype_m3s"] == 300000.0
    assert data["peak_values"]["peak_attenuation_pct"] == 58.5


def test_get_run_hydraulics():
    response = client.get("/api/runs/v4_extended/hydraulics")
    assert response.status_code == 200
    data = response.json()
    assert data["mass_balance_error_pct"] == 0.00023
    assert data["numerical_max_depth_m"] == 431.41


def test_get_run_temporal_metrics():
    response = client.get("/api/runs/v4_extended/temporal-metrics")
    assert response.status_code == 200
    data = response.json()
    assert len(data["metrics_series"]) == 61


def test_get_run_qa():
    response = client.get("/api/runs/v4_extended/qa")
    assert response.status_code == 200
    data = response.json()
    assert data["qa_status"] == "NUMERICAL QA PASS"


def test_get_run_exposure_timeline():
    response = client.get("/api/runs/v4_extended/exposure-timeline")
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_road_exposed_km"] == 60.819
    assert data["summary"]["total_road_segments"] == 74


def test_get_run_hadr_timeline():
    response = client.get("/api/runs/v4_extended/hadr-timeline")
    assert response.status_code == 200
    data = response.json()
    assert data["hazard_aware_bypass"]["distance_km"] is None
