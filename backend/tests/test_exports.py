import io
import json
import os
import zipfile
import pytest
from fastapi.testclient import TestClient
from floodlab.api.main import app

client = TestClient(app)

# Minimal 1x1 8-bit uncompressed grayscale TIFF (63 bytes)
MINIMAL_TIFF_BYTES = (
    b"II*\x00\x08\x00\x00\x00"
    b"\x04\x00"
    b"\x00\x01\x03\x00\x01\x00\x00\x00\x01\x00\x00\x00"
    b"\x01\x01\x03\x00\x01\x00\x00\x00\x01\x00\x00\x00"
    b"\x11\x01\x04\x00\x01\x00\x00\x00\x3e\x00\x00\x00"
    b"\x17\x01\x04\x00\x01\x00\x00\x00\x01\x00\x00\x00"
    b"\x00\x00\x00\x00"
    b"\x80"
)

TINY_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [[78.48, 30.38], [78.49, 30.38], [78.49, 30.39], [78.48, 30.39], [78.48, 30.38]]
                ],
            },
            "properties": {"name": "Test Flood Zone", "max_depth_m": 3.2},
        }
    ],
}

TINY_EXPOSURE_SUMMARY = {
    "summary": {
        "roads": {"exposed_km": 38.788, "segments": 52},
        "settlements": {"exposed": 0},
    }
}


@pytest.fixture(autouse=True)
def setup_export_fixtures(tmp_path, monkeypatch):
    """Create deterministic tiny test fixtures during pytest execution."""
    data_dir = tmp_path / "data"
    raster_dir = data_dir / "lisflood_fp" / "outputs" / "v3_geometry_corrected" / "rasters"
    exposure_dir = data_dir / "exposure" / "v3" / "summary"

    raster_dir.mkdir(parents=True, exist_ok=True)
    exposure_dir.mkdir(parents=True, exist_ok=True)

    # 1. Tiny GeoJSON
    with open(raster_dir / "inundation_extent_v3.geojson", "w") as f:
        json.dump(TINY_GEOJSON, f)

    # 2. Tiny GeoTIFF
    with open(raster_dir / "max_depth_v3.tif", "wb") as f:
        f.write(MINIMAL_TIFF_BYTES)

    with open(raster_dir / "arrival_time_v3.tif", "wb") as f:
        f.write(MINIMAL_TIFF_BYTES)

    # 3. Tiny Exposure Summary JSON
    with open(exposure_dir / "hazard_exposure_summary.json", "w") as f:
        json.dump(TINY_EXPOSURE_SUMMARY, f)

    monkeypatch.setenv("DATA_DIR", str(data_dir))
    return data_dir


def test_available_exports():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports")
    assert res.status_code == 200
    data = res.json()
    assert "inundation_extent" in data
    assert "max_depth" in data
    assert "exposure_summary" in data


def test_geojson_export():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/inundation_extent?format=geojson")
    assert res.status_code == 200
    assert "application/geo+json" in res.headers["content-type"]
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 1


def test_kml_export():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/inundation_extent?format=kml")
    assert res.status_code == 200
    assert "application/vnd.google-earth.kml+xml" in res.headers["content-type"]
    assert b"<kml" in res.content


def test_shapefile_export():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/inundation_extent?format=shp")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"

    with zipfile.ZipFile(io.BytesIO(res.content)) as z:
        files = z.namelist()
        assert "inundation_extent.shp" in files
        assert "inundation_extent.dbf" in files
        assert "inundation_extent.shx" in files
        assert "inundation_extent.prj" in files
        assert "manifest.json" in files


def test_geotiff_export():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/max_depth?format=geotiff")
    assert res.status_code == 200
    assert "image/tiff" in res.headers["content-type"]
    assert len(res.content) == len(MINIMAL_TIFF_BYTES)


def test_csv_export():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/exposure_summary?format=csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert b"Category" in res.content or b"Key" in res.content


def test_unsupported_format():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/max_depth?format=shp")
    assert res.status_code == 400
    assert res.json()["detail"] == "FORMAT_NOT_SUPPORTED"


def test_unavailable_product():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/fake_product?format=geojson")
    assert res.status_code == 404
    assert res.json()["detail"] == "PRODUCT_NOT_AVAILABLE"


def test_path_traversal():
    res = client.get("/api/runs/run..1/exports/inundation_extent?format=geojson")
    assert res.status_code == 400
    assert "Invalid path" in res.json()["detail"]

    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/prod..1?format=geojson")
    assert res.status_code == 400
    assert "Invalid path" in res.json()["detail"]
