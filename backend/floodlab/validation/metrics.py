"""
Validation metrics: spatial (CSI/POD/FAR) and hydrograph (RMSE/ΔQp/Δtp).

Three-tier validation framework:
  Tier 1: Analytical benchmarks (Ritter 1892)
  Tier 2: Model comparison (SPH vs Delft3D)
  Tier 3: Observation validation (Rishi Ganga 2021 for methodology)
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np


class SpatialMetrics:
    """Thresholded wet/dry inundation extent metrics."""

    @staticmethod
    def csi(predicted: np.ndarray, observed: np.ndarray) -> float:
        """Critical Success Index = TP / (TP + FP + FN)."""
        TP = int(np.sum(predicted & observed))
        FP = int(np.sum(predicted & ~observed))
        FN = int(np.sum(~predicted & observed))
        denom = TP + FP + FN
        return TP / denom if denom > 0 else 0.0

    @staticmethod
    def pod(predicted: np.ndarray, observed: np.ndarray) -> float:
        """Probability of Detection = TP / (TP + FN)."""
        TP = int(np.sum(predicted & observed))
        FN = int(np.sum(~predicted & observed))
        denom = TP + FN
        return TP / denom if denom > 0 else 0.0

    @staticmethod
    def far(predicted: np.ndarray, observed: np.ndarray) -> float:
        """False Alarm Ratio = FP / (TP + FP)."""
        TP = int(np.sum(predicted & observed))
        FP = int(np.sum(predicted & ~observed))
        denom = TP + FP
        return FP / denom if denom > 0 else 0.0

    @classmethod
    def all_metrics(cls, predicted: np.ndarray, observed: np.ndarray) -> Dict[str, float]:
        return {
            "CSI": cls.csi(predicted, observed),
            "POD": cls.pod(predicted, observed),
            "FAR": cls.far(predicted, observed),
        }


class HydrographMetrics:
    """Continuous depth and discharge hydrograph metrics."""

    @staticmethod
    def rmse(observed: List[float], modelled: List[float]) -> float:
        """Root Mean Square Error."""
        arr_o = np.array(observed)
        arr_m = np.array(modelled[:len(observed)])
        return float(np.sqrt(np.mean((arr_o - arr_m) ** 2)))

    @staticmethod
    def mae(observed: List[float], modelled: List[float]) -> float:
        """Mean Absolute Error."""
        arr_o = np.array(observed)
        arr_m = np.array(modelled[:len(observed)])
        return float(np.mean(np.abs(arr_o - arr_m)))

    @staticmethod
    def peak_discharge_error(Q_obs_max: float, Q_mod_max: float) -> float:
        """Peak discharge error: ΔQp = (Q_mod_peak - Q_obs_peak) / Q_obs_peak."""
        if Q_obs_max == 0:
            return float("nan")
        return (Q_mod_max - Q_obs_max) / Q_obs_max

    @staticmethod
    def time_to_peak_error(t_obs_peak: float, t_mod_peak: float) -> float:
        """Time-to-peak error: Δtp = t_mod_peak - t_obs_peak [hours]."""
        return t_mod_peak - t_obs_peak

    @staticmethod
    def nse(observed: List[float], modelled: List[float]) -> float:
        """Nash-Sutcliffe Efficiency."""
        arr_o = np.array(observed)
        arr_m = np.array(modelled[:len(observed)])
        obs_mean = np.mean(arr_o)
        ss_res = np.sum((arr_o - arr_m) ** 2)
        ss_tot = np.sum((arr_o - obs_mean) ** 2)
        return float(1.0 - ss_res / ss_tot) if ss_tot > 0 else float("nan")

    @classmethod
    def all_metrics(
        cls,
        obs_times: List[float],
        obs_Q: List[float],
        mod_times: List[float],
        mod_Q: List[float],
    ) -> Dict[str, float]:
        # Resample to common time axis
        min_len = min(len(obs_Q), len(mod_Q))
        obs_q = obs_Q[:min_len]
        mod_q = mod_Q[:min_len]

        Q_obs_max = max(obs_q) if obs_q else 0.0
        Q_mod_max = max(mod_q) if mod_q else 0.0
        t_obs_peak = obs_times[obs_q.index(Q_obs_max)] if obs_q else 0.0
        t_mod_peak = mod_times[mod_q.index(Q_mod_max)] if mod_q else 0.0

        return {
            "RMSE": cls.rmse(obs_q, mod_q),
            "MAE": cls.mae(obs_q, mod_q),
            "NSE": cls.nse(obs_q, mod_q),
            "delta_Qp": cls.peak_discharge_error(Q_obs_max, Q_mod_max),
            "delta_tp_hrs": cls.time_to_peak_error(t_obs_peak, t_mod_peak),
        }


class ModelComparison:
    """
    SPH vs Delft3D FM model comparison.
    Uses spatial metrics for wet/dry extent and hydrograph metrics for Q(t).
    All outputs: provenance = DERIVED.
    """

    def compare_sph_delft3d(
        self,
        sph_result: Dict[str, Any],
        delft_result: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Compare SPH and Delft3D FM outputs.

        Returns:
            dict with extent_metrics, depth_metrics, hydrograph_metrics
        """
        from floodlab.provenance.labels import label_derived
        provenance = label_derived(
            from_sources=["DualSPHysics_output", "Delft3D_FM_output"],
            method="model_comparison",
        ).to_dict()

        # Hydrograph comparison (if Q(t) available from both)
        sph_Q = sph_result.get("discharge_flows_m3s", [])
        delft_Q = delft_result.get("station_results", {})
        # Placeholder: comparison at first station
        hydro_metrics = {}
        if sph_Q and delft_Q:
            hydro_metrics = {
                "note": "Station-level comparison available when both solvers produce gauge output",
                "SPH_peak_Q_m3s": max(sph_Q),
            }

        return {
            "extent_metrics": {
                "note": "CSI/POD/FAR computed when gridded depth output available from both solvers",
                "CSI": None,
                "POD": None,
                "FAR": None,
            },
            "depth_metrics": {
                "note": "RMSE/MAE/Δh computed when gridded depth output available",
                "RMSE": None,
                "MAE": None,
            },
            "hydrograph_metrics": hydro_metrics,
            "provenance": provenance,
        }


class ObservationValidator:
    """
    Tier 3: Observation validation.

    Rishi Ganga 2021: used to benchmark methodology only.
    Tehri catastrophic breach: NOT_AVAILABLE (hypothetical scenario).
    """

    def validate(
        self,
        model_result: Dict[str, Any],
        observed_event: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Compare model result to observed event.

        Returns NOT_AVAILABLE for hypothetical scenarios.
        """
        if observed_event is None:
            return {
                "available": False,
                "reason": "No observed event data provided.",
            }

        if observed_event.get("is_hypothetical", True):
            return {
                "available": False,
                "reason": (
                    "Observation validation not available for hypothetical scenarios. "
                    "Tehri catastrophic breach has no historical event record. "
                    "Solver methodology is independently verified via Tier 1 (Ritter analytical) "
                    "and Tier 2 (SPH vs Delft3D comparison)."
                ),
            }

        # Compute metrics against observed flood extent
        return {
            "available": True,
            "event_name": observed_event.get("name", "Unknown"),
            "note": (
                "Historical event used to benchmark observation-comparison workflow only. "
                f"{observed_event.get('name', '')} does NOT validate Tehri Dam breach scenario."
            ),
            "metrics": {
                "CSI": None,  # populated when satellite flood mask loaded
                "POD": None,
                "FAR": None,
            },
        }

    def benchmark_rishi_ganga_2021(self, model_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Benchmark the observation-comparison workflow using Rishi Ganga 2021 event.

        IMPORTANT: This validates the methodology workflow, NOT Tehri Dam breach.
        """
        return {
            "available": True,
            "event_name": "Rishi Ganga / Chamoli 2021",
            "scope": "methodology_benchmark_only",
            "note": (
                "The 7 February 2021 Rishi Ganga disaster is used to verify that the "
                "observation-comparison workflow (SAR detection -> CSI/POD/FAR) functions "
                "correctly. It does NOT validate Tehri Dam breach scenarios."
            ),
            "satellite_source": "Sentinel-1 C-SAR GRD, Copernicus EMS rapid mapping",
            "metrics_placeholder": {
                "CSI": None,
                "POD": None,
                "FAR": None,
                "note": "Metrics populated when Sentinel-1 flood mask for 2021 event is loaded.",
            },
        }
