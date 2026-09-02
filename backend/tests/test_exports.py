import pytest
from fastapi.testclient import TestClient
from floodlab.api.main import app
import zipfile
import io

client = TestClient(app)

def test_available_exports():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports")
    assert res.status_code == 200
    data = res.json()
    assert "inundation_extent" in data
    assert "max_depth" in data

def test_geojson_export():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/inundation_extent?format=geojson")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/geo+json"
    data = res.json()
    assert data["type"] == "FeatureCollection"

def test_kml_export():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/inundation_extent?format=kml")
    assert res.status_code == 200
    assert "application/vnd.google-earth.kml+xml" in res.headers["content-type"]
    assert b"<kml" in res.content

def test_shapefile_export():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/inundation_extent?format=shp")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"
    
    # Read the zip and verify contents
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

def test_csv_export():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/exposure_summary?format=csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert b"Category" in res.content or b"Key" in res.content

def test_unsupported_format():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/max_depth?format=shp")
    assert res.status_code in [400, 404]
    assert "not supported" in res.json()["detail"]

def test_unavailable_product():
    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/fake_product?format=geojson")
    assert res.status_code == 404

def test_path_traversal():
    res = client.get("/api/runs/%2E%2E%2Fetc%2Fpasswd/exports/inundation_extent?format=geojson")
    assert res.status_code in [400, 404]
    if res.status_code == 400: assert "Invalid path" in res.json()["detail"]

    res = client.get("/api/runs/TEHRI_V3_BENCHMARK/exports/../inundation_extent?format=geojson")
    assert res.status_code in [400, 404]
    if res.status_code == 400: assert "Invalid path" in res.json()["detail"]
