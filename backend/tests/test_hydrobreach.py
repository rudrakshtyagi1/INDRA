"""
Unit and Integration Tests for HydroBreach Backend Modules
"""

import pytest
import numpy as np
from hydrobreach.models.breach_mechanics import BreachMechanicsEngine, DamBreachInput
from hydrobreach.models.sph_engine.sph_solver import SPHHydroSolver, SPHSimulationConfig
from hydrobreach.models.delft3d_engine.delft3d_adapter import Delft3DHydroSolver, Delft3DModelConfig
from hydrobreach.models.scenario_comparator.comparison import ScenarioComparator
from hydrobreach.models.loss_damage.damage_estimator import LossAndDamageEngine
from hydrobreach.models.exporters.vector_exporter import GeospatialExporter
from hydrobreach.data.preset_scenarios import INDIAN_PRESET_SCENARIOS, get_preset_by_id


def test_breach_mechanics_froehlich():
    inp = DamBreachInput(
        dam_name="Test Earthen Dam",
        dam_type="earthen",
        dam_height_m=40.0,
        reservoir_volume_m3=10000000.0, # 10 Mm³
        hydraulic_head_m=35.0,
        crest_length_m=300.0,
        breach_mode="overtopping"
    )
    res = BreachMechanicsEngine.calculate_froehlich_2008(inp)
    assert res.avg_breach_width_m > 20.0
    assert res.breach_formation_time_hrs > 0.1
    assert res.peak_discharge_m3s > 500.0
    assert len(res.breach_hydrograph_time_hrs) == len(res.breach_hydrograph_discharge_m3s)


def test_breach_mechanics_ritter():
    inp = DamBreachInput(
        dam_name="Test Concrete Gravity Dam",
        dam_type="concrete_gravity",
        dam_height_m=60.0,
        reservoir_volume_m3=20000000.0,
        hydraulic_head_m=55.0,
        crest_length_m=250.0,
        breach_mode="instantaneous"
    )
    res = BreachMechanicsEngine.calculate_instantaneous_ritter(inp)
    assert res.breach_formation_time_hrs <= 0.05
    assert res.peak_discharge_m3s > 1000.0
    assert "wave_front_velocity_ms" in res.summary


def test_sph_simulation_run():
    config = SPHSimulationConfig(
        particle_spacing_m=100.0,
        total_duration_s=600.0,
        save_interval_s=120.0
    )
    solver = SPHHydroSolver(config=config)
    scenario_params = {
        "reach_length_km": 10.0,
        "valley_width_m": 200.0,
        "dam_location_x_m": 1500.0,
        "dam_height_m": 35.0,
        "bed_slope": 0.01,
        "manning_n": 0.04
    }
    hydro_times = [0.0, 0.2, 0.5, 1.0]
    hydro_flows = [0.0, 3500.0, 1500.0, 200.0]

    result = solver.run_simulation(scenario_params, hydro_times, hydro_flows)
    assert "summary" in result
    assert "frames" in result
    assert len(result["frames"]) >= 2
    assert result["summary"]["peak_surge_velocity_ms"] > 0.0


def test_delft3d_simulation_run():
    config = Delft3DModelConfig(
        nx=40,
        ny=16,
        domain_length_m=10000.0,
        domain_width_m=800.0,
        total_duration_s=600.0,
        save_interval_s=120.0
    )
    solver = Delft3DHydroSolver(config=config)
    scenario_params = {
        "reach_length_km": 10.0,
        "valley_width_m": 800.0,
        "dam_location_x_m": 1500.0,
        "dam_height_m": 35.0,
        "bed_slope": 0.01,
        "manning_n": 0.038
    }
    hydro_times = [0.0, 0.2, 0.5, 1.0]
    hydro_flows = [0.0, 3500.0, 1500.0, 200.0]

    result = solver.run_simulation(scenario_params, hydro_times, hydro_flows)
    assert "summary" in result
    assert "frames" in result
    assert len(result["frames"]) >= 2
    assert result["summary"]["max_inundated_area_km2"] > 0.0


def test_scenario_comparator():
    # Synthetic frame test
    sph_res = {
        "summary": {"peak_surge_velocity_ms": 18.5, "max_inundated_area_km2": 4.5},
        "frames": [
            {
                "time_minutes": 10.0,
                "inundated_area_km2": 3.8,
                "coarse_grid": {"depth_matrix": [[1.2, 0.8, 0.0], [2.1, 1.5, 0.4]]}
            }
        ],
        "gauges": {"gauge_5km": {"x_km": 5.0, "time_min": [10.0], "depth_m": [2.5]}}
    }
    delft_res = {
        "summary": {"peak_surge_velocity_ms": 16.2, "max_inundated_area_km2": 4.8},
        "frames": [
            {
                "time_minutes": 10.0,
                "inundated_area_km2": 4.0,
                "coarse_grid": {"depth_matrix": [[1.0, 0.9, 0.0], [1.9, 1.4, 0.5]]}
            }
        ],
        "gauges": {"gauge_5km": {"x_km": 5.0, "time_min": [10.0], "depth_m": [2.3]}}
    }

    comp = ScenarioComparator.compare_runs(sph_res, delft_res)
    assert "overall_metrics" in comp
    assert "critical_success_index_csi" in comp["overall_metrics"]
    assert comp["overall_metrics"]["critical_success_index_csi"] > 0.5


def test_loss_damage_assessment():
    params = {"dam_name": "Rishi Ganga", "reach_name": "Dhauliganga Valley"}
    damage = LossAndDamageEngine.evaluate_scenario_damage(
        scenario_params=params,
        max_inundated_area_km2=6.5,
        peak_velocity_ms=18.2,
        max_depth_m=12.0,
        valley_type="mountain_gorge"
    )
    assert damage["hazard_metrics"]["hazard_rating_hr"] > 2.0
    assert damage["exposure_and_loss"]["total_economic_loss_crores_inr"] > 0.0
    assert "red_zone" in damage["hadr_zoning"]


def test_exporters():
    geojson_data = GeospatialExporter.generate_geojson(
        scenario_name="Rishi_Ganga_2021",
        dam_coords=(30.485, 79.738),
        reach_length_km=25.0
    )
    assert geojson_data["type"] == "FeatureCollection"
    assert len(geojson_data["features"]) >= 3

    kml_str = GeospatialExporter.generate_kml(geojson_data)
    assert "<kml" in kml_str
    assert "</kml>" in kml_str

    shp_zip = GeospatialExporter.generate_shapefile_zip(geojson_data)
    assert len(shp_zip) > 100


def test_hydrology_engine():
    from hydrobreach.models.hydrology.hydrology_engine import HydrologyEngine, HydrologyInput
    inp = HydrologyInput(
        catchment_area_km2=7500.0,
        curve_number_cn=78.0,
        rainfall_24h_mm=180.0,
        time_of_concentration_hrs=6.5
    )
    res = HydrologyEngine.calculate_scs_cn_runoff(inp)
    assert res.total_runoff_depth_pe_mm > 50.0
    assert res.peak_inflow_discharge_m3s > 1000.0
    assert len(res.inflow_hydrograph_m3s) == len(res.time_series_hrs)


def test_uncertainty_engine():
    from hydrobreach.models.uncertainty.uncertainty_engine import UncertaintyEngine, UncertaintyInput
    inp = UncertaintyInput(
        preset_id="tehri_dam_bhagirathi",
        ensemble_size=10
    )
    res = UncertaintyEngine.run_ensemble(inp)
    assert res.ensemble_size == 10
    assert len(res.station_uncertainties) >= 3
    assert len(res.sensitivity_rankings) >= 3

