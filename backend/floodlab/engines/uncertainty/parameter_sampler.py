"""
Parameter sampler for ensemble uncertainty analysis.
Latin Hypercube Sampling (LHS) for better parameter space coverage.
"""
from __future__ import annotations
import random
from typing import Dict, List


class ParameterSampler:
    def latin_hypercube(self, n_samples: int, param_ranges: Dict[str, tuple]) -> List[Dict]:
        """
        Latin Hypercube Sampling: divides each range into n_samples equal intervals,
        samples one point per interval, then shuffles.
        """
        params = list(param_ranges.keys())
        intervals = {p: list(range(n_samples)) for p in params}
        for p in params:
            random.shuffle(intervals[p])

        samples = []
        for i in range(n_samples):
            sample = {}
            for p in params:
                lo, hi = param_ranges[p]
                interval = intervals[p][i]
                sample[p] = lo + (hi - lo) * (interval + random.random()) / n_samples
            samples.append(sample)
        return samples

    def gaussian_perturbation(self, base_value: float, std_pct: float, n: int = 1) -> List[float]:
        """Gaussian perturbation around base value."""
        std = base_value * std_pct / 100.0
        return [max(base_value * 0.1, base_value + random.gauss(0, std)) for _ in range(n)]
