"""
Flood Hazard Rating Engine.

CWC / Defra flood hazard rating formula:
    HR = d * (v + 0.5) + DF

where:
    d  = water depth [m]
    v  = velocity [m/s]
    DF = debris factor (1.0 for mountain gorge, 0.5 for plains)

Reference: CWC Flood Damage Mitigation Manual; Defra/EA (2008) FD2320/TR2.
"""
from __future__ import annotations

from typing import Any, Dict, List

import numpy as np

from floodlab.config.constants import HazardLevel, ValleyType


# Debris factors by valley type
DEBRIS_FACTORS: Dict[str, float] = {
    ValleyType.MOUNTAIN_GORGE.value: 1.0,
    ValleyType.SEMI_URBAN.value: 0.7,
    ValleyType.PLAINS_ALLUVIAL.value: 0.5,
}


def debris_factor(valley_type: str) -> float:
    return DEBRIS_FACTORS.get(valley_type, 0.5)


class HazardRatingEngine:
    """
    Computes CWC/Defra flood hazard rating and classifies hazard level.
    """

    def compute_hr(self, depth_m: float, velocity_ms: float, valley_type: str) -> float:
        """
        HR = d * (v + 0.5) + DF

        Args:
            depth_m: Water depth [m].
            velocity_ms: Flow velocity [m/s].
            valley_type: ValleyType string.

        Returns:
            Hazard rating HR (dimensionless).
        """
        df = debris_factor(valley_type)
        return depth_m * (velocity_ms + 0.5) + df

    def classify_hr(self, hr: float) -> HazardLevel:
        """
        Hazard classification from HR value.

        HR < 0.75: LOW
        0.75 <= HR < 1.25: MODERATE
        1.25 <= HR < 2.50: SIGNIFICANT
        HR >= 2.50: EXTREME
        """
        if hr < 0.75:
            return HazardLevel.LOW
        elif hr < 1.25:
            return HazardLevel.MODERATE
        elif hr < 2.50:
            return HazardLevel.SIGNIFICANT
        else:
            return HazardLevel.EXTREME

    def compute_grid(
        self,
        depth_grid: np.ndarray,
        velocity_grid: np.ndarray,
        valley_type: str,
    ) -> np.ndarray:
        """
        Vectorised HR computation over a raster grid.

        Args:
            depth_grid: 2D depth array [m].
            velocity_grid: 2D velocity magnitude array [m/s].
            valley_type: Valley type string.

        Returns:
            HR grid (same shape as inputs).
        """
        df = debris_factor(valley_type)
        hr_grid = depth_grid * (velocity_grid + 0.5) + df
        hr_grid[depth_grid < 0.01] = 0.0  # dry cells have no hazard
        return hr_grid

    def hadr_zones(
        self,
        depth_grid: np.ndarray,
        velocity_grid: np.ndarray,
        valley_type: str,
        pixel_area_km2: float = 0.001,
    ) -> Dict[str, Any]:
        """
        Compute HADR zone areas from hazard rating grid.

        Returns:
            dict with red_area_km2, orange_area_km2, yellow_area_km2, total_inundated_km2
        """
        hr_grid = self.compute_grid(depth_grid, velocity_grid, valley_type)
        inundated = depth_grid > 0.01
        total_km2 = float(np.sum(inundated)) * pixel_area_km2

        red_km2 = float(np.sum(hr_grid >= 2.50)) * pixel_area_km2
        orange_km2 = float(np.sum((hr_grid >= 1.25) & (hr_grid < 2.50))) * pixel_area_km2
        yellow_km2 = float(np.sum((hr_grid >= 0.75) & (hr_grid < 1.25))) * pixel_area_km2

        return {
            "extreme_red_area_km2": red_km2,
            "significant_orange_area_km2": orange_km2,
            "moderate_yellow_area_km2": yellow_km2,
            "total_inundated_km2": total_km2,
        }


class ArrivalTimeMapper:
    """Compute flood arrival time raster from depth timeseries."""

    def compute_grid(
        self,
        depth_timeseries: np.ndarray,
        dt_s: float,
        threshold_m: float = 0.3,
    ) -> np.ndarray:
        """
        For each cell, find first timestep where depth > threshold.

        Args:
            depth_timeseries: Array of shape (T, rows, cols).
            dt_s: Timestep [s].
            threshold_m: Inundation threshold [m].

        Returns:
            arrival_time grid [s]. Cells never flooded = infinity.
        """
        T, rows, cols = depth_timeseries.shape
        arrival = np.full((rows, cols), np.inf)
        for t_idx in range(T):
            flooded = (depth_timeseries[t_idx] > threshold_m) & np.isinf(arrival)
            arrival[flooded] = t_idx * dt_s
        return arrival

    def station_arrival(
        self,
        gauge_timeseries: Dict[str, Dict[str, List[float]]],
        threshold_m: float = 0.3,
    ) -> Dict[str, float]:
        """
        Find flood arrival time at each gauge station.

        Args:
            gauge_timeseries: {station_id: {times_s: [...], depth_m: [...]}}.
            threshold_m: Inundation depth threshold.

        Returns:
            {station_id: arrival_time_s}. None if not flooded.
        """
        arrivals = {}
        for station_id, ts in gauge_timeseries.items():
            times = ts.get("times_s", [])
            depths = ts.get("depth_m", [])
            arrival = None
            for t, d in zip(times, depths):
                if d >= threshold_m:
                    arrival = t
                    break
            arrivals[station_id] = arrival
        return arrivals
