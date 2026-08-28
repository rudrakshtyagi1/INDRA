"""
Inflow Hydrograph: combined SCS-CN + Unit Hydrograph engine.

Orchestrates: SCS-CN runoff calculation -> UH peak -> triangular UH -> convolution.
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from floodlab.engines.hydrology.scs_cn import SCSCN
from floodlab.engines.hydrology.unit_hydrograph import UnitHydrograph


class HydrologyInput(BaseModel):
    catchment_area_km2: float = Field(..., gt=0, description="Catchment area [km²]")
    curve_number_cn: float = Field(..., ge=1, le=100, description="SCS Curve Number")
    rainfall_24h_mm: float = Field(..., ge=0, description="24-hour storm rainfall [mm]")
    time_of_concentration_hrs: float = Field(..., gt=0, description="Time of concentration tc [hours]")
    antecedent_moisture_condition: int = Field(default=2, ge=1, le=3, description="AMC class (1/2/3)")
    base_flow_m3s: float = Field(default=0.0, ge=0, description="Baseflow to add [m³/s]")
    ia_coefficient: float = Field(default=0.2, description="Initial abstraction coefficient (default 0.2)")


class HydrologyResult(BaseModel):
    runoff_depth_mm: float
    peak_inflow_m3s: float
    time_to_peak_hrs: float
    time_series_hrs: list[float]
    inflow_hydrograph_m3s: list[float]
    provenance_level: str = "MODELLED"
    method: str = "SCS-CN + NRCS UH"

    model_config = {"protected_namespaces": ()}


class HydrologyEngine:
    """
    Calculates inflow hydrograph from catchment rainfall using SCS-CN and NRCS UH.
    """

    @classmethod
    def calculate(cls, inp: HydrologyInput) -> HydrologyResult:
        scs = SCSCN(ia_coefficient=inp.ia_coefficient)
        uh = UnitHydrograph()

        # Adjust CN for antecedent moisture condition
        cn = cls._adjust_cn(inp.curve_number_cn, inp.antecedent_moisture_condition)

        # SCS-CN: runoff depth
        runoff_mm = scs.runoff_depth_from_cn(inp.rainfall_24h_mm, cn)

        # Unit hydrograph parameters
        tp = uh.time_to_peak(inp.time_of_concentration_hrs)
        Qp = uh.peak_discharge(inp.catchment_area_km2, runoff_mm, tp) if runoff_mm > 0 else 0.0

        # Generate triangular UH ordinates
        uh_times, uh_ordinates = uh.triangular_uh(tp, steps=60)

        # Scale ordinates by peak discharge * runoff depth factor
        # (For a single storm, runoff_mm is already incorporated in Qp)
        scaled_flows = [o * Qp + inp.base_flow_m3s for o in uh_ordinates]

        return HydrologyResult(
            runoff_depth_mm=runoff_mm,
            peak_inflow_m3s=Qp + inp.base_flow_m3s,
            time_to_peak_hrs=tp,
            time_series_hrs=uh_times,
            inflow_hydrograph_m3s=scaled_flows,
        )

    @staticmethod
    def _adjust_cn(cn: float, amc: int) -> float:
        """Adjust CN for Antecedent Moisture Condition (AMC 1=dry, 2=normal, 3=wet)."""
        if amc == 1:
            return 4.2 * cn / (10 - 0.058 * cn)
        elif amc == 3:
            return 23 * cn / (10 + 0.13 * cn)
        return cn  # AMC II: no adjustment
