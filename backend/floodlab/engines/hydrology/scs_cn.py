"""
SCS Curve Number rainfall-runoff method.

Reference: USDA-SCS National Engineering Handbook, Section 4 (1972).
           NRCS Technical Release 55 (TR-55, 1986).
"""
from __future__ import annotations


class SCSCN:
    """
    SCS Curve Number method for converting storm rainfall to direct runoff.

    Provenance of outputs: MODELLED (empirical formula, well-established NRCS standard).
    """

    def __init__(self, ia_coefficient: float = 0.2):
        """
        Args:
            ia_coefficient: Initial abstraction coefficient (default 0.2 per NRCS standard).
                            Some urban catchment studies use 0.05.
        """
        self.ia_coefficient = ia_coefficient

    def retention_S(self, cn: float) -> float:
        """
        Potential maximum retention after runoff begins.

        S = (25400 / CN) - 254    [mm]

        Args:
            cn: Curve Number (dimensionless, 0-100).

        Returns:
            S in millimetres.
        """
        if cn <= 0 or cn > 100:
            raise ValueError(f"Curve Number must be in (0, 100], got {cn}")
        return (25400.0 / cn) - 254.0

    def initial_abstraction(self, S: float) -> float:
        """
        Initial abstraction (interception, depression storage, infiltration before runoff).

        Ia = ia_coefficient * S    [mm]

        Args:
            S: Potential maximum retention [mm].

        Returns:
            Ia in millimetres.
        """
        return self.ia_coefficient * S

    def direct_runoff(self, rainfall_mm: float, S: float, Ia: float) -> float:
        """
        Direct runoff depth.

        Pe = (P - Ia)^2 / (P - Ia + S)    [mm]    if P > Ia
        Pe = 0                                      if P <= Ia

        Args:
            rainfall_mm: Total storm rainfall P [mm].
            S: Potential maximum retention [mm].
            Ia: Initial abstraction [mm].

        Returns:
            Direct runoff depth Pe [mm].
        """
        if rainfall_mm <= Ia:
            return 0.0
        numerator = (rainfall_mm - Ia) ** 2
        denominator = rainfall_mm - Ia + S
        return numerator / denominator

    def runoff_depth_from_cn(self, rainfall_mm: float, cn: float) -> float:
        """
        Convenience method: compute runoff depth directly from CN.

        Returns:
            Direct runoff depth Pe [mm].
        """
        S = self.retention_S(cn)
        Ia = self.initial_abstraction(S)
        return self.direct_runoff(rainfall_mm, S, Ia)

    def runoff_volume_m3(self, Pe_mm: float, catchment_area_km2: float) -> float:
        """
        Total runoff volume from runoff depth and catchment area.

        Args:
            Pe_mm: Direct runoff depth [mm].
            catchment_area_km2: Catchment area [km²].

        Returns:
            Volume [m³].
        """
        return Pe_mm * 1e-3 * catchment_area_km2 * 1e6
