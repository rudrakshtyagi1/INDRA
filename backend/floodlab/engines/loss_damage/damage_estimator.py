"""
Flood damage estimator.

CWC/JRC depth-damage approach + economic loss model in INR crores.
All monetary outputs: provenance = DERIVED.

Reference:
    CWC (2019) "Flood Damage Mitigation Manual"
    JRC (2017) "Flood Damage Model for Europe"
"""
from __future__ import annotations

import math
from typing import Any, Dict

from floodlab.provenance.labels import label_derived

# Default depth-damage fractions (residential) [depth_m -> fraction 0-1]
DEFAULT_DEPTH_DAMAGE_RESIDENTIAL: list[tuple[float, float]] = [
    (0.0, 0.0), (0.1, 0.05), (0.3, 0.15), (0.5, 0.25),
    (1.0, 0.45), (1.5, 0.60), (2.0, 0.75), (3.0, 0.90),
    (5.0, 1.00),
]


def _interpolate_damage(depth_m: float, curve: list[tuple[float, float]]) -> float:
    """Linear interpolation of depth-damage curve."""
    if depth_m <= curve[0][0]:
        return curve[0][1]
    for (d1, f1), (d2, f2) in zip(curve, curve[1:]):
        if d1 <= depth_m <= d2:
            return f1 + (f2 - f1) * (depth_m - d1) / (d2 - d1)
    return curve[-1][1]


class DamageEstimator:
    """
    Estimates economic losses and resource requirements from flood scenario.

    All monetary estimates are in INR Crores and labelled DERIVED.
    """

    # Average asset values (INR Crores, rough national averages)
    AVG_HOUSE_VALUE_CR: float = 0.020      # 20 lakh per house
    AVG_COMMERCIAL_VALUE_CR: float = 0.150
    AGRICULTURAL_LOSS_PER_HA_CR: float = 0.002  # 2 lakh/ha (crop loss)

    def estimate(
        self,
        inundated_area_km2: float,
        peak_velocity_ms: float,
        max_depth_m: float,
        valley_type: str,
        scenario_params: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Estimate economic damage and HADR resource requirements.

        Returns:
            dict with population, buildings, agricultural, economic, resource estimates
        """
        # Population density (rough Himalayan valley estimate)
        population_density_per_km2 = scenario_params.get("population_density_per_km2", 150.0)
        population_at_risk = int(inundated_area_km2 * population_density_per_km2)

        # Building estimates (rough: 4 persons per house)
        houses_exposed = population_at_risk // 4
        damage_fraction = _interpolate_damage(max_depth_m, DEFAULT_DEPTH_DAMAGE_RESIDENTIAL)
        houses_destroyed = int(houses_exposed * damage_fraction)
        houses_submerged = int(houses_exposed * (1 - damage_fraction) * 0.5)

        # Agricultural damage
        agricultural_fraction = 0.40  # ~40% of inundated area is agricultural
        agricultural_ha = inundated_area_km2 * 100.0 * agricultural_fraction

        # Economic loss
        residential_loss_cr = houses_destroyed * self.AVG_HOUSE_VALUE_CR
        agricultural_loss_cr = agricultural_ha * self.AGRICULTURAL_LOSS_PER_HA_CR
        commercial_loss_cr = inundated_area_km2 * 0.05 * self.AVG_COMMERCIAL_VALUE_CR
        infrastructure_loss_cr = inundated_area_km2 * 0.02  # roads, bridges
        total_economic_loss_cr = (
            residential_loss_cr + agricultural_loss_cr + commercial_loss_cr + infrastructure_loss_cr
        )

        # HADR resource requirements
        displaced = min(population_at_risk, int(population_at_risk * 0.60))
        ndrf_teams = max(1, math.ceil(displaced / 1000))
        boats_required = max(2, math.ceil(displaced / 300))
        shelters_required = max(1, math.ceil(displaced / 500))
        food_packets_required = displaced * 3  # 3 meals/day for 1 day estimate

        provenance = label_derived(
            from_sources=["Delft3D FM inundation", "CWC depth-damage curves", "WorldPop population"],
            method="depth_damage_economic_model",
        ).to_dict()

        return {
            "population_at_risk": population_at_risk,
            "displaced": displaced,
            "buildings_exposed": houses_exposed,
            "buildings_destroyed": houses_destroyed,
            "buildings_submerged": houses_submerged,
            "agricultural_ha": round(agricultural_ha, 1),
            "economic_loss_crores_inr": {
                "residential": round(residential_loss_cr, 2),
                "agricultural": round(agricultural_loss_cr, 2),
                "commercial": round(commercial_loss_cr, 2),
                "infrastructure": round(infrastructure_loss_cr, 2),
                "total": round(total_economic_loss_cr, 2),
            },
            "hadr_resources": {
                "ndrf_teams": ndrf_teams,
                "boats": boats_required,
                "shelters": shelters_required,
                "food_packets": food_packets_required,
            },
            "inundated_area_km2": inundated_area_km2,
            "max_depth_m": max_depth_m,
            "peak_velocity_ms": peak_velocity_ms,
            "provenance": provenance,
        }
