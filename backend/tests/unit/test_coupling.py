"""Unit tests for coupling engine."""
import pytest
from floodlab.engines.coupling.sph_to_delft3d import CouplingEngine, TemporalResampler


def test_temporal_resampler():
    resampler = TemporalResampler()
    orig_times = [0.0, 10.0, 20.0, 30.0]
    orig_Q = [0.0, 100.0, 50.0, 0.0]
    res_times, res_Q = resampler.resample(orig_times, orig_Q, target_dt_s=5.0)
    assert len(res_times) > len(orig_times)
    assert res_times[0] == 0.0
    err = resampler.check_mass_conservation(orig_times, orig_Q, res_times, res_Q)
    assert err < 0.05


def test_coupling_engine(tmp_path):
    coupling = CouplingEngine()
    sph_output = {
        "discharge_times_hrs": [0.0, 0.5, 1.0, 2.0],
        "discharge_flows_m3s": [0.0, 5000.0, 2500.0, 0.0],
    }
    result = coupling.couple(sph_output, tmp_path)
    assert pytest.approx(result["peak_Q_m3s"], rel=0.01) == 5000.0
    assert result["mass_conservation_error_pct"] < 5.0
    assert result["provenance"]["level"] == "DERIVED"
