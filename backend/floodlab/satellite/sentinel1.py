"""Real Sentinel-1 GRD bitemporal surface-water change analysis via Earth Engine.

The workflow deliberately returns DATA_UNAVAILABLE when Earth Engine cannot be
authenticated.  It never manufactures SAR measurements.
"""
from __future__ import annotations

import json
import math
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

import numpy as np

from floodlab.config.settings import get_settings
from floodlab.schemas.satellite import SARAnalysisRequest
from floodlab.services.earth_engine import EarthEngineClient, get_earth_engine_client


SURVEILLANCE_ZONES: list[dict[str, Any]] = [
    {
        "id": "tehri_upstream",
        "name": "Tehri Catchment / Upper Bhagirathi-Bhilangna",
        "river": "Bhagirathi / Bhilangna",
        "state": "Uttarakhand",
        "lat": 30.378,
        "lon": 78.480,
        "bbox": [78.30, 30.25, 78.85, 30.70],
        "purpose": "Reservoir and catchment surface-water context",
    },
    {
        "id": "rishi_ganga",
        "name": "Rishi Ganga / Dhauliganga (Chamoli)",
        "river": "Rishi Ganga / Dhauliganga",
        "state": "Uttarakhand",
        "lat": 30.485,
        "lon": 79.738,
        "bbox": [79.65, 30.35, 79.95, 30.60],
        "purpose": "Mountain-valley water-change surveillance",
    },
    {
        "id": "bhakra_upstream",
        "name": "Gobind Sagar / Bhakra Catchment",
        "river": "Sutlej",
        "state": "Himachal Pradesh",
        "lat": 31.411,
        "lon": 76.437,
        "bbox": [76.40, 31.20, 77.10, 31.80],
        "purpose": "Reservoir and catchment surface-water context",
    },
]


def otsu_threshold(bucket_means: Iterable[float], histogram: Iterable[float]) -> float:
    """Return the Otsu threshold for a histogram.

    This computation happens locally on the histogram returned by Earth Engine,
    which makes it deterministic and independently unit-testable.
    """
    means = np.asarray(list(bucket_means), dtype=float)
    counts = np.asarray(list(histogram), dtype=float)
    if means.size < 2 or counts.size != means.size or counts.sum() <= 0:
        raise ValueError("Histogram is insufficient for Otsu thresholding")

    weight1 = np.cumsum(counts)
    weight2 = counts.sum() - weight1
    mean1 = np.cumsum(counts * means) / np.maximum(weight1, 1e-12)
    reverse_weighted = np.cumsum((counts * means)[::-1])[::-1]
    mean2 = reverse_weighted / np.maximum(weight2 + counts, 1e-12)

    # Thresholds live between bins i and i+1. Between-class variance is enough;
    # no assumptions about a specific dB threshold are hidden here.
    variance = weight1[:-1] * weight2[:-1] * (mean1[:-1] - mean2[1:]) ** 2
    if not np.isfinite(variance).any():
        raise ValueError("Otsu variance could not be computed")
    idx = int(np.nanargmax(variance))
    return float((means[idx] + means[idx + 1]) / 2.0)


def _bbox_area_km2(bbox: list[float]) -> float:
    min_lon, min_lat, max_lon, max_lat = bbox
    mid_lat = math.radians((min_lat + max_lat) / 2.0)
    width = abs(max_lon - min_lon) * 111.32 * math.cos(mid_lat)
    height = abs(max_lat - min_lat) * 110.57
    return max(width * height, 0.0)


class Sentinel1AnalysisService:
    DATASET = "COPERNICUS/S1_GRD"

    def __init__(self, ee_client: Optional[EarthEngineClient] = None) -> None:
        self.ee_client = ee_client or get_earth_engine_client()
        settings = get_settings()
        self.storage_dir = Path(settings.storage_root) / "satellite"
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def status(self) -> dict[str, Any]:
        gee_status = self.ee_client.status(probe=True).safe_dict()
        settings = get_settings()
        is_cop_conf = bool(settings.copernicus_client_id and settings.copernicus_client_secret)
        return {
            "google_earth_engine": gee_status,
            "copernicus_data_space": {
                "configured": is_cop_conf,
                "required_for_this_workflow": False,
                "status": "CONFIGURED" if is_cop_conf else "OPTIONAL_NOT_CONFIGURED",
            },
            "dataset": self.DATASET,
            "workflow": "BITEMPORAL_SENTINEL1_SURFACE_WATER_CHANGE",
            "synthetic_observations": False,
        }

    def list_zones(self) -> list[dict[str, Any]]:
        return SURVEILLANCE_ZONES

    def list_analyses(self, limit: int = 20) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        for path in sorted(self.storage_dir.glob("sar_*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
                records.append(self._summary(payload))
            except Exception:
                continue
            if len(records) >= limit:
                break
        return records

    def get_analysis(self, analysis_id: str) -> dict[str, Any]:
        path = self.storage_dir / f"{analysis_id}.json"
        if not path.exists():
            raise FileNotFoundError(analysis_id)
        return json.loads(path.read_text(encoding="utf-8"))

    def analyse(self, request: SARAnalysisRequest) -> dict[str, Any]:
        ee = self.ee_client.initialize()
        if _bbox_area_km2(request.bbox) > 6000:
            raise ValueError("AOI is too large for interactive SAR vectorization; maximum approximate area is 6000 km2")
        aoi = ee.Geometry.Rectangle(request.bbox, proj="EPSG:4326", geodesic=False)

        pre_start = request.pre_date - timedelta(days=request.window_days)
        pre_end = request.pre_date + timedelta(days=1)
        post_start = request.post_date - timedelta(days=request.window_days)
        post_end = request.post_date + timedelta(days=1)

        collection = (
            ee.ImageCollection(self.DATASET)
            .filterBounds(aoi)
            .filter(ee.Filter.eq("instrumentMode", "IW"))
            .filter(ee.Filter.listContains("transmitterReceiverPolarisation", request.polarization))
        )
        if request.orbit_pass:
            collection = collection.filter(ee.Filter.eq("orbitProperties_pass", request.orbit_pass))

        pre_collection = collection.filterDate(str(pre_start), str(pre_end))
        post_collection = collection.filterDate(str(post_start), str(post_end))
        pre_count = int(pre_collection.size().getInfo())
        post_count = int(post_collection.size().getInfo())
        if pre_count == 0 or post_count == 0:
            raise ValueError(
                f"No homogeneous Sentinel-1 scenes available for requested windows "
                f"(pre={pre_count}, post={post_count})"
            )

        # Keep geometry/incidence conditions comparable: select the post-event scene's
        # relative orbit and use that same track for both windows when possible.
        latest_post = ee.Image(post_collection.sort("system:time_start", False).first())
        relative_orbit = latest_post.get("relativeOrbitNumber_start").getInfo()
        orbit_pass = latest_post.get("orbitProperties_pass").getInfo()
        same_orbit = (
            collection
            .filter(ee.Filter.eq("relativeOrbitNumber_start", relative_orbit))
            .filter(ee.Filter.eq("orbitProperties_pass", orbit_pass))
        )
        pre_same = same_orbit.filterDate(str(pre_start), str(pre_end))
        post_same = same_orbit.filterDate(str(post_start), str(post_end))
        same_pre_count = int(pre_same.size().getInfo())
        same_post_count = int(post_same.size().getInfo())
        warnings: list[str] = []
        if same_pre_count > 0 and same_post_count > 0:
            pre_collection, post_collection = pre_same, post_same
            pre_count, post_count = same_pre_count, same_post_count
        else:
            warnings.append(
                "No matching relative-orbit pair across both windows; used filtered multi-orbit composites."
            )

        def mask_edges(image):
            band = image.select(request.polarization)
            return image.updateMask(band.gt(-30.0))

        pre = pre_collection.map(mask_edges).select(request.polarization).median().clip(aoi)
        post = post_collection.map(mask_edges).select(request.polarization).median().clip(aoi)
        change = pre.subtract(post).rename("backscatter_drop_db")

        hist_info = change.reduceRegion(
            reducer=ee.Reducer.histogram(maxBuckets=128, minBucketWidth=0.1),
            geometry=aoi,
            scale=30,
            bestEffort=True,
            maxPixels=20_000_000,
        ).get("backscatter_drop_db").getInfo()
        if not hist_info:
            raise ValueError("No valid Sentinel-1 pixels were available for change histogram")
        threshold = otsu_threshold(hist_info.get("bucketMeans", []), hist_info.get("histogram", []))

        # Positive pre-post change indicates a backscatter drop. The post-event
        # backscatter filter makes this specifically a surface-water expansion detector;
        # it is not a complete detector of all inundated vegetation/urban flooding.
        candidate = change.gt(threshold).And(post.lt(request.post_water_threshold_db))
        if request.exclude_permanent_water:
            permanent = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").gte(90)
            candidate = candidate.And(permanent.Not())

        candidate = candidate.rename("new_surface_water").selfMask()
        connected = candidate.connectedPixelCount(maxSize=100, eightConnected=True)
        candidate = candidate.updateMask(connected.gte(4))

        area_m2 = ee.Image.pixelArea().updateMask(candidate).reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=aoi,
            scale=30,
            bestEffort=True,
            maxPixels=20_000_000,
        ).get("area").getInfo() or 0.0

        stats = ee.Image.cat(
            pre.rename("pre_db"), post.rename("post_db"), change.rename("drop_db")
        ).reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=aoi,
            scale=30,
            bestEffort=True,
            maxPixels=20_000_000,
        ).getInfo()

        vectors = candidate.toByte().reduceToVectors(
            geometry=aoi,
            scale=30,
            geometryType="polygon",
            eightConnected=True,
            labelProperty="class",
            reducer=ee.Reducer.countEvery(),
            bestEffort=True,
            maxPixels=20_000_000,
        )
        vectors = vectors.map(lambda f: f.set("area_m2", f.geometry().area(maxError=10)))
        vectors = (
            vectors
            .filter(ee.Filter.gte("area_m2", request.min_patch_area_m2))
            .sort("area_m2", False)
            .limit(200)
        )
        geojson = vectors.getInfo()

        # Temporary Earth Engine map tiles: useful for visual inspection, not a durable data export.
        pre_map = pre.getMapId({"min": -25, "max": 0, "palette": ["111827", "64748b", "f8fafc"]})
        post_map = post.getMapId({"min": -25, "max": 0, "palette": ["111827", "64748b", "f8fafc"]})
        flood_map = candidate.getMapId({"palette": ["00b8ff"]})

        acquisition = {
            "pre": self._collection_dates(pre_collection),
            "post": self._collection_dates(post_collection),
        }
        analysis_id = f"sar_{uuid.uuid4().hex[:16]}"
        result = {
            "analysis_id": analysis_id,
            "status": "COMPLETED",
            "provider": "Google Earth Engine",
            "dataset": self.DATASET,
            "sensor": "Sentinel-1 C-SAR GRD",
            "aoi": {"bbox": request.bbox, "area_km2_approx": round(_bbox_area_km2(request.bbox), 3)},
            "request": request.model_dump(mode="json"),
            "acquisition": {
                "relative_orbit": relative_orbit,
                "orbit_pass": orbit_pass,
                "pre_scene_count": pre_count,
                "post_scene_count": post_count,
                **acquisition,
            },
            "method": {
                "change": "median(pre_window_dB) - median(post_window_dB)",
                "threshold": "Otsu on bitemporal backscatter-drop histogram",
                "otsu_threshold_db_drop": round(float(threshold), 4),
                "post_water_threshold_db": request.post_water_threshold_db,
                "permanent_water_excluded": request.exclude_permanent_water,
                "permanent_water_dataset": (
                    "JRC/GSW1_4/GlobalSurfaceWater" if request.exclude_permanent_water else None
                ),
                "minimum_connected_pixels": 4,
                "minimum_vector_patch_area_m2": request.min_patch_area_m2,
            },
            "metrics": {
                "new_surface_water_area_m2": round(float(area_m2), 2),
                "new_surface_water_area_ha": round(float(area_m2) / 10_000.0, 3),
                "new_surface_water_area_km2": round(float(area_m2) / 1_000_000.0, 5),
                "mean_pre_backscatter_db": self._finite(stats.get("pre_db")),
                "mean_post_backscatter_db": self._finite(stats.get("post_db")),
                "mean_backscatter_drop_db": self._finite(stats.get("drop_db")),
                "polygon_count": len(geojson.get("features", [])),
            },
            "flood_extent_geojson": geojson,
            "visualization": {
                "pre_tile_url": pre_map["tile_fetcher"].url_format,
                "post_tile_url": post_map["tile_fetcher"].url_format,
                "change_tile_url": flood_map["tile_fetcher"].url_format,
                "ephemeral": True,
            },
            "provenance": {
                "observation": "OBSERVED / SENTINEL-1 GRD VIA GOOGLE EARTH ENGINE",
                "change_extent": "DERIVED",
                "validation": "NOT AUTOMATICALLY A MODEL VALIDATION PRODUCT",
            },
            "limitations": [
                "Detects strong new surface-water/backscatter-drop signatures; "
                "flooded vegetation and urban inundation may be missed.",
                "SAR layover/shadow and acquisition geometry can create false change in steep mountain terrain.",
                "Earth Engine Sentinel-1 GRD is preprocessed; "
                "this workflow performs bitemporal change analysis rather than raw-SAR calibration.",
            ],
            "warnings": warnings,
        }
        self._persist(result)
        return result

    def _collection_dates(self, collection) -> list[str]:
        millis = collection.aggregate_array("system:time_start").getInfo() or []
        dates = []
        for value in millis[:30]:
            try:
                dates.append(
                    datetime.fromtimestamp(float(value) / 1000.0, tz=timezone.utc).isoformat().replace("+00:00", "Z")
                )
            except (TypeError, ValueError, OverflowError):
                continue
        return dates

    @staticmethod
    def _finite(value: Any) -> Optional[float]:
        try:
            value = float(value)
            return round(value, 4) if math.isfinite(value) else None
        except (TypeError, ValueError):
            return None

    def _persist(self, payload: dict[str, Any]) -> None:
        path = self.storage_dir / f"{payload['analysis_id']}.json"
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    @staticmethod
    def _summary(payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "analysis_id": payload.get("analysis_id"),
            "status": payload.get("status"),
            "dataset": payload.get("dataset"),
            "aoi": payload.get("aoi"),
            "acquisition": payload.get("acquisition"),
            "metrics": payload.get("metrics"),
            "provenance": payload.get("provenance"),
        }
