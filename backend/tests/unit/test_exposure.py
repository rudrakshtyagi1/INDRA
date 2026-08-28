"""Unit tests for exposure and loss damage."""
from floodlab.engines.loss_damage.damage_estimator import DamageEstimator
from floodlab.engines.hazard.hazard_rating import HazardRatingEngine


def test_hazard_rating_engine():
    engine = HazardRatingEngine()
    hr = engine.compute_hr(depth_m=2.0, velocity_ms=3.0, valley_type="mountain_gorge")
    assert hr == 2.0 * (3.0 + 0.5) + 1.0  # 8.0
    level = engine.classify_hr(hr)
    assert level.value == "EXTREME"


def test_damage_estimator():
    estimator = DamageEstimator()
    res = estimator.estimate(
        inundated_area_km2=20.0,
        peak_velocity_ms=4.0,
        max_depth_m=5.0,
        valley_type="mountain_gorge",
        scenario_params={"population_density_per_km2": 200.0},
    )
    assert res["population_at_risk"] == 4000
    assert res["economic_loss_crores_inr"]["total"] > 0
    assert res["hadr_resources"]["ndrf_teams"] >= 1
    assert res["provenance"]["level"] == "DERIVED"
