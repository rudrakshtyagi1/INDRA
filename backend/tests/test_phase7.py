from __future__ import annotations

import asyncio
import json

import pytest
from fastapi import HTTPException

from floodlab.schemas.satellite import SARAnalysisRequest
from floodlab.satellite.observation_comparator import compare_geojson_extents
from floodlab.satellite.sentinel1 import otsu_threshold
from floodlab.api.routers import satellite as router_module


def test_otsu_threshold_separates_bimodal_histogram():
    means = [-8, -7, -6, -5, -4, 1, 2, 3, 4, 5]
    counts = [2, 10, 30, 12, 2, 2, 14, 36, 12, 2]
    threshold = otsu_threshold(means, counts)
    assert -4 <= threshold <= 2


def test_satellite_request_rejects_invalid_bbox():
    with pytest.raises(ValueError):
        SARAnalysisRequest(
            bbox=[79.0, 30.0, 78.0, 31.0],
            pre_date="2026-08-01",
            post_date="2026-08-20",
        )


def test_satellite_request_rejects_reversed_dates():
    with pytest.raises(ValueError):
        SARAnalysisRequest(
            bbox=[78.3, 30.25, 78.85, 30.7],
            pre_date="2026-08-20",
            post_date="2026-08-01",
        )


def test_satellite_status_never_contains_secrets():
    payload = asyncio.run(router_module.status())
    text = json.dumps(payload).lower()
    for forbidden in ["client_secret", "bearer", "authorization", "private_key"]:
        assert forbidden not in text
    assert payload["synthetic_observations"] is False


def test_satellite_zones_are_context_not_fake_alerts():
    payload = asyncio.run(router_module.zones())
    zones = payload["zones"]
    assert any(z["id"] == "tehri_upstream" for z in zones)
    assert all("detected_lake" not in z for z in zones)


def test_analysis_returns_truthful_503_when_gee_not_configured(monkeypatch):
    class StubService:
        def status(self):
            return {"google_earth_engine": {"configured": False, "authenticated": False, "error": None}}

    monkeypatch.setattr(router_module, "_service", lambda: StubService())
    request = SARAnalysisRequest(
        bbox=[78.3, 30.25, 78.85, 30.7],
        pre_date="2026-08-01",
        post_date="2026-08-20",
        polarization="VV",
    )
    with pytest.raises(HTTPException) as exc:
        asyncio.run(router_module.analyse(request))
    assert exc.value.status_code == 503
    assert exc.value.detail == "GEE_PROJECT_NOT_CONFIGURED"


def test_geojson_comparison_iou():
    sat = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[78.4, 30.3], [78.5, 30.3], [78.5, 30.4], [78.4, 30.4], [78.4, 30.3]]]
            }
        }],
    }
    model = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[78.45, 30.35], [78.55, 30.35], [78.55, 30.45], [78.45, 30.45], [78.45, 30.35]]]
            }
        }],
    }
    metrics = compare_geojson_extents(sat, model)
    assert 0 < metrics["iou"] < 1
    assert metrics["intersection_km2"] > 0


def test_phase7_routes_registered_on_router():
    paths = {route.path for route in router_module.router.routes}
    assert "/status" in paths
    assert "/analyse" in paths
    assert "/compare-model" in paths
    assert "/model-products" in paths
