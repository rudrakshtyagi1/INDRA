"""Integration tests for SPH and Delft3D adapters."""
from floodlab.engines.sph.dualsphysics_adapter import DualSPHysicsAdapter
from floodlab.engines.delft3d.dflowfm_adapter import Delft3DFMAdapter


def test_sph_adapter_stub(tmp_path):
    adapter = DualSPHysicsAdapter()
    scenario_params = {"hydraulic_head_m": 260.0, "reservoir_volume_m3": 3.54e9}
    breach_result = {"peak_discharge_m3s": 25000.0, "formation_time_hrs": 0.5, "avg_breach_width_m": 200.0}
    res = adapter.run(scenario_params, breach_result, tmp_path)
    assert res["stub_used"] is True
    assert res["peak_velocity_ms"] > 0
    assert res["provenance"]["level"] == "MODELLED"


def test_delft3d_adapter_stub(tmp_path):
    adapter = Delft3DFMAdapter()
    scenario_params = {
        "reach_length_km": 100.0,
        "manning_n": 0.042,
        "downstream_stations": [{"id": "rishikesh", "chainage_km": 77.0}],
    }
    coupling_result = {"peak_Q_m3s": 25000.0}
    res = adapter.run(scenario_params, coupling_result, tmp_path)
    assert res["stub_used"] is True
    assert "rishikesh" in res["station_results"]
    assert res["provenance"]["level"] == "MODELLED"
