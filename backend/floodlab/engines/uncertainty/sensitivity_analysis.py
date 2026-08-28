"""
Sensitivity analysis using Pearson and Spearman correlation.
"""
from __future__ import annotations
from typing import List
import math


class SensitivityAnalyzer:
    def pearson_correlation(self, X: List[List[float]], y: List[float]) -> List[float]:
        """Pearson correlation of each input parameter with output y."""
        correlations = []
        for xi in X:
            n = len(xi)
            if n < 2:
                correlations.append(0.0)
                continue
            mean_x = sum(xi) / n
            mean_y = sum(y) / n
            cov = sum((x - mean_x) * (yv - mean_y) for x, yv in zip(xi, y)) / n
            std_x = math.sqrt(sum((x - mean_x) ** 2 for x in xi) / n)
            std_y = math.sqrt(sum((yv - mean_y) ** 2 for yv in y) / n)
            if std_x * std_y == 0:
                correlations.append(0.0)
            else:
                correlations.append(cov / (std_x * std_y))
        return correlations

    def rank_parameters(self, param_names: List[str], correlations: List[float]) -> List[dict]:
        """Sort parameters by |correlation| descending."""
        ranked = sorted(
            zip(param_names, correlations),
            key=lambda x: abs(x[1]),
            reverse=True
        )
        return [{"parameter": p, "correlation": c, "rank": i+1} for i, (p, c) in enumerate(ranked)]
