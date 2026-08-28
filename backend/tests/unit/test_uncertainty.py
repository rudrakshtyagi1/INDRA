"""Unit tests for uncertainty engine."""
from floodlab.engines.uncertainty.parameter_sampler import ParameterSampler
from floodlab.engines.uncertainty.sensitivity_analysis import SensitivityAnalyzer


def test_latin_hypercube_sampling():
    sampler = ParameterSampler()
    ranges = {
        "head_m": (200.0, 260.0),
        "vol_m3": (2e9, 3.54e9),
    }
    samples = sampler.latin_hypercube(10, ranges)
    assert len(samples) == 10
    for s in samples:
        assert 200.0 <= s["head_m"] <= 260.0
        assert 2e9 <= s["vol_m3"] <= 3.54e9


def test_sensitivity_analyzer():
    analyzer = SensitivityAnalyzer()
    X = [[1.0, 2.0, 3.0, 4.0, 5.0], [5.0, 4.0, 3.0, 2.0, 1.0]]
    y = [2.0, 4.0, 6.0, 8.0, 10.0]
    corrs = analyzer.pearson_correlation(X, y)
    assert corrs[0] > 0.99
    assert corrs[1] < -0.99
    ranked = analyzer.rank_parameters(["paramA", "paramB"], corrs)
    assert len(ranked) == 2
