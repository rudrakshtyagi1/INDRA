"""
Dimensionless Unit Hydrograph (NRCS/SCS triangular approximation).

Reference: USDA-NRCS Technical Release 55 (TR-55, 1986).
"""
from __future__ import annotations


class UnitHydrograph:
    """
    NRCS triangular unit hydrograph for estimating peak discharge.

    Provenance of outputs: MODELLED (NRCS standard method).
    """

    PEAK_RATE_FACTOR: float = 0.208  # Standard NRCS peak rate factor [m3/s/mm/km2/hr]

    def time_to_peak(self, time_of_concentration_hrs: float) -> float:
        """
        Time to peak discharge.

        tp = 0.6 * tc

        Args:
            time_of_concentration_hrs: Time of concentration tc [hours].

        Returns:
            Time to peak tp [hours].
        """
        return 0.6 * time_of_concentration_hrs

    def time_of_concentration(
        self,
        reach_length_km: float,
        slope: float,
        velocity_ms: float = None,
    ) -> float:
        """
        Estimate time of concentration using Kirpich formula (velocity-based).

        Args:
            reach_length_km: Length of main channel [km].
            slope: Average channel slope [m/m].
            velocity_ms: Overrides computed velocity if provided.

        Returns:
            tc [hours].
        """
        if velocity_ms and velocity_ms > 0:
            return (reach_length_km * 1000.0) / velocity_ms / 3600.0
        # Kirpich (1940): tc = 0.0195 * L^0.77 * S^-0.385  [minutes]
        # L in metres
        L_m = reach_length_km * 1000.0
        tc_min = 0.0195 * (L_m ** 0.77) * (slope ** -0.385)
        return tc_min / 60.0

    def peak_discharge(
        self,
        catchment_area_km2: float,
        runoff_depth_mm: float,
        tp_hrs: float,
    ) -> float:
        """
        Peak discharge from triangular unit hydrograph.

        Qp = 0.208 * A * q / tp    [m³/s]

        where q = runoff_depth_mm / 1000 [m], A in km²

        Args:
            catchment_area_km2: [km²]
            runoff_depth_mm: Direct runoff depth [mm]
            tp_hrs: Time to peak [hours]

        Returns:
            Peak discharge [m³/s].
        """
        if tp_hrs <= 0:
            raise ValueError("Time to peak must be positive")
        # Qp = 0.208 * A [km2] * (q [mm] / 1000 [m/mm]) * (1000^2 [m2/km2]) / (tp [h] * 3600 [s/h])
        q_m = runoff_depth_mm / 1000.0
        Qp = self.PEAK_RATE_FACTOR * catchment_area_km2 * q_m * 1e6 / (tp_hrs * 3600.0)
        return Qp

    def triangular_uh(self, tp_hrs: float, steps: int = 100) -> tuple[list[float], list[float]]:
        """
        Triangular unit hydrograph ordinates.

        Rising limb:  0 to Qp over [0, tp]
        Recession:    Qp to 0 over [tp, tp + 1.67*tp]
        Base time:    tb = 2.67 * tp

        Args:
            tp_hrs: Time to peak [hours].
            steps: Number of time steps.

        Returns:
            (times_hrs, unit_ordinates) where unit_ordinates peak at 1.0
        """
        tb = 2.67 * tp_hrs
        times = [tb * i / steps for i in range(steps + 1)]
        ordinates = []
        for t in times:
            if t <= tp_hrs:
                ordinates.append(t / tp_hrs)
            else:
                recession_t = t - tp_hrs
                recession_dur = 1.67 * tp_hrs
                ordinates.append(max(0.0, 1.0 - recession_t / recession_dur))
        return times, ordinates

    def convolve_with_runoff(
        self,
        rainfall_increments_mm: list[float],
        unit_ordinates: list[float],
        dt_hrs: float,
        Qp: float,
    ) -> list[float]:
        """
        Discrete convolution: multiply UH by each runoff increment and superpose.

        Args:
            rainfall_increments_mm: Runoff depth for each time interval [mm].
            unit_ordinates: UH shape ordinates (peak = 1.0).
            dt_hrs: Time step [hours].
            Qp: Peak discharge for unit rainfall [m³/s].

        Returns:
            Flow timeseries [m³/s].
        """
        n = len(rainfall_increments_mm) + len(unit_ordinates) - 1
        flows = [0.0] * n
        for i, q in enumerate(rainfall_increments_mm):
            scale = q / 1.0  # each mm of runoff
            for j, uh in enumerate(unit_ordinates):
                flows[i + j] += scale * uh * Qp
        return flows
