"""
Empirical dam breach formulations.

All models return a BreachResult with provenance_map classifying each output field.

References:
    Froehlich, D.C. (2008). "Empirical Model of Embankment Dam Breach Parameters."
        ASCE J. Hydraulic Engineering, 134(12), 1731-1743.
    MacDonald, T.C., Langridge-Monopolis, J. (1984). "Breaching Characteristics of
        Dam Failures." ASCE J. Hydraulic Engineering, 110(5), 567-586.
    Von Thun, J.L., Gillette, D.R. (1990). "Guidance on Breach Parameters."
        US Bureau of Reclamation Internal Memorandum.
    Ritter, A. (1892). "Die Fortpflanzung der Wasserwellen."
        Zeitschrift des Vereines Deutscher Ingenieure, 36(33), 947-954.
    Costa, J.E., Schuster, R.L. (1988). "The Formation and Failure of Natural Dams."
        Geol. Soc. Am. Bulletin, 100(7), 1054-1068.
"""
from __future__ import annotations

import math
from typing import Dict, Optional

from pydantic import BaseModel, Field

from floodlab.config.constants import BreachModel, G


class DamBreachInput(BaseModel):
    dam_height_m: float = Field(..., gt=0, description="Structural dam height [m]")
    hydraulic_head_m: float = Field(..., gt=0, description="Hydraulic head at time of breach [m]")
    reservoir_volume_m3: float = Field(..., gt=0, description="Reservoir volume at breach [m³]")
    breach_mode: str = Field(default="overtopping", description="overtopping | piping | instantaneous | ldof")
    breach_model: BreachModel = Field(default=BreachModel.FROEHLICH_2008)

    # Optional overrides
    avg_breach_width_override_m: Optional[float] = Field(default=None)
    formation_time_override_hrs: Optional[float] = Field(default=None)

    model_config = {"protected_namespaces": ()}


class BreachResult(BaseModel):
    avg_breach_width_m: float
    side_slope_z: float
    formation_time_hrs: float
    peak_discharge_m3s: float
    time_to_peak_hrs: float
    hydrograph_times_hrs: list[float]
    hydrograph_flows_m3s: list[float]
    eroded_volume_m3: Optional[float] = None
    model_used: str
    provenance_map: Dict[str, str]

    model_config = {"protected_namespaces": ()}


class BreachMechanicsEngine:
    """
    Multi-model dam breach mechanics engine.

    Supports 5 empirical formulations. All outputs include provenance labels.
    """

    def evaluate(self, inp: DamBreachInput, model: Optional[BreachModel] = None) -> BreachResult:
        """Run the specified (or input-specified) breach model."""
        m = model or inp.breach_model
        dispatch = {
            BreachModel.FROEHLICH_2008: self.calculate_froehlich_2008,
            BreachModel.MACDONALD_1984: self.calculate_macdonald_1984,
            BreachModel.VON_THUN_1990: self.calculate_von_thun_1990,
            BreachModel.RITTER_INSTANTANEOUS: self.calculate_ritter_instantaneous,
            BreachModel.LDOF_COSTA_SCHUSTER: self.calculate_ldof_costa_schuster,
        }
        if m not in dispatch:
            raise ValueError(f"Unknown breach model: {m}")
        return dispatch[m](inp)

    # -------------------------------------------------------------------------
    # Froehlich (2008)
    # -------------------------------------------------------------------------
    def calculate_froehlich_2008(self, inp: DamBreachInput) -> BreachResult:
        """
        Froehlich (2008) regression equations for embankment dam breach parameters.

        Bavg = 0.27 * Ko * Vw^0.32 * hb^0.04   (overtopping: Ko=0.7, piping: Ko=1.0)
        tf   = 63.2 * sqrt(Vw / (g * hb^2))     [hours]
        z    = 1.4  (overtopping) / 0.9 (piping)
        """
        hb = inp.hydraulic_head_m
        Vw = inp.reservoir_volume_m3
        Ko = 0.7 if inp.breach_mode == "overtopping" else 1.0

        # Breach width and side slope
        Bavg = 0.27 * Ko * (Vw ** 0.32) * (hb ** 0.04)
        z = 1.4 if inp.breach_mode == "overtopping" else 0.9

        # Formation time [hours]
        tf = 63.2 * math.sqrt(Vw / (G * hb ** 2))

        Bavg, tf = self._apply_overrides(inp, Bavg, tf)
        Qp, t_times, t_flows = self._synthesize_hydrograph(Vw, hb, Bavg, z, tf)

        return BreachResult(
            avg_breach_width_m=Bavg,
            side_slope_z=z,
            formation_time_hrs=tf,
            peak_discharge_m3s=Qp,
            time_to_peak_hrs=tf * 0.4,
            hydrograph_times_hrs=t_times,
            hydrograph_flows_m3s=t_flows,
            model_used="froehlich_2008",
            provenance_map={
                "avg_breach_width_m": "MODELLED:froehlich_2008",
                "side_slope_z": "MODELLED:froehlich_2008",
                "formation_time_hrs": "MODELLED:froehlich_2008"
                if not inp.formation_time_override_hrs else "ASSUMED:analyst_override",
                "peak_discharge_m3s": "MODELLED:froehlich_2008",
            },
        )

    # -------------------------------------------------------------------------
    # MacDonald & Langridge-Monopolis (1984)
    # -------------------------------------------------------------------------
    def calculate_macdonald_1984(self, inp: DamBreachInput) -> BreachResult:
        """
        MacDonald & Langridge-Monopolis (1984) erosion volume regression.

        Ve = 0.0261 * (Vw * hw)^0.769    [m³]
        Bavg = sqrt(Ve / hb)              [m] (triangular cross-section approx)
        tf   = empirical from erosion volume
        """
        hb = inp.hydraulic_head_m
        Vw = inp.reservoir_volume_m3
        hw = inp.dam_height_m

        Ve = 0.0261 * ((Vw * hw) ** 0.769)
        Bavg = math.sqrt(Ve / hb) if hb > 0 else 10.0
        z = 0.5
        tf = 0.364 * (Ve ** 0.364)  # [hours] - empirical

        Bavg, tf = self._apply_overrides(inp, Bavg, tf)
        Qp, t_times, t_flows = self._synthesize_hydrograph(Vw, hb, Bavg, z, tf)

        return BreachResult(
            avg_breach_width_m=Bavg,
            side_slope_z=z,
            formation_time_hrs=tf,
            peak_discharge_m3s=Qp,
            time_to_peak_hrs=tf * 0.4,
            hydrograph_times_hrs=t_times,
            hydrograph_flows_m3s=t_flows,
            eroded_volume_m3=Ve,
            model_used="macdonald_1984",
            provenance_map={
                "avg_breach_width_m": "MODELLED:macdonald_1984",
                "eroded_volume_m3": "MODELLED:macdonald_1984",
                "peak_discharge_m3s": "MODELLED:macdonald_1984",
            },
        )

    # -------------------------------------------------------------------------
    # Von Thun & Gillette (1990)
    # -------------------------------------------------------------------------
    def calculate_von_thun_1990(self, inp: DamBreachInput) -> BreachResult:
        """
        Von Thun & Gillette (1990).

        B = 2.5*hb + Cb   where Cb = f(reservoir capacity)
        tf = B / (4*hb)   [hours] for overtopping
        """
        hb = inp.hydraulic_head_m
        Vw = inp.reservoir_volume_m3

        # Cb coefficient from reservoir storage capacity table
        if Vw < 1.23e6:
            Cb = 6.1
        elif Vw < 6.17e6:
            Cb = 18.3
        elif Vw < 1.234e8:
            Cb = 42.7
        else:
            Cb = 54.9

        Bavg = 2.5 * hb + Cb
        z = 1.0
        tf = Bavg / (4.0 * hb) if hb > 0 else 1.0

        Bavg, tf = self._apply_overrides(inp, Bavg, tf)
        Qp, t_times, t_flows = self._synthesize_hydrograph(Vw, hb, Bavg, z, tf)

        return BreachResult(
            avg_breach_width_m=Bavg,
            side_slope_z=z,
            formation_time_hrs=tf,
            peak_discharge_m3s=Qp,
            time_to_peak_hrs=tf * 0.4,
            hydrograph_times_hrs=t_times,
            hydrograph_flows_m3s=t_flows,
            model_used="von_thun_1990",
            provenance_map={
                "avg_breach_width_m": "MODELLED:von_thun_1990",
                "peak_discharge_m3s": "MODELLED:von_thun_1990",
            },
        )

    # -------------------------------------------------------------------------
    # Ritter (1892) Instantaneous
    # -------------------------------------------------------------------------
    def calculate_ritter_instantaneous(self, inp: DamBreachInput) -> BreachResult:
        """
        Ritter (1892) analytical instantaneous breach.
        Full-width dam crest as breach width. tf = 0.
        Peak discharge: Qp = 8/27 * sqrt(g) * hb^(5/2) * B
        """
        hb = inp.hydraulic_head_m
        Bavg = inp.dam_height_m * 2.0  # approximate full crest width
        z = 0.0
        tf = 0.0

        Qp = (8.0 / 27.0) * math.sqrt(G) * (hb ** 2.5) * Bavg

        # Instantaneous: triangular hydrograph with very short rise
        t_peak = 0.001
        t_total = 3.0  # hours
        steps = 60
        dt = t_total / steps
        t_times = [i * dt for i in range(steps + 1)]
        t_flows = []
        for t in t_times:
            if t <= t_peak:
                t_flows.append(Qp * (t / t_peak))
            else:
                decay = math.exp(-2.0 * (t - t_peak))
                t_flows.append(Qp * decay)

        return BreachResult(
            avg_breach_width_m=Bavg,
            side_slope_z=z,
            formation_time_hrs=tf,
            peak_discharge_m3s=Qp,
            time_to_peak_hrs=t_peak,
            hydrograph_times_hrs=t_times,
            hydrograph_flows_m3s=t_flows,
            model_used="ritter_instantaneous",
            provenance_map={
                "avg_breach_width_m": "ASSUMED:full_crest_width_approximation",
                "peak_discharge_m3s": "MODELLED:ritter_1892_analytical",
                "formation_time_hrs": "ASSUMED:instantaneous",
            },
        )

    # -------------------------------------------------------------------------
    # LDOF Costa-Schuster (1988) / Landslide Dam Outburst Flood
    # -------------------------------------------------------------------------
    def calculate_ldof_costa_schuster(self, inp: DamBreachInput) -> BreachResult:
        """
        Landslide dam outburst flood (Costa & Schuster 1988).
        Peak discharge: Qp = 6.7 * V^0.56   [m3/s]
        """
        Vw = inp.reservoir_volume_m3
        hb = inp.hydraulic_head_m
        Bavg = hb * 1.5  # typical ratio for landslide dams
        z = 0.5
        tf = 0.5  # rapid failure typical

        Qp = 6.7 * (Vw ** 0.56)

        Bavg, tf = self._apply_overrides(inp, Bavg, tf)
        _, t_times, t_flows = self._synthesize_hydrograph(Vw, hb, Bavg, z, tf)
        # Rescale to match LDOF peak
        max_flow = max(t_flows) if t_flows else 1.0
        t_flows = [f * Qp / max_flow for f in t_flows]

        return BreachResult(
            avg_breach_width_m=Bavg,
            side_slope_z=z,
            formation_time_hrs=tf,
            peak_discharge_m3s=Qp,
            time_to_peak_hrs=tf * 0.4,
            hydrograph_times_hrs=t_times,
            hydrograph_flows_m3s=t_flows,
            model_used="ldof_costa_schuster",
            provenance_map={
                "peak_discharge_m3s": "MODELLED:ldof_costa_schuster_1988",
                "avg_breach_width_m": "ASSUMED:ldof_approximation",
            },
        )

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------
    @staticmethod
    def _apply_overrides(inp: DamBreachInput, Bavg: float, tf: float) -> tuple[float, float]:
        if inp.avg_breach_width_override_m is not None:
            Bavg = inp.avg_breach_width_override_m
        if inp.formation_time_override_hrs is not None:
            tf = inp.formation_time_override_hrs
        return Bavg, tf

    @staticmethod
    def _synthesize_hydrograph(
        Vw: float,
        hb: float,
        Bavg: float,
        z: float,
        tf: float,
        steps: int = 60,
    ) -> tuple[float, list[float], list[float]]:
        """
        Synthesise a trapezoidal-to-triangular outflow hydrograph.

        Returns: (Qp, times_hrs, flows_m3s)
        """
        # Broad-crested weir peak discharge
        # Q = Cd * (B + z*h) * h^(3/2) * sqrt(2g/3)  (trapezoidal weir)
        Cd = 1.7
        A_breach = (Bavg + z * hb) * hb
        Qp = Cd * A_breach * math.sqrt(G * hb)

        if tf <= 0:
            tf = 0.01

        t_peak = 0.4 * tf
        t_total = max(tf * 2.5, 1.0)
        dt = t_total / steps

        times = [i * dt for i in range(steps + 1)]
        flows = []
        for t in times:
            if t <= t_peak:
                flows.append(Qp * (t / t_peak))
            elif t <= tf:
                flows.append(Qp)
            else:
                tail_dur = t_total - tf
                if tail_dur > 0:
                    flows.append(Qp * max(0.0, 1.0 - (t - tf) / tail_dur))
                else:
                    flows.append(0.0)

        return Qp, times, flows
