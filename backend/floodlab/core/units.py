"""
FloodLab - Centralized Scientific Unit Conversions & Numerical Validation Utilities.

Standard unit definitions:
- 1 km² = 1,000,000 m² (10^6 m²)
- 1 ha  = 10,000 m² = 0.01 km²
- 1 km  = 1,000 m
- 1 MCM = 1,000,000 m³ (10^6 m³)
- 1 hour = 3600 seconds
"""
from __future__ import annotations

import math
from typing import Any, List, Optional, Tuple, Union
import numpy as np


# -----------------------------------------------------------------------------
# Area Conversions
# -----------------------------------------------------------------------------

def m2_to_km2(area_m2: float) -> float:
    """Convert square meters (m²) to square kilometers (km²)."""
    return float(area_m2) / 1_000_000.0


def km2_to_m2(area_km2: float) -> float:
    """Convert square kilometers (km²) to square meters (m²)."""
    return float(area_km2) * 1_000_000.0


def ha_to_km2(area_ha: float) -> float:
    """Convert hectares (ha) to square kilometers (km²)."""
    return float(area_ha) / 100.0


def km2_to_ha(area_km2: float) -> float:
    """Convert square kilometers (km²) to hectares (ha)."""
    return float(area_km2) * 100.0


def ha_to_m2(area_ha: float) -> float:
    """Convert hectares (ha) to square meters (m²)."""
    return float(area_ha) * 10_000.0


def m2_to_ha(area_m2: float) -> float:
    """Convert square meters (m²) to hectares (ha)."""
    return float(area_m2) / 10_000.0


# -----------------------------------------------------------------------------
# Volume Conversions
# -----------------------------------------------------------------------------

def m3_to_mcm(volume_m3: float) -> float:
    """Convert cubic meters (m³) to Million Cubic Meters (MCM)."""
    return float(volume_m3) / 1_000_000.0


def mcm_to_m3(volume_mcm: float) -> float:
    """Convert Million Cubic Meters (MCM) to cubic meters (m³)."""
    return float(volume_mcm) * 1_000_000.0


def m3_to_billion_m3(volume_m3: float) -> float:
    """Convert cubic meters (m³) to Billion Cubic Meters (BCM)."""
    return float(volume_m3) / 1_000_000_000.0


# -----------------------------------------------------------------------------
# Numerical Validity Guards
# -----------------------------------------------------------------------------

def is_finite_number(val: Any) -> bool:
    """Check if a value is a finite number (not NaN, not Inf, not None)."""
    if val is None:
        return False
    try:
        f = float(val)
        return not (math.isnan(f) or math.isinf(f))
    except (ValueError, TypeError):
        return False


def validate_array_finite(
    arr: Union[np.ndarray, List[Any]],
    name: str = "array",
    min_val: Optional[float] = None,
    max_val: Optional[float] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Validate that an array contains only finite numbers within plausible bounds.

    Returns:
        (is_valid, error_message_or_None)
    """
    if arr is None or len(arr) == 0:
        return False, f"{name} is empty or None."

    np_arr = np.asarray(arr, dtype=np.float64)

    if np.any(np.isnan(np_arr)):
        return False, f"{name} contains NaN values."
    if np.any(np.isinf(np_arr)):
        return False, f"{name} contains infinite values."

    if min_val is not None and np.any(np_arr < min_val):
        return False, f"{name} contains values below minimum threshold {min_val} (min found: {np.min(np_arr)})."
    if max_val is not None and np.any(np_arr > max_val):
        return False, f"{name} contains values exceeding maximum threshold {max_val} (max found: {np.max(np_arr)})."

    return True, None


def sanitize_float(
    val: Any,
    default: float = 0.0,
    min_val: Optional[float] = None,
    max_val: Optional[float] = None,
) -> float:
    """Safely convert value to finite float with optional bounds clamping."""
    if not is_finite_number(val):
        return default
    f = float(val)
    if min_val is not None and f < min_val:
        f = min_val
    if max_val is not None and f > max_val:
        f = max_val
    return f


def validate_hydrograph_integrity(
    times_hrs: List[float],
    flows_m3s: List[float],
    expected_volume_m3: Optional[float] = None,
    mass_tolerance: float = 0.25,
) -> Tuple[bool, float, Optional[str]]:
    """
    Validate a discharge hydrograph:
    1. Arrays non-empty and equal length.
    2. Timesteps strictly ascending and finite.
    3. Flows non-negative and finite.
    4. Integrated volume matches expected volume within tolerance (if provided).

    Returns:
        (is_valid, integrated_volume_m3, error_message_or_None)
    """
    if not times_hrs or not flows_m3s or len(times_hrs) != len(flows_m3s):
        return False, 0.0, "Hydrograph times and flows must be non-empty and equal length."

    valid_t, err_t = validate_array_finite(times_hrs, "hydrograph_times", min_val=0.0)
    if not valid_t:
        return False, 0.0, err_t

    valid_q, err_q = validate_array_finite(flows_m3s, "hydrograph_flows", min_val=0.0)
    if not valid_q:
        return False, 0.0, err_q

    # Monotonicity check
    t_arr = np.array(times_hrs)
    if len(t_arr) > 1 and np.any(np.diff(t_arr) <= 0):
        return False, 0.0, "Hydrograph timesteps must be strictly increasing."

    # Integrate volume: V = integral Q(t) dt [m3]
    t_sec = t_arr * 3600.0
    q_arr = np.array(flows_m3s)
    trapz_fn = getattr(np, "trapezoid", getattr(np, "trapz", None))
    if trapz_fn:
        integrated_vol_m3 = float(trapz_fn(q_arr, t_sec))
    else:
        integrated_vol_m3 = float(np.sum(0.5 * (q_arr[:-1] + q_arr[1:]) * np.diff(t_sec)))

    if not is_finite_number(integrated_vol_m3) or integrated_vol_m3 < 0:
        return False, 0.0, "Integrated hydrograph volume is non-finite or negative."

    if expected_volume_m3 is not None and expected_volume_m3 > 0:
        rel_error = abs(integrated_vol_m3 - expected_volume_m3) / expected_volume_m3
        if rel_error > mass_tolerance:
            return False, integrated_vol_m3, (
                f"Mass conservation violation: integrated volume ({integrated_vol_m3/1e6:.2f} MCM) "
                f"deviates by {rel_error*100:.1f}% from expected volume ({expected_volume_m3/1e6:.2f} MCM), "
                f"exceeding tolerance {mass_tolerance*100:.1f}%."
            )

    return True, integrated_vol_m3, None
