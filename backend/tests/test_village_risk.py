"""
Comprehensive tests for village risk and rescue priority engine.
Covers:
- Spatial overlap / proximity calculation
- Probability aggregation across ensemble scenarios
- Missing data handling
- Priority scoring separations (likelihood vs RPI vs quality)
- Time-dependent road closures
- Shelter capacity accounting
- Alert queue (draft only, never dispatched)
- Demo vs data-connected mode behaviour
"""
import math
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from floodlab.engines.village_risk.risk_calculator import (
    VillageRiskCalculator,
    haversine_distance_km,
    find_nearest_corridor_chainage_km,
    risk_calculator,
)
from floodlab.engines.village_risk.schemas import (
    AlertStatus,
    DataProvenance,
    DataSourceMode,
    DemographicBreakdown,
    EnsembleScenario,
    IsolationStatus,
    PriorityTier,
    SettlementRiskProfile,
    ShelterStatus,
)
from floodlab.api.routers.village_risk import router, DEMO_ENSEMBLE, DEMO_SETTLEMENTS_RAW

app = FastAPI()
app.include_router(router, prefix="/api/village-risk")
client = TestClient(app)

calc = VillageRiskCalculator()

# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

def make_ensemble(q: float = 720000.0, prob: float = 0.85) -> EnsembleScenario:
    return EnsembleScenario(
        scenario_id="TEST_ENS", label="Test Scenario",
        breach_type="overtopping", probability_weight=prob,
        peak_discharge_m3s=q, description="Unit test ensemble",
    )

def make_demographics(pop: int = 1000, vuln: float = 1.0) -> DemographicBreakdown:
    return DemographicBreakdown(
        total_population=pop, children_under_12=int(pop * 0.2),
        elderly_over_65=int(pop * 0.1), hospital_patients_or_infirm=int(pop * 0.02),
        vulnerability_factor=vuln,
    )

def make_shelter(sid: str, lat: float, lon: float, capacity: int = 500,
                  safe: bool = True, elev_m: float = 500.0) -> ShelterStatus:
    return ShelterStatus(
        shelter_id=sid, name=f"Shelter {sid}", latitude=lat, longitude=lon,
        elevation_m=elev_m, capacity=capacity, is_safe_above_water=safe,
        provenance=DataProvenance.SYNTHETIC_DEMO,
    )

# ---------------------------------------------------------------------------
# Spatial / geometry tests
# ---------------------------------------------------------------------------

def test_haversine_zero_distance():
    assert haversine_distance_km(78.48, 30.37, 78.48, 30.37) == 0.0

def test_haversine_known_distance():
    # Tehri Dam to ~1 degree east (approx 96 km at this latitude)
    d = haversine_distance_km(78.48, 30.37, 79.48, 30.37)
    assert 90 < d < 105, f"Expected ~96km, got {d}"

def test_corridor_chainage_at_dam():
    chainage, offset = find_nearest_corridor_chainage_km(78.4810, 30.3780)
    assert chainage < 5.0, f"Dam chainage should be near 0, got {chainage}"

def test_corridor_chainage_at_rishikesh():
    # Rishikesh end of corridor
    chainage, offset = find_nearest_corridor_chainage_km(78.29, 30.08)
    assert chainage > 55.0, f"Rishikesh chainage should be ~70km, got {chainage}"

def test_high_hill_settlement_zero_depth():
    """High elevation hill village far from river should have zero inundation depth."""
    st = {"settlement_id": "X", "name": "Hill", "latitude": 30.600, "longitude": 79.000, "elevation_m": 1200.0}
    ens = make_ensemble()
    result = calc.compute_hydraulics_and_isolation(st, ens, sim_time_s=0.0)
    assert result["peak_depth_m"] == 0.0
    assert result["inundated_area_fraction"] == 0.0

def test_valley_floor_settlement_has_positive_depth():
    """Valley floor settlement close to Tehri should have significant depth."""
    st = {"settlement_id": "Y", "name": "Valley Floor", "latitude": 30.355, "longitude": 78.506, "elevation_m": 540.0}
    ens = make_ensemble(q=720000.0)
    result = calc.compute_hydraulics_and_isolation(st, ens, sim_time_s=0.0)
    assert result["peak_depth_m"] > 0, "Near-river valley settlement should have positive flood depth"

# ---------------------------------------------------------------------------
# Probability aggregation across ensemble scenarios
# ---------------------------------------------------------------------------

def test_high_discharge_gives_higher_likelihood():
    st = {"settlement_id": "Z", "name": "River", "latitude": 30.338, "longitude": 78.507, "elevation_m": 510.0}
    ens_high = make_ensemble(q=1040000.0, prob=0.8)
    ens_low = make_ensemble(q=380000.0, prob=0.8)
    result_high = calc.compute_hydraulics_and_isolation(st, ens_high, sim_time_s=0.0)
    result_low = calc.compute_hydraulics_and_isolation(st, ens_low, sim_time_s=0.0)
    assert result_high["flood_likelihood"] >= result_low["flood_likelihood"], \
        "Higher discharge should produce equal or greater flood likelihood"

def test_probability_weight_affects_likelihood():
    st = {"settlement_id": "PW", "name": "River", "latitude": 30.338, "longitude": 78.507, "elevation_m": 510.0}
    ens_high_prob = make_ensemble(q=720000.0, prob=0.95)
    ens_low_prob = make_ensemble(q=720000.0, prob=0.25)
    r_hp = calc.compute_hydraulics_and_isolation(st, ens_high_prob, sim_time_s=0.0)
    r_lp = calc.compute_hydraulics_and_isolation(st, ens_low_prob, sim_time_s=0.0)
    assert r_hp["flood_likelihood"] >= r_lp["flood_likelihood"]

# ---------------------------------------------------------------------------
# Missing data handling
# ---------------------------------------------------------------------------

def test_assess_data_connected_without_inputs_returns_422():
    resp = client.post("/api/village-risk/assess", json={"mode": "DATA_CONNECTED", "sim_time_s": 0.0})
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
    detail = resp.json()["detail"]
    assert detail["error"] == "missing_inputs"

def test_assess_demo_mode_always_works():
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 0.0, "scenario_id": "ENS_P50"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["mode"] == "DEMO"
    assert "SYNTHETIC DEMO" in data["mode_banner"]
    assert len(data["settlements"]) > 0

# ---------------------------------------------------------------------------
# Priority scoring - strict separation requirement
# ---------------------------------------------------------------------------

def test_likelihood_priority_quality_are_separate_fields():
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 0.0})
    assert resp.status_code == 200
    settlement = resp.json()["settlements"][0]
    assert "flood_likelihood" in settlement
    assert "response_priority_index" in settlement
    assert "data_quality_score" in settlement
    # They must be numerically distinct fields
    assert settlement["flood_likelihood"] != settlement["response_priority_index"], \
        "flood_likelihood and response_priority_index must be separate values"

def test_rpi_is_bounded_0_to_100():
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 1800.0, "scenario_id": "ENS_P90"})
    assert resp.status_code == 200
    for s in resp.json()["settlements"]:
        assert 0.0 <= s["response_priority_index"] <= 100.0, \
            f"RPI out of bounds: {s['response_priority_index']} for {s['name']}"

def test_flood_likelihood_is_bounded_0_to_1():
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 0.0})
    assert resp.status_code == 200
    for s in resp.json()["settlements"]:
        assert 0.0 <= s["flood_likelihood"] <= 1.0, \
            f"Likelihood out of bounds: {s['flood_likelihood']} for {s['name']}"

def test_data_quality_score_demo_is_below_full():
    """Demo mode data quality should be < 1.0 (not claiming full confidence)."""
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 0.0})
    assert resp.status_code == 200
    for s in resp.json()["settlements"]:
        assert s["data_quality_score"] < 1.0, \
            f"Demo data quality should be < 1.0 for {s['name']}"

def test_critical_settlements_ranked_first():
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 1500.0, "scenario_id": "ENS_P90"})
    assert resp.status_code == 200
    settlements = resp.json()["settlements"]
    rpis = [s["response_priority_index"] for s in settlements]
    assert rpis == sorted(rpis, reverse=True), "Settlements should be sorted by RPI descending"

# ---------------------------------------------------------------------------
# Time-dependent road closures
# ---------------------------------------------------------------------------

def test_road_cutoff_time_changes_isolation_status():
    # At time 0: road should be accessible
    resp_t0 = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 0.0, "scenario_id": "ENS_P50"})
    assert resp_t0.status_code == 200
    early_statuses = {s["settlement_id"]: s["isolation_status"] for s in resp_t0.json()["settlements"]}

    # At time 3600: some roads should be cut off
    resp_t3600 = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 3600.0, "scenario_id": "ENS_P50"})
    assert resp_t3600.status_code == 200
    late_statuses = {s["settlement_id"]: s["isolation_status"] for s in resp_t3600.json()["settlements"]}

    # At minimum, status should not IMPROVE (no village becomes more accessible over time)
    # Some will have changed from ACCESSIBLE to isolated
    any_changed = any(
        early_statuses.get(sid) != late_statuses.get(sid)
        for sid in early_statuses
    )
    assert any_changed, "Isolation status should evolve as sim time advances"

def test_countdown_decreases_as_time_advances():
    resp_early = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 600.0})
    resp_late = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 1200.0})
    early_s = resp_early.json()["settlements"]
    late_s = resp_late.json()["settlements"]
    for e, l in zip(early_s, late_s):
        if e["settlement_id"] == l["settlement_id"] and e["time_to_isolation_countdown_min"] is not None and l["time_to_isolation_countdown_min"] is not None:
            if e["isolation_status"] == "ACCESSIBLE":
                assert l["time_to_isolation_countdown_min"] <= e["time_to_isolation_countdown_min"], \
                    f"Countdown should decrease for {e['name']}"

# ---------------------------------------------------------------------------
# Shelter capacity
# ---------------------------------------------------------------------------

def test_shelter_capacity_accounting():
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 0.0})
    assert resp.status_code == 200
    data = resp.json()
    total_capacity = sum(s["capacity"] for s in data["shelters"])
    assert data["shelter_capacity_total"] == total_capacity

    for sh in data["shelters"]:
        assert sh["allocated_evacuees"] >= 0
        assert sh["surplus_capacity"] == sh["capacity"] - sh["allocated_evacuees"]
        assert 0.0 <= sh["occupancy_percent"] <= 100.0

def test_shelter_allocation_does_not_exceed_capacity():
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 0.0})
    assert resp.status_code == 200
    for sh in resp.json()["shelters"]:
        assert sh["allocated_evacuees"] <= sh["capacity"], \
            f"Shelter {sh['name']} over-allocated: {sh['allocated_evacuees']} > {sh['capacity']}"

def test_safe_shelters_not_unsafe_ones_preferred():
    """Unsafe shelters should not be selected when safe ones exist."""
    shelters = [
        make_shelter("unsafe", lat=30.338, lon=78.507, capacity=1000, safe=False),
        make_shelter("safe", lat=30.340, lon=78.510, capacity=1000, safe=True),
    ]
    settlements = [{"settlement_id": "T1", "name": "Test", "latitude": 30.338, "longitude": 78.507,
                    "population": 200, "road_cutoff_s": 3600.0}]
    routes, updated = calc.allocate_shelters_and_routes(settlements, shelters, sim_time_s=0.0)
    if routes:
        assert routes[0].shelter_id == "safe", "Should route to safe shelter, not unsafe one"

# ---------------------------------------------------------------------------
# Alert queue - draft only, never dispatched
# ---------------------------------------------------------------------------

def test_alerts_are_draft_status():
    # Run assessment to populate alerts
    client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 1800.0, "scenario_id": "ENS_P90"})
    resp = client.get("/api/village-risk/alerts")
    assert resp.status_code == 200
    data = resp.json()
    assert "human_in_loop_warning" in data
    for alert in data["alerts"]:
        assert alert["review_status"] in ["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED"]

def test_alert_review_update():
    client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 1800.0, "scenario_id": "ENS_P90"})
    alerts_resp = client.get("/api/village-risk/alerts")
    alerts = alerts_resp.json()["alerts"]
    if not alerts:
        pytest.skip("No alerts generated")
    alert_id = alerts[0]["alert_id"]
    review_resp = client.post(f"/api/village-risk/alerts/{alert_id}/review",
                               json={"review_status": "APPROVED", "reviewed_by": "IC_TEST", "review_notes": "Cleared"})
    assert review_resp.status_code == 200
    assert "does NOT dispatch" in review_resp.json()["human_in_loop_warning"]

def test_alert_message_contains_scenario_assumptions():
    client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 1800.0, "scenario_id": "ENS_P90"})
    alerts_resp = client.get("/api/village-risk/alerts")
    for alert in alerts_resp.json()["alerts"]:
        assert alert.get("scenario_assumptions"), "Alert must include scenario assumptions"
        assert alert.get("issue_time_utc"), "Alert must include issue time"
        assert alert.get("recommended_action"), "Alert must include recommended action"

# ---------------------------------------------------------------------------
# Ensemble scenario endpoints
# ---------------------------------------------------------------------------

def test_demo_ensemble_returns_three_scenarios():
    resp = client.get("/api/village-risk/demo/ensemble")
    assert resp.status_code == 200
    scenarios = resp.json()["scenarios"]
    assert len(scenarios) == 3
    weights = sum(s["probability_weight"] for s in scenarios)
    assert abs(weights - 1.0) < 0.01, f"Ensemble weights should sum to 1.0, got {weights}"

def test_demo_settlements_endpoint():
    resp = client.get("/api/village-risk/demo/settlements")
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] == "SYNTHETIC_DEMO"
    assert len(data["settlements"]) >= 8

def test_demo_shelters_endpoint():
    resp = client.get("/api/village-risk/demo/shelters")
    assert resp.status_code == 200
    assert resp.json()["mode"] == "SYNTHETIC_DEMO"

def test_status_endpoint_reports_missing_inputs():
    resp = client.get("/api/village-risk/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["demo_mode"]["available"] is True
    assert data["data_connected_mode"]["available"] is False
    assert len(data["data_connected_mode"]["missing_inputs"]) > 0

# ---------------------------------------------------------------------------
# Uncertainty bounds - clearly distinguished from deterministic values
# ---------------------------------------------------------------------------

def test_uncertainty_bounds_present_in_assessment():
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 0.0})
    assert resp.status_code == 200
    bounds = resp.json()["uncertainty_bounds"]
    assert len(bounds) >= 3
    for b in bounds:
        assert b["p10_optimistic"] < b["p50_median"] < b["p90_conservative"], \
            f"P10 < P50 < P90 required for {b['metric']}"

# ---------------------------------------------------------------------------
# Dataset manifest honesty
# ---------------------------------------------------------------------------

def test_dataset_manifest_labels_demo_correctly():
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 0.0})
    manifest = resp.json()["dataset_manifest"]
    assert manifest["mode"] == "DEMO"
    assert manifest["settlements_source"] == "SYNTHETIC_DEMO"
    assert manifest["flood_source"] == "ANALYTICAL_WAVE_PROPAGATION"
    assert manifest["missing_inputs"] == []

def test_full_assessment_returns_complete_structure():
    resp = client.post("/api/village-risk/assess", json={"mode": "DEMO", "sim_time_s": 0.0, "scenario_id": "ENS_P50"})
    assert resp.status_code == 200
    data = resp.json()
    required_keys = ["assessment_id", "timestamp_utc", "mode", "mode_banner", "scenario_id",
                     "settlements", "shelters", "evacuation_routes", "alerts_queue",
                     "uncertainty_bounds", "dataset_manifest"]
    for k in required_keys:
        assert k in data, f"Missing key: {k}"
