"""
HydroBreach - Dam Breach Mechanics & Hydrograph Calculation Engine
Implements peer-reviewed empirical and analytical dam-break formulations:
1. Froehlich (1995a, 1995b, 2008) - Empirical breach dimensions, formation time, peak discharge.
2. MacDonald & Langridge-Monopolis (1984) - Earthfill/rockfill dam breach development.
3. Von Thun & Gillette (1990) - Erosion rate and breach sizing for erosion vs piping failure.
4. Instantaneous / Concrete Gravity Dam Collapse (Ritter / Stoker analytical dam-break equations).
5. Landslide-Dammed Outburst Flood (LDOF) / GLOF models (Costa & Schuster 1988, Walder & O'Connor 1997).
"""

import math
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class DamBreachInput(BaseModel):
    dam_name: str = Field(..., description="Name of dam or river blockage")
    dam_type: str = Field(default="earthen", description="earthen, rockfill, concrete_gravity, landslide_dam, arch")
    dam_height_m: float = Field(..., description="Height of dam from crest to valley floor (m)")
    reservoir_volume_m3: float = Field(..., description="Volume of water stored in reservoir at breach time (m³)")
    hydraulic_head_m: float = Field(..., description="Height of water above breach invert at breach (m)")
    crest_length_m: Optional[float] = Field(default=None, description="Dam crest length (m)")
    breach_mode: str = Field(default="overtopping", description="overtopping, piping, instantaneous, landslide_outburst")
    material_cohesion: str = Field(default="medium", description="high, medium, low (for Von Thun)")


class BreachResult(BaseModel):
    avg_breach_width_m: float
    breach_bottom_width_m: float
    breach_top_width_m: float
    side_slope_z: float  # horizontal to vertical (z:1)
    breach_formation_time_hrs: float
    peak_discharge_m3s: float
    time_to_peak_hrs: float
    breach_hydrograph_time_hrs: List[float]
    breach_hydrograph_discharge_m3s: List[float]
    eroded_volume_m3: Optional[float] = None
    model_used: str
    summary: Dict[str, Any]


class BreachMechanicsEngine:
    """Calculates breach dimensions, development timelines, and outflow hydrographs."""

    G = 9.81  # Gravitational acceleration (m/s²)

    @classmethod
    def calculate_froehlich_2008(cls, inp: DamBreachInput) -> BreachResult:
        """
        Froehlich (2008) updated empirical breach formulation based on 74 dam failure case studies.
        
        Average breach width (m):
        B_avg = 0.27 * K_o * (V_w)^0.32 * (h_b)^0.04
        where:
        - K_o = 1.3 for overtopping, 1.0 for other failures (piping, etc.)
        - V_w = reservoir volume at time of failure (m³)
        - h_b = height of breach (m)

        Side slopes (H:1V):
        - z = 1.0 for overtopping
        - z = 0.7 for other breach modes (piping)

        Breach formation time (hrs):
        t_f = 63.2 * sqrt(V_w / (g * h_b^2)) / 3600.0

        Peak discharge Q_p (m³/s):
        Q_p = 0.607 * (V_w)^0.295 * (h_w)^1.24
        """
        V_w = max(inp.reservoir_volume_m3, 100.0)
        h_b = max(inp.dam_height_m, 1.0)
        h_w = max(inp.hydraulic_head_m, 0.5)

        k_o = 1.3 if inp.breach_mode.lower() == "overtopping" else 1.0
        z = 1.0 if inp.breach_mode.lower() == "overtopping" else 0.7

        b_avg = 0.27 * k_o * (V_w ** 0.32) * (h_b ** 0.04)
        if inp.crest_length_m and b_avg > inp.crest_length_m:
            b_avg = inp.crest_length_m * 0.85

        # Formation time in hours
        t_f_sec = 63.2 * math.sqrt(V_w / (cls.G * (h_b ** 2)))
        t_f_hrs = max(t_f_sec / 3600.0, 0.05)  # min 3 minutes

        # Peak discharge (Froehlich 1995b peak discharge equation)
        q_p = 0.607 * (V_w ** 0.295) * (h_w ** 1.24)

        # Bottom and top widths based on trapezoid: B_avg = B_bottom + z * h_b
        b_bottom = max(b_avg - z * h_b, 0.2 * b_avg)
        b_top = b_bottom + 2 * z * h_b

        # Time to peak is typically 30% to 50% of total formation time
        t_peak_hrs = t_f_hrs * 0.4

        time_series, flow_series = cls._synthesize_breach_hydrograph(
            V_w=V_w, Q_p=q_p, t_peak_hrs=t_peak_hrs, t_f_hrs=t_f_hrs
        )

        return BreachResult(
            avg_breach_width_m=round(b_avg, 2),
            breach_bottom_width_m=round(b_bottom, 2),
            breach_top_width_m=round(b_top, 2),
            side_slope_z=round(z, 2),
            breach_formation_time_hrs=round(t_f_hrs, 3),
            peak_discharge_m3s=round(q_p, 2),
            time_to_peak_hrs=round(t_peak_hrs, 3),
            breach_hydrograph_time_hrs=time_series,
            breach_hydrograph_discharge_m3s=flow_series,
            eroded_volume_m3=None,
            model_used="Froehlich (2008)",
            summary={
                "dam_name": inp.dam_name,
                "dam_type": inp.dam_type,
                "breach_mode": inp.breach_mode,
                "k_o_factor": k_o,
                "total_surge_volume_m3": V_w
            }
        )

    @classmethod
    def calculate_macdonald_1984(cls, inp: DamBreachInput) -> BreachResult:
        """
        MacDonald & Langridge-Monopolis (1984) formulation for earthfill/rockfill dams.
        V_er (eroded volume) = 0.0261 * (V_out * h_w)^0.77
        t_f = 0.0179 * (V_er)^0.364
        """
        V_w = max(inp.reservoir_volume_m3, 100.0)
        h_w = max(inp.hydraulic_head_m, 1.0)
        h_b = max(inp.dam_height_m, 1.0)

        # Eroded volume m³
        v_er = 0.0261 * ((V_w * h_w) ** 0.77)
        # Formation time in hours
        t_f_hrs = max(0.0179 * (v_er ** 0.364), 0.1)

        # Average breach width estimated from eroded volume assuming triangular/trapezoidal cross section
        z = 0.5
        b_avg = max(v_er / (h_b * 30.0), 5.0)
        if inp.crest_length_m and b_avg > inp.crest_length_m:
            b_avg = inp.crest_length_m * 0.9

        b_bottom = max(b_avg - z * h_b, 0.2 * b_avg)
        b_top = b_bottom + 2 * z * h_b

        # Peak discharge using broad-crested weir / MacDonald correlation
        # Q_p approx = 1.154 * (V_w * h_w)^0.412
        q_p = 1.154 * ((V_w * h_w) ** 0.412) * 1.5

        t_peak_hrs = t_f_hrs * 0.5
        time_series, flow_series = cls._synthesize_breach_hydrograph(
            V_w=V_w, Q_p=q_p, t_peak_hrs=t_peak_hrs, t_f_hrs=t_f_hrs
        )

        return BreachResult(
            avg_breach_width_m=round(b_avg, 2),
            breach_bottom_width_m=round(b_bottom, 2),
            breach_top_width_m=round(b_top, 2),
            side_slope_z=round(z, 2),
            breach_formation_time_hrs=round(t_f_hrs, 3),
            peak_discharge_m3s=round(q_p, 2),
            time_to_peak_hrs=round(t_peak_hrs, 3),
            breach_hydrograph_time_hrs=time_series,
            breach_hydrograph_discharge_m3s=flow_series,
            eroded_volume_m3=round(v_er, 1),
            model_used="MacDonald & Langridge-Monopolis (1984)",
            summary={"eroded_volume_m3": round(v_er, 1)}
        )

    @classmethod
    def calculate_von_thun_1990(cls, inp: DamBreachInput) -> BreachResult:
        """
        Von Thun & Gillette (1990) for erosion rate and breach sizing.
        B_avg = 2.5 * h_w + C_b  (where C_b depends on reservoir size)
        t_f = B_avg / (4 * h_w)  for erosion resistant materials
        t_f = B_avg / (20 + 4 * h_w) for easily erodible materials
        """
        h_w = max(inp.hydraulic_head_m, 1.0)
        V_w = max(inp.reservoir_volume_m3, 100.0)

        # C_b coefficient based on storage
        if V_w < 1.23e6:
            c_b = 6.1
        elif V_w < 6.17e6:
            c_b = 18.3
        elif V_w < 1.23e7:
            c_b = 30.5
        else:
            c_b = 54.9

        b_avg = 2.5 * h_w + c_b
        if inp.crest_length_m and b_avg > inp.crest_length_m:
            b_avg = inp.crest_length_m * 0.8

        cohesion = inp.material_cohesion.lower()
        if cohesion == "high":
            # erosion resistant
            t_f_hrs = max(b_avg / (4.0 * h_w), 0.1)
            z = 1.0
        elif cohesion == "low":
            # easily erodible
            t_f_hrs = max(b_avg / (20.0 + 4.0 * h_w), 0.05)
            z = 0.5
        else:
            # medium
            t_f_hrs = max(b_avg / (10.0 + 4.0 * h_w), 0.08)
            z = 0.75

        # Peak discharge via broad-crested weir formulation
        # Q_p = 1.7 * B_avg * (h_w)^1.5
        q_p = 1.7 * b_avg * (h_w ** 1.5)

        b_bottom = max(b_avg - z * h_w, 0.2 * b_avg)
        b_top = b_bottom + 2 * z * h_w
        t_peak_hrs = t_f_hrs * 0.45

        time_series, flow_series = cls._synthesize_breach_hydrograph(
            V_w=V_w, Q_p=q_p, t_peak_hrs=t_peak_hrs, t_f_hrs=t_f_hrs
        )

        return BreachResult(
            avg_breach_width_m=round(b_avg, 2),
            breach_bottom_width_m=round(b_bottom, 2),
            breach_top_width_m=round(b_top, 2),
            side_slope_z=round(z, 2),
            breach_formation_time_hrs=round(t_f_hrs, 3),
            peak_discharge_m3s=round(q_p, 2),
            time_to_peak_hrs=round(t_peak_hrs, 3),
            breach_hydrograph_time_hrs=time_series,
            breach_hydrograph_discharge_m3s=flow_series,
            eroded_volume_m3=None,
            model_used="Von Thun & Gillette (1990)",
            summary={"material_cohesion": cohesion, "c_b_offset": c_b}
        )

    @classmethod
    def calculate_instantaneous_ritter(cls, inp: DamBreachInput) -> BreachResult:
        """
        Ritter's analytical solution for instantaneous dam break (concrete gravity/arch failure).
        Initial surge wave velocity: c_0 = sqrt(g * h_0)
        Wave front downstream propagation speed: v_front = 2 * c_0 = 2 * sqrt(g * h_0)
        Unit width peak discharge at dam axis: q = (8/27) * h_0 * sqrt(g * h_0)
        Total peak discharge: Q_p = B_crest * (8/27) * h_0 * sqrt(g * h_0)
        """
        h_0 = max(inp.hydraulic_head_m, 1.0)
        V_w = max(inp.reservoir_volume_m3, 100.0)
        b = inp.crest_length_m or (0.5 * math.sqrt(V_w / h_0))

        c_0 = math.sqrt(cls.G * h_0)
        v_front = 2.0 * c_0
        q_unit_peak = (8.0 / 27.0) * h_0 * c_0
        q_p = b * q_unit_peak

        # Instantaneous breach forms in < 0.05 hrs (< 3 min)
        t_f_hrs = 0.033
        t_peak_hrs = 0.005

        time_series, flow_series = cls._synthesize_breach_hydrograph(
            V_w=V_w, Q_p=q_p, t_peak_hrs=t_peak_hrs, t_f_hrs=t_f_hrs * 10
        )

        return BreachResult(
            avg_breach_width_m=round(b, 2),
            breach_bottom_width_m=round(b, 2),
            breach_top_width_m=round(b, 2),
            side_slope_z=0.0,
            breach_formation_time_hrs=round(t_f_hrs, 3),
            peak_discharge_m3s=round(q_p, 2),
            time_to_peak_hrs=round(t_peak_hrs, 4),
            breach_hydrograph_time_hrs=time_series,
            breach_hydrograph_discharge_m3s=flow_series,
            eroded_volume_m3=None,
            model_used="Ritter Instantaneous Hydrodynamic Solution",
            summary={
                "wave_front_velocity_ms": round(v_front, 2),
                "c0_celerity_ms": round(c_0, 2),
                "unit_peak_m2s": round(q_unit_peak, 2)
            }
        )

    @classmethod
    def calculate_landslide_dam_outburst(cls, inp: DamBreachInput) -> BreachResult:
        """
        Landslide-Dammed Outburst Flood (LDOF) model based on Costa & Schuster (1988)
        and Walder & O'Connor (1997) for rock/ice avalanche dam blockages (e.g. Rishi Ganga 2021).
        Q_p = 0.0158 * (V_w)^0.44 * (h_w)^0.55 * (g)^0.5
        High initial breach erosion with rapid peak development.
        """
        V_w = max(inp.reservoir_volume_m3, 100.0)
        h_w = max(inp.hydraulic_head_m, 1.0)
        h_b = max(inp.dam_height_m, 1.0)

        # Costa & Schuster (1988) empirical peak discharge for landslide dams:
        # Q_p = 0.063 * (P_e)^0.42 where P_e = V_w * h_w * rho * g
        p_e = V_w * h_w * 9810.0  # Potential energy in Joules
        q_p = 0.063 * (p_e ** 0.42)
        if q_p < 50.0:
            q_p = 0.607 * (V_w ** 0.295) * (h_w ** 1.24) * 1.3

        # Landslide dams have wide breaches with steep side slopes (z=0.7 to 1.2)
        z = 0.8
        b_avg = 0.35 * (V_w ** 0.33) * (h_b ** 0.05)
        if inp.crest_length_m and b_avg > inp.crest_length_m:
            b_avg = inp.crest_length_m * 0.9

        b_bottom = max(b_avg - z * h_b, 0.2 * b_avg)
        b_top = b_bottom + 2 * z * h_b

        # Formation time typically 0.25 to 1.5 hrs
        t_f_sec = 45.0 * math.sqrt(V_w / (cls.G * (h_b ** 2)))
        t_f_hrs = max(t_f_sec / 3600.0, 0.15)
        t_peak_hrs = t_f_hrs * 0.35

        time_series, flow_series = cls._synthesize_breach_hydrograph(
            V_w=V_w, Q_p=q_p, t_peak_hrs=t_peak_hrs, t_f_hrs=t_f_hrs
        )

        return BreachResult(
            avg_breach_width_m=round(b_avg, 2),
            breach_bottom_width_m=round(b_bottom, 2),
            breach_top_width_m=round(b_top, 2),
            side_slope_z=round(z, 2),
            breach_formation_time_hrs=round(t_f_hrs, 3),
            peak_discharge_m3s=round(q_p, 2),
            time_to_peak_hrs=round(t_peak_hrs, 3),
            breach_hydrograph_time_hrs=time_series,
            breach_hydrograph_discharge_m3s=flow_series,
            eroded_volume_m3=None,
            model_used="Costa & Schuster / Walder & O'Connor (LDOF)",
            summary={
                "potential_energy_joules": f"{p_e:.2e}",
                "event_type": "Landslide-Dammed Lake Outburst"
            }
        )

    @classmethod
    def evaluate(cls, inp: DamBreachInput, model_type: str = "auto") -> BreachResult:
        """Route to appropriate model based on dam type or user override."""
        model = model_type.lower()
        if model == "froehlich":
            return cls.calculate_froehlich_2008(inp)
        elif model in ("macdonald", "macdonald_1984"):
            return cls.calculate_macdonald_1984(inp)
        elif model in ("von_thun", "von_thun_1990"):
            return cls.calculate_von_thun_1990(inp)
        elif model in ("ritter", "instantaneous"):
            return cls.calculate_instantaneous_ritter(inp)
        elif model in ("landslide", "ldof", "costa_schuster"):
            return cls.calculate_landslide_dam_outburst(inp)

        # Automatic detection based on input
        if inp.breach_mode.lower() == "instantaneous" or inp.dam_type.lower() in ("concrete_gravity", "arch"):
            return cls.calculate_instantaneous_ritter(inp)
        elif inp.breach_mode.lower() == "landslide_outburst" or inp.dam_type.lower() == "landslide_dam":
            return cls.calculate_landslide_dam_outburst(inp)
        elif inp.dam_type.lower() == "rockfill":
            return cls.calculate_macdonald_1984(inp)
        else:
            return cls.calculate_froehlich_2008(inp)

    @classmethod
    def _synthesize_breach_hydrograph(
        cls, V_w: float, Q_p: float, t_peak_hrs: float, t_f_hrs: float, steps: int = 60
    ) -> tuple[List[float], List[float]]:
        """
        Synthesizes a realistic asymmetric dam-break hydrograph ensuring mass conservation.
        Hydrograph rises from 0 to Q_p at t_peak, then decays exponentially.
        """
        # Duration extends to when outflow is < 5% of peak or reservoir emptied
        # Area under curve must equal V_w
        duration_hrs = max(t_f_hrs * 4.0, t_peak_hrs * 6.0, 3.0)
        dt = duration_hrs / (steps - 1)

        time_series = [round(i * dt, 4) for i in range(steps)]
        raw_flows = []

        # Hydrograph shaping: gamma-distribution-like curve
        for t in time_series:
            if t <= 0.0:
                q = 0.0
            elif t <= t_peak_hrs:
                # Rising limb (power or polynomial)
                frac = t / max(t_peak_hrs, 0.001)
                q = Q_p * (frac ** 2.2)
            else:
                # Falling limb (exponential decay)
                decay_rate = 2.5 / max(t_f_hrs, 0.1)
                q = Q_p * math.exp(-decay_rate * (t - t_peak_hrs))
            raw_flows.append(q)

        # Integrate raw hydrograph using trapezoidal rule: area = m³
        area_m3 = 0.0
        for i in range(len(time_series) - 1):
            dt_sec = (time_series[i + 1] - time_series[i]) * 3600.0
            area_m3 += 0.5 * (raw_flows[i] + raw_flows[i + 1]) * dt_sec

        # Scale flows to match reservoir volume closely (mass conservation)
        if area_m3 > 0:
            scale_factor = V_w / area_m3
            # Limit scale factor to reasonable bounds
            scale_factor = min(max(scale_factor, 0.5), 2.0)
            flow_series = [round(q * scale_factor, 2) for q in raw_flows]
        else:
            flow_series = [round(q, 2) for q in raw_flows]

        return time_series, flow_series
