"""
Unit tests for FloodLab scientific data integrity, numerical guards, unit conversions,
CSI comparison logic, mass conservation, uncertainty intervals, and provenance propagation.
"""
import math
import numpy as np
import pytest

from floodlab.core.units import (
    m2_to_km2,
    km2_to_m2,
    ha_to_km2,
    km2_to_ha,
    m3_to_mcm,
    m3_to_billion_m3,
    validate_array_finite,
    validate_hydrograph_integrity,
    is_finite_number,
    sanitize_float,
)
from hydrobreach.models.scenario_comparator.comparison import ScenarioComparator
from hydrobreach.models.uncertainty.uncertainty_engine import UncertaintyEngine, UncertaintyInput
from hydrobreach.models.loss_damage.damage_estimator import LossAndDamageEngine
from floodlab.validation.metrics import SpatialMetrics, HydrographMetrics


class TestUnitConversions:
    """1. Verify rigorous spatial and volumetric unit conversions."""

    def test_m2_to_km2_exact(self):
        assert m2_to_km2(1_000_000.0) == 1.0
        assert m2_to_km2(500_000.0) == 0.5
        assert m2_to_km2(1_858_000.0) == pytest.approx(1.858, rel=1e-5)

    def test_km2_to_m2_exact(self):
        assert km2_to_m2(1.0) == 1_000_000.0
        assert km2_to_m2(1.858) == 1_858_000.0

    def test_ha_to_km2_exact(self):
        assert ha_to_km2(100.0) == 1.0
        assert ha_to_km2(18.5) == pytest.approx(0.185, rel=1e-5)

    def test_m3_to_billion_m3(self):
        assert m3_to_billion_m3(3.54e9) == pytest.approx(3.54, rel=1e-4)

    def test_m3_to_mcm(self):
        assert m3_to_mcm(1_000_000.0) == 1.0
        assert m3_to_mcm(4_200_000.0) == 4.2


class TestNumericalValidityGuards:
    """2. Verify NaN, Inf, and non-finite filtering."""

    def test_validate_finite_array_clean(self):
        valid, err = validate_array_finite([1.0, 2.5, 3.8, 12.0], "depths", min_val=0.0)
        assert valid is True
        assert err is None

    def test_validate_finite_array_nan_rejection(self):
        valid, err = validate_array_finite([1.0, float("nan"), 3.8], "depths")
        assert valid is False
        assert "NaN" in err

    def test_validate_finite_array_inf_rejection(self):
        valid, err = validate_array_finite([1.0, float("inf"), 3.8], "depths")
        assert valid is False
        assert "infinite" in err

    def test_validate_finite_array_negative_rejection(self):
        valid, err = validate_array_finite([1.0, -0.5, 3.8], "depths", min_val=0.0)
        assert valid is False
        assert "below minimum threshold" in err

    def test_sanitize_float_guards(self):
        assert sanitize_float(float("nan"), default=0.0) == 0.0
        assert sanitize_float(float("inf"), default=100.0) == 100.0
        assert sanitize_float(25.4, min_val=0.0, max_val=50.0) == 25.4
        assert sanitize_float(120.0, min_val=0.0, max_val=50.0) == 50.0


class TestCSIAndComparisonLogic:
    """3. Verify CSI threshold, POD, FAR, and invalid comparison rejection."""

    def test_csi_passing_condition(self):
        pred = np.array([True, True, True, True, False])
        obs = np.array([True, True, True, False, False])
        # TP=3, FP=1, FN=0 -> CSI = 3/(3+1+0) = 0.75 >= 0.70 (PASSED)
        csi = SpatialMetrics.csi(pred, obs)
        assert csi == 0.75
        assert csi >= 0.70

    def test_csi_failing_condition(self):
        pred = np.array([True, False, False, False, False])
        obs = np.array([True, True, True, True, False])
        # TP=1, FP=0, FN=3 -> CSI = 1/(1+0+3) = 0.25 < 0.70 (FAILED)
        csi = SpatialMetrics.csi(pred, obs)
        assert csi == 0.25
        assert csi < 0.70

    def test_scenario_comparator_invalid_prevention(self):
        # Empty or invalid frames should return COMPARISON_UNAVAILABLE, NOT PASSED
        empty_sph = {"summary": {}, "frames": [], "gauges": {}}
        empty_delft = {"summary": {}, "frames": [], "gauges": {}}
        comp = ScenarioComparator.compare_runs(empty_sph, empty_delft)

        assert comp["status"] == "COMPARISON_UNAVAILABLE"
        assert comp["overall_metrics"]["target_csi_met"] is False
        assert comp["overall_metrics"]["benchmark_status"] == "COMPARISON_UNAVAILABLE"

    def test_scenario_comparator_low_csi_fails(self):
        # Frame with mismatched wet grids giving CSI ~0.129
        grid_sph = [[0.5 if i < 2 else 0.0 for i in range(10)] for _ in range(5)]
        grid_delft = [[0.5 if i >= 8 else 0.0 for i in range(10)] for _ in range(5)]

        sph_res = {
            "summary": {"peak_surge_velocity_ms": 12.0, "max_inundated_area_km2": 5.0},
            "frames": [{"time_minutes": 10.0, "coarse_grid": {"depth_matrix": grid_sph}}],
            "gauges": {},
        }
        delft_res = {
            "summary": {"peak_surge_velocity_ms": 10.0, "max_inundated_area_km2": 5.0},
            "frames": [{"time_minutes": 10.0, "coarse_grid": {"depth_matrix": grid_delft}}],
            "gauges": {},
        }

        comp = ScenarioComparator.compare_runs(sph_res, delft_res, threshold_depth_m=0.3)
        assert comp["overall_metrics"]["critical_success_index_csi"] == 0.0
        assert comp["overall_metrics"]["target_csi_met"] is False
        assert "FAILED" in comp["overall_metrics"]["benchmark_status"]
        assert "below target" in comp["summary_comparison"]["key_findings"][2]


class TestMassAndHydrographIntegrity:
    """4. Verify hydrograph monotonicity, non-negativity, and mass conservation."""

    def test_valid_hydrograph(self):
        times = [0.0, 0.5, 1.0, 2.0, 3.0]
        flows = [0.0, 5000.0, 10000.0, 4000.0, 0.0]
        valid, vol, err = validate_hydrograph_integrity(times, flows)
        assert valid is True
        assert vol > 0
        assert err is None

    def test_negative_flow_rejected(self):
        times = [0.0, 1.0, 2.0]
        flows = [0.0, -500.0, 0.0]
        valid, vol, err = validate_hydrograph_integrity(times, flows)
        assert valid is False
        assert "below minimum" in err

    def test_non_monotonic_time_rejected(self):
        times = [0.0, 2.0, 1.0]  # Timesteps out of order
        flows = [0.0, 1000.0, 0.0]
        valid, vol, err = validate_hydrograph_integrity(times, flows)
        assert valid is False
        assert "strictly increasing" in err

    def test_mass_conservation_volume_check(self):
        times = [0.0, 1.0, 2.0]
        flows = [0.0, 1000.0, 0.0]  # Integrated vol = 0.5*2*3600*1000 = 3.6e6 m3
        valid, vol, err = validate_hydrograph_integrity(
            times, flows, expected_volume_m3=3.6e6, mass_tolerance=0.05
        )
        assert valid is True
        assert vol == pytest.approx(3.6e6, rel=1e-3)


class TestUncertaintyIntervals:
    """5. Verify P10-P90 (80% range) and P5-P95 (90% range) computation and parameter tracing."""

    def test_uncertainty_percentiles(self):
        inp = UncertaintyInput(
            preset_id="tehri_dam_bhagirathi",
            ensemble_size=25,
            variation_breach_width_pct=20.0,
            variation_formation_time_pct=25.0,
            variation_reservoir_level_m=5.0,
            variation_manning_n_pct=20.0,
        )
        res = UncertaintyEngine.run_ensemble(inp)
        assert len(res.station_uncertainties) > 0
        st0 = res.station_uncertainties[0]

        # Check percentile ordering: P5 <= P10 <= P50 <= P90 <= P95
        assert st0.arrival_time_p5_min <= st0.arrival_time_p10_min
        assert st0.arrival_time_p10_min <= st0.arrival_time_p50_min
        assert st0.arrival_time_p50_min <= st0.arrival_time_p90_min
        assert st0.arrival_time_p90_min <= st0.arrival_time_p95_min

        # Check sensitivity rankings
        assert len(res.sensitivity_rankings) == 4
        param_names = [r.parameter for r in res.sensitivity_rankings]
        assert any("Breach Width" in p for p in param_names)
        assert any("Roughness" in p for p in param_names)


class TestHADROutputIntegrity:
    """6. Verify HADR same-scenario output consistency and defensible hazard metrics."""

    def test_hadr_hazard_rating_formula(self):
        params = {
            "dam_name": "Tehri Dam",
            "reach_length_km": 100.0,
            "valley_type": "mountain_gorge",
        }
        res = LossAndDamageEngine.evaluate_scenario_damage(
            scenario_params=params,
            max_inundated_area_km2=25.0,
            peak_velocity_ms=18.0,
            max_depth_m=12.0,
            valley_type="mountain_gorge",
        )

        # HR = d * (v + 0.5) + DF = 12 * (18 + 0.5) + 1.0 = 12 * 18.5 + 1.0 = 223.0
        expected_hr = 12.0 * (18.0 + 0.5) + 1.0
        assert res["hazard_metrics"]["hazard_rating_hr"] == pytest.approx(expected_hr, rel=1e-2)
        assert "EXTREME" in res["hazard_metrics"]["hazard_level"]
        assert "hadr_zoning" in res
        assert res["hadr_zoning"]["red_zone"]["area_km2"] > 0
        assert "evacuation_priority_queue" in res
