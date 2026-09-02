"""Spatial comparison between modelled inundation and satellite-derived water change."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from pyproj import CRS, Transformer
from shapely.geometry import shape
from shapely.ops import transform, unary_union


V3_GEOJSON = "lisflood_fp/outputs/v3_geometry_corrected/rasters/inundation_extent_v3.geojson"
V4_GEOJSON = "lisflood_fp/outputs/v4_extended/outputs/vectors/inundation_extent_v4_corrected.geojson"

MODEL_PRODUCTS = {
    "TEHRI_V3_BENCHMARK": [
        f"/data/processed/tehri_simulations/{V3_GEOJSON}",
        f"data/processed/tehri_simulations/{V3_GEOJSON}",
    ],
    "TEHRI_V4_CORRECTED": [
        f"/data/processed/tehri_simulations/{V4_GEOJSON}",
        f"data/processed/tehri_simulations/{V4_GEOJSON}",
    ],
}


def _existing_path(candidates: list[str]) -> Optional[Path]:
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return path
    return None


def available_model_products() -> list[dict[str, Any]]:
    products = []
    for run_id, candidates in MODEL_PRODUCTS.items():
        path = _existing_path(candidates)
        products.append(
            {
                "run_id": run_id,
                "available": path is not None,
                "product": "inundation_extent",
                "provenance": "PRECOMPUTED MODEL RESULT",
            }
        )
    return products


def _union_geojson(payload: dict[str, Any]):
    if payload.get("type") == "FeatureCollection":
        geoms = [shape(f["geometry"]) for f in payload.get("features", []) if f.get("geometry")]
        return unary_union(geoms) if geoms else None
    if payload.get("type") == "Feature":
        return shape(payload["geometry"])
    return shape(payload)


def _utm_crs_for_geometry(geom) -> CRS:
    lon, lat = geom.centroid.x, geom.centroid.y
    zone = int((lon + 180) // 6) + 1
    epsg = (32600 if lat >= 0 else 32700) + zone
    return CRS.from_epsg(epsg)


def compare_geojson_extents(
    satellite_geojson: dict[str, Any],
    model_geojson: dict[str, Any],
) -> dict[str, Any]:
    sat = _union_geojson(satellite_geojson)
    model = _union_geojson(model_geojson)
    if sat is None or model is None or sat.is_empty or model.is_empty:
        return {
            "intersection_km2": 0.0,
            "union_km2": 0.0,
            "iou": 0.0,
            "satellite_coverage_of_model": 0.0,
            "model_coverage_of_satellite": 0.0,
        }

    combined = unary_union([sat, model])
    utm = _utm_crs_for_geometry(combined)
    transformer = Transformer.from_crs("EPSG:4326", utm, always_xy=True)

    def _proj(g):
        return transform(transformer.transform, g)

    sat_m = _proj(sat)
    model_m = _proj(model)

    intersection = sat_m.intersection(model_m).area
    union = sat_m.union(model_m).area
    sat_area = sat_m.area
    model_area = model_m.area
    return {
        "intersection_km2": round(intersection / 1e6, 6),
        "union_km2": round(union / 1e6, 6),
        "iou": round(intersection / union, 6) if union > 0 else 0.0,
        "satellite_coverage_of_model": round(intersection / model_area, 6) if model_area > 0 else 0.0,
        "model_coverage_of_satellite": round(intersection / sat_area, 6) if sat_area > 0 else 0.0,
    }


class ObservationComparator:
    def compare_saved_analysis(
        self,
        analysis: dict[str, Any],
        run_id: str,
        purpose: str = "context",
    ) -> dict[str, Any]:
        if run_id not in MODEL_PRODUCTS:
            raise FileNotFoundError(f"Unknown model run: {run_id}")
        model_path = _existing_path(MODEL_PRODUCTS[run_id])
        if model_path is None:
            raise FileNotFoundError(f"Model inundation product not available for {run_id}")
        model_geojson = json.loads(model_path.read_text(encoding="utf-8"))
        metrics = compare_geojson_extents(analysis.get("flood_extent_geojson", {}), model_geojson)

        is_tehri_hypothetical = run_id.startswith("TEHRI_")
        validation_status = "SPATIAL_CONTEXT_ONLY"
        if purpose == "historical_validation" and not is_tehri_hypothetical:
            validation_status = "HISTORICAL_SPATIAL_COMPARISON"

        return {
            "analysis_id": analysis.get("analysis_id"),
            "run_id": run_id,
            "metrics": metrics,
            "purpose": purpose,
            "validation_status": validation_status,
            "interpretation": (
                "The Tehri catastrophic-breach benchmark is hypothetical; "
                "overlap is environmental spatial context and must not be presented as physical validation."
                if is_tehri_hypothetical
                else "Spatial overlap metrics compare the selected model product with "
                     "the satellite-derived surface-water-change extent."
            ),
            "provenance": {
                "model": "MODELLED / PRECOMPUTED MODEL RESULT",
                "satellite": "OBSERVED INPUT + DERIVED CHANGE EXTENT",
                "comparison": "DERIVED",
            },
        }
