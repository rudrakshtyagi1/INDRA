"""Generalized source hydrograph generation for FloodLab Phase 6.

The service intentionally separates source generation from downstream hydraulic
execution.  It produces a validated Q(t) boundary with explicit provenance and
assumptions; it does not claim that theoretical source models are observations.
"""
from __future__ import annotations

import csv
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

from floodlab.schemas.boundary import (
    BoundaryHydrograph,
    BoundaryStatistics,
    HydrographPoint,
)
from floodlab.schemas.control import Scenario, SourceType


G = 9.80665


class BoundaryValidationError(ValueError):
    pass


def _as_float(value: Any, name: str, *, positive: bool = False, nonnegative: bool = False) -> float:
    try:
        out = float(value)
    except (TypeError, ValueError):
        raise BoundaryValidationError(f"{name} must be numeric.")
    if not math.isfinite(out):
        raise BoundaryValidationError(f"{name} must be finite.")
    if positive and out <= 0:
        raise BoundaryValidationError(f"{name} must be > 0.")
    if nonnegative and out < 0:
        raise BoundaryValidationError(f"{name} must be >= 0.")
    return out


def _validate_qt(times: Sequence[Any], flows: Sequence[Any]) -> Tuple[List[float], List[float]]:
    if len(times) != len(flows):
        raise BoundaryValidationError("Hydrograph timestamps and discharges must have equal length.")
    if len(times) < 2:
        raise BoundaryValidationError("Hydrograph requires at least two points.")

    t = [_as_float(v, "Hydrograph time", nonnegative=True) for v in times]
    q = [_as_float(v, "Discharge", nonnegative=True) for v in flows]

    if any(t[i] >= t[i + 1] for i in range(len(t) - 1)):
        raise BoundaryValidationError("Hydrograph timestamps must be strictly increasing.")
    return t, q


def _trapz_volume(times: Sequence[float], flows: Sequence[float]) -> float:
    return sum(
        0.5 * (flows[i] + flows[i + 1]) * (times[i + 1] - times[i])
        for i in range(len(times) - 1)
    )


def _statistics(times: Sequence[float], flows: Sequence[float]) -> BoundaryStatistics:
    peak = max(flows)
    idx = flows.index(peak)
    return BoundaryStatistics(
        peak_discharge_m3s=round(peak, 6),
        time_to_peak_sec=round(times[idx], 6),
        total_released_volume_m3=round(_trapz_volume(times, flows), 3),
        duration_sec=round(times[-1] - times[0], 6),
        point_count=len(times),
    )


def _scale_to_volume(times: List[float], flows: List[float], available_volume_m3: float) -> List[float]:
    """Prevent a theoretical hydrograph from releasing more water than available."""
    volume = _trapz_volume(times, flows)
    if volume <= 0 or volume <= available_volume_m3:
        return flows
    factor = available_volume_m3 / volume
    return [q * factor for q in flows]


def _sample_breach_shape(
    peak_q: float,
    formation_time_s: float,
    available_volume_m3: float,
    *,
    recession_multiplier: float,
    step_count: int = 41,
) -> Tuple[List[float], List[float]]:
    """Create a smooth deterministic rise/recession source curve.

    This is deliberately a configurable theoretical boundary, not an empirical
    claim about a particular historical failure.
    """
    total_duration = max(formation_time_s * recession_multiplier, formation_time_s + 60.0)
    times = [total_duration * i / (step_count - 1) for i in range(step_count)]
    flows: List[float] = []
    for t in times:
        if t <= formation_time_s:
            x = t / formation_time_s
            # Smooth accelerating breach formation.
            q = peak_q * (x * x * (3.0 - 2.0 * x))
        else:
            # Exponential recession after peak; reaches a few percent by end.
            tau = max((total_duration - formation_time_s) / 3.2, 1.0)
            q = peak_q * math.exp(-(t - formation_time_s) / tau)
        flows.append(max(0.0, q))

    flows = _scale_to_volume(times, flows, available_volume_m3)
    # Make the tail exactly zero for a clean downstream boundary file.
    flows[-1] = 0.0
    return times, flows


def _theoretical_breach_peak(width_m: float, head_m: float, discharge_coefficient: float) -> float:
    # Broad-crested rectangular breach approximation:
    # Q ~= (2/3) Cd b sqrt(2g) h^(3/2)
    return (2.0 / 3.0) * discharge_coefficient * width_m * math.sqrt(2.0 * G) * (head_m ** 1.5)


class BoundaryService:
    def __init__(self, data_root: Path | None = None):
        # Repository-relative persistent path, matching the existing Phase 1B run layout.
        self.data_root = data_root or (Path.cwd() / "data")
        self._cache: Dict[str, BoundaryHydrograph] = {}

    def generate(self, scenario: Scenario, overrides: Dict[str, Any] | None = None) -> BoundaryHydrograph:
        cfg = dict(scenario.input_configuration or {})
        overrides = overrides or {}
        params = dict(overrides.get("parameters") or {})
        cfg.update({k: v for k, v in params.items() if v is not None})

        override_times = overrides.get("hydrograph_timestamps")
        override_flows = overrides.get("hydrograph_discharges")
        if override_times is not None:
            cfg["hydrograph_timestamps"] = override_times
        if override_flows is not None:
            cfg["hydrograph_discharges"] = override_flows

        source_type = scenario.source_type

        # Uploaded Q(t) is valid for any source type and takes precedence.
        times_in = cfg.get("hydrograph_timestamps") or []
        flows_in = cfg.get("hydrograph_discharges") or []
        if times_in or flows_in:
            times, flows = _validate_qt(times_in, flows_in)
            result = self._build(
                scenario,
                times,
                flows,
                provenance="USER_CONFIGURED",
                method="UPLOADED_QT_HYDROGRAPH",
                assumptions=[
                    "Hydrograph values are user supplied; FloodLab validates "
                    "structure and units but does not infer observational provenance."
                ],
            )
            return self._store(result)

        if source_type == SourceType.ENGINEERED_DAM_BREAK:
            result = self._engineered_dam_break(scenario, cfg)
        elif source_type == SourceType.NATURAL_RIVER_BLOCKAGE:
            result = self._natural_blockage(scenario, cfg)
        elif source_type == SourceType.CONTROLLED_RELEASE:
            result = self._controlled_release(scenario, cfg)
        else:
            raise BoundaryValidationError(f"Unsupported source type: {source_type}")
        return self._store(result)

    def get(self, scenario_id: str) -> BoundaryHydrograph | None:
        if scenario_id in self._cache:
            return self._cache[scenario_id]
        metadata_path = self.data_root / "scenarios" / scenario_id / "boundary" / "boundary_hydrograph.json"
        if metadata_path.exists():
            try:
                obj = BoundaryHydrograph.model_validate_json(metadata_path.read_text())
                self._cache[scenario_id] = obj
                return obj
            except Exception:
                return None
        return None

    def persist_to_run(self, scenario_id: str, run_id: str, run_base_path: Path) -> Dict[str, str]:
        boundary = self.get(scenario_id)
        if boundary is None:
            return {}
        inputs = run_base_path / "inputs"
        inputs.mkdir(parents=True, exist_ok=True)
        csv_path = inputs / "boundary_hydrograph.csv"
        json_path = inputs / "boundary_manifest.json"
        self._write_csv(csv_path, boundary)
        json_path.write_text(boundary.model_dump_json(indent=2))
        return {
            "boundary_hydrograph_csv": str(csv_path),
            "boundary_manifest_json": str(json_path),
        }

    def _engineered_dam_break(self, scenario: Scenario, cfg: Dict[str, Any]) -> BoundaryHydrograph:
        storage = _as_float(
            cfg.get("reservoir_storage", cfg.get("reservoir_volume_m3")),
            "Reservoir storage",
            positive=True,
        )
        height = _as_float(cfg.get("dam_height", cfg.get("dam_height_m")), "Dam height", positive=True)
        head = _as_float(cfg.get("hydraulic_head_m", height), "Hydraulic head", positive=True)
        breach_width = _as_float(cfg.get("breach_width"), "Breach width", positive=True)
        formation = cfg.get("breach_formation_time_s")
        if formation is None:
            breach_time_hrs = _as_float(cfg.get("breach_time"), "Breach formation time", positive=True)
            formation = breach_time_hrs * 3600.0
        formation = _as_float(formation, "Breach formation time", positive=True)

        q_peak = _theoretical_breach_peak(breach_width, head, 0.60)
        times, flows = _sample_breach_shape(q_peak, formation, storage * 0.95, recession_multiplier=5.0)
        return self._build(
            scenario,
            times,
            flows,
            provenance="MODELLED",
            method="THEORETICAL_BROAD_CRESTED_BREACH_APPROXIMATION",
            assumptions=[
                "Configurable emergency-planning source model; not a validated Tehri failure reconstruction.",
                "Peak outflow uses a broad-crested rectangular breach approximation with Cd=0.60.",
                "Hydrograph volume is constrained to <=95% of configured reservoir storage.",
            ],
        )

    def _natural_blockage(self, scenario: Scenario, cfg: Dict[str, Any]) -> BoundaryHydrograph:
        volume = _as_float(cfg.get("impounded_volume_m3"), "Impounded lake volume", positive=True)
        blockage_height = _as_float(cfg.get("blockage_height_m"), "Blockage height", positive=True)
        breach_width = _as_float(
            cfg.get("blockage_breach_width_m", cfg.get("breach_width")),
            "Blockage breach width",
            positive=True,
        )
        failure_duration = _as_float(cfg.get("failure_duration_s"), "Failure duration", positive=True)
        upstream_depth = _as_float(
            cfg.get("upstream_water_depth_m", 0.8 * blockage_height),
            "Upstream water depth",
            positive=True,
        )
        if upstream_depth > blockage_height * 1.5:
            raise BoundaryValidationError("Upstream water depth is inconsistent with configured blockage height.")

        q_peak = _theoretical_breach_peak(breach_width, upstream_depth, 0.50)
        times, flows = _sample_breach_shape(q_peak, failure_duration, volume * 0.95, recession_multiplier=6.0)
        return self._build(
            scenario,
            times,
            flows,
            provenance="MODELLED",
            method="THEORETICAL_BLOCKAGE_BREACH_WEIR_APPROXIMATION",
            assumptions=[
                "Configurable theoretical natural-blockage source model; "
                "not assigned to a historical event unless external validation data are supplied.",
                "Peak outflow uses a broad-crested breach approximation with Cd=0.50.",
                "Hydrograph volume is constrained to <=95% of configured impounded volume.",
            ],
        )

    def _controlled_release(self, scenario: Scenario, cfg: Dict[str, Any]) -> BoundaryHydrograph:
        start = _as_float(cfg.get("release_start_time_s", 0), "Release start time", nonnegative=True)
        ramp_up = _as_float(cfg.get("release_ramp_up_s"), "Ramp-up duration", positive=True)
        peak = _as_float(cfg.get("peak_release_m3s"), "Peak release", nonnegative=True)
        hold = _as_float(cfg.get("release_hold_s", 0), "Hold duration", nonnegative=True)
        ramp_down = _as_float(cfg.get("release_ramp_down_s"), "Ramp-down duration", positive=True)

        times = [0.0]
        flows = [0.0]
        if start > 0:
            times.append(start)
            flows.append(0.0)
        peak_time = start + ramp_up
        times.append(peak_time)
        flows.append(peak)
        if hold > 0:
            times.append(peak_time + hold)
            flows.append(peak)
        times.append(peak_time + hold + ramp_down)
        flows.append(0.0)
        times, flows = _validate_qt(times, flows)
        return self._build(
            scenario,
            times,
            flows,
            provenance="USER_CONFIGURED",
            method="DETERMINISTIC_CONTROLLED_RELEASE_SCHEDULE",
            assumptions=[
                "User-configured release schedule; it is not labelled as actual dam-gate telemetry.",
                "Piecewise-linear ramp-up, hold, and ramp-down are used to construct Q(t).",
            ],
        )

    def _build(
        self,
        scenario: Scenario,
        times: Sequence[float],
        flows: Sequence[float],
        *,
        provenance: str,
        method: str,
        assumptions: List[str],
    ) -> BoundaryHydrograph:
        times, flows = _validate_qt(times, flows)
        return BoundaryHydrograph(
            scenario_id=scenario.scenario_id,
            source_type=scenario.source_type,
            provenance=provenance,
            generation_method=method,
            assumptions=assumptions,
            generated_at=datetime.now(timezone.utc),
            statistics=_statistics(times, flows),
            hydrograph=[HydrographPoint(time_sec=t, discharge_m3s=q) for t, q in zip(times, flows)],
        )

    def _store(self, boundary: BoundaryHydrograph) -> BoundaryHydrograph:
        self._cache[boundary.scenario_id] = boundary
        base = self.data_root / "scenarios" / boundary.scenario_id / "boundary"
        base.mkdir(parents=True, exist_ok=True)
        self._write_csv(base / "boundary_hydrograph.csv", boundary)
        (base / "boundary_hydrograph.json").write_text(boundary.model_dump_json(indent=2))
        return boundary

    @staticmethod
    def _write_csv(path: Path, boundary: BoundaryHydrograph) -> None:
        with path.open("w", newline="") as fh:
            writer = csv.writer(fh)
            writer.writerow(["time_sec", "discharge_m3s"])
            for point in boundary.hydrograph:
                writer.writerow([point.time_sec, point.discharge_m3s])


boundary_service = BoundaryService()
