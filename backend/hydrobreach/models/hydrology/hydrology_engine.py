"""
HydroBreach - Hydrological Engine & Catchment Runoff Simulator
Implements:
1. SCS-CN (Soil Conservation Service Curve Number) Rainfall-Runoff Model
2. SCS Dimensionless Unit Hydrograph Catchment Routing
3. Reservoir Storage-Elevation Routing (Tehri Dam 3,540 MCM Reservoir)
"""

import math
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field


class HydrologyInput(BaseModel):
    catchment_area_km2: float = Field(default=7500.0, description="Bhagirathi upper catchment area up to Tehri Dam (km²)")
    curve_number_cn: float = Field(default=78.0, description="SCS Curve Number (50-98, forested mountain/rocky terrain)")
    rainfall_24h_mm: float = Field(default=180.0, description="24-hour design or observed rainfall depth (mm)")
    time_of_concentration_hrs: float = Field(default=6.5, description="Catchment time of concentration Tc (hours)")
    initial_reservoir_level_m: float = Field(default=825.0, description="Initial Tehri reservoir water surface level (m MSL)")
    frl_m: float = Field(default=830.0, description="Full Reservoir Level (FRL) m MSL")
    max_spillway_capacity_m3s: float = Field(default=15500.0, description="Tehri chute spillway maximum discharge capacity (m³/s)")


class HydrologyResult(BaseModel):
    curve_number: float
    potential_retention_s_mm: float
    initial_abstraction_ia_mm: float
    total_runoff_depth_pe_mm: float
    total_runoff_volume_m3: float
    peak_inflow_discharge_m3s: float
    time_to_peak_hrs: float
    time_series_hrs: List[float]
    rainfall_hyetograph_mm_hr: List[float]
    inflow_hydrograph_m3s: List[float]
    reservoir_water_level_m: List[float]
    summary: Dict[str, Any]


class HydrologyEngine:
    """Calculates catchment rainfall-runoff and reservoir inflow hydrograph."""

    TEHRI_RESERVOIR_FRL_MSL = 830.0
    TEHRI_RESERVOIR_MAX_STORAGE_M3 = 3.54e9  # 3,540 MCM
    TEHRI_RESERVOIR_SURFACE_AREA_KM2 = 42.0

    @classmethod
    def calculate_scs_cn_runoff(cls, inp: HydrologyInput) -> HydrologyResult:
        """
        Computes SCS-CN rainfall-runoff depth Pe (mm) and catchment inflow hydrograph Q_in(t).
        
        S = (25400 / CN) - 254
        I_a = 0.2 * S
        P_e = (P - I_a)^2 / (P - I_a + S) if P > I_a else 0
        """
        cn = np_clip_cn(inp.curve_number_cn)
        p = max(inp.rainfall_24h_mm, 0.0)

        # Potential maximum retention after runoff begins (mm)
        s = (25400.0 / cn) - 254.0
        # Initial abstraction (mm)
        ia = 0.2 * s

        # Direct runoff depth (mm)
        if p > ia:
            pe = ((p - ia) ** 2) / (p - ia + s)
        else:
            pe = 0.0

        area_m2 = inp.catchment_area_km2 * 1e6
        total_runoff_vol_m3 = (pe / 1000.0) * area_m2

        # Time to peak: T_p = 0.6 * T_c + 0.5 * D_d (where D_d ~ 1 hr)
        tc = max(inp.time_of_concentration_hrs, 1.0)
        tp_hrs = 0.6 * tc + 0.5

        # Peak discharge Q_p (m³/s) using SCS dimensionless unit hydrograph peak equation
        # Q_p = 0.208 * A_km2 * P_e_mm / T_p
        q_peak = (0.208 * inp.catchment_area_km2 * max(pe, 1.0)) / tp_hrs

        # Synthesize 24-hour rainfall hyetograph & inflow hydrograph
        steps = 48
        duration_hrs = max(tc * 3.0, 36.0)
        dt_hrs = duration_hrs / (steps - 1)

        time_series = [round(i * dt_hrs, 2) for i in range(steps)]
        rainfall_hyetograph = []
        inflow_flows = []
        res_levels = []

        curr_res_level = inp.initial_reservoir_level_m

        for t in time_series:
            # SCS Type II 24h rainfall distribution peak at t=12h
            if 0 <= t <= 24:
                # Triangular/Gaussian intensity peaking at t=12h
                rain_rate = (p / 6.0) * math.exp(-((t - 12.0) ** 2) / 18.0)
            else:
                rain_rate = 0.0
            rainfall_hyetograph.append(round(rain_rate, 2))

            # Catchment routed inflow hydrograph (Gamma distribution shape)
            if t <= 0.0:
                q_in = 150.0  # Baseflow 150 m³/s
            else:
                ratio = t / tp_hrs
                q_in = 150.0 + q_peak * (ratio ** 2.5) * math.exp(-2.5 * (ratio - 1.0))
            q_in = max(q_in, 50.0)
            inflow_flows.append(round(q_in, 1))

            # Approximate reservoir water level rise due to inflow
            # dH = (Q_in - Q_spill) * dt / Surface_Area
            q_spill = 0.0
            if curr_res_level > inp.frl_m:
                excess_h = curr_res_level - inp.frl_m
                q_spill = min(1500.0 * (excess_h ** 1.5), inp.max_spillway_capacity_m3s)

            dh = ((q_in - q_spill) * (dt_hrs * 3600.0)) / (cls.TEHRI_RESERVOIR_SURFACE_AREA_KM2 * 1e6)
            curr_res_level = min(curr_res_level + dh, 839.5) # Dam crest MSL 839.5m
            res_levels.append(round(curr_res_level, 2))

        return HydrologyResult(
            curve_number=round(cn, 1),
            potential_retention_s_mm=round(s, 1),
            initial_abstraction_ia_mm=round(ia, 1),
            total_runoff_depth_pe_mm=round(pe, 1),
            total_runoff_volume_m3=round(total_runoff_vol_m3, 0),
            peak_inflow_discharge_m3s=round(q_peak, 1),
            time_to_peak_hrs=round(tp_hrs, 2),
            time_series_hrs=time_series,
            rainfall_hyetograph_mm_hr=rainfall_hyetograph,
            inflow_hydrograph_m3s=inflow_flows,
            reservoir_water_level_m=res_levels,
            summary={
                "catchment": "Bhagirathi Upper Basin (Tehri Dam Catchment)",
                "catchment_area_km2": inp.catchment_area_km2,
                "rainfall_24h_mm": p,
                "max_reservoir_level_reached_m": max(res_levels),
                "overtopping_risk": max(res_levels) >= inp.frl_m,
                "data_provenance": "MODEL ESTIMATE (SCS-CN Catchment Runoff Engine)"
            }
        )


def np_clip_cn(cn: float) -> float:
    return max(min(cn, 98.0), 40.0)
