import csv
import json
import os
import shapefile
import simplekml
import tempfile
import zipfile
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

router = APIRouter()


def get_data_dir() -> str:
    """Return configured or auto-detected simulation data directory."""
    env_dir = os.environ.get("DATA_DIR")
    if env_dir:
        return env_dir
    if os.path.exists("/data/processed/tehri_simulations"):
        return "/data/processed/tehri_simulations"
    for candidate in [
        "data/processed/tehri_simulations",
        "../data/processed/tehri_simulations",
        "../../data/processed/tehri_simulations",
    ]:
        if os.path.exists(candidate):
            return os.path.abspath(candidate)
    return "/data/processed/tehri_simulations"


PRODUCTS_MAP: Dict[str, Dict[str, Any]] = {
    "inundation_extent": {
        "formats": ["geojson", "shp", "kml"],
        "rel_path": "lisflood_fp/outputs/v3_geometry_corrected/rasters/inundation_extent_v3.geojson",
        "type": "vector",
    },
    "exposed_roads": {
        "formats": ["geojson", "shp", "kml"],
        "rel_path": "exposure/v3/roads/exposed_roads.geojson",
        "type": "vector",
    },
    "exposed_settlements": {
        "formats": ["geojson", "shp", "kml"],
        "rel_path": "exposure/v3/settlements/exposed_settlements.geojson",
        "type": "vector",
    },
    "exposed_healthcare": {
        "formats": ["geojson", "shp", "kml"],
        "rel_path": "exposure/v3/healthcare/exposed_healthcare.geojson",
        "type": "vector",
    },
    "exposed_bridges": {
        "formats": ["geojson", "shp", "kml"],
        "rel_path": "exposure/v3/bridges/exposed_bridges.geojson",
        "type": "vector",
    },
    "exposed_power": {
        "formats": ["geojson", "shp", "kml"],
        "rel_path": "exposure/v3/power/exposed_power.geojson",
        "type": "vector",
    },
    "normal_route": {
        "formats": ["geojson", "shp", "kml"],
        "rel_path": "hadr/v3/routes/normal_route.geojson",
        "type": "vector",
    },
    "hazard_aware_route": {
        "formats": ["geojson", "shp", "kml"],
        "rel_path": "hadr/v3/routes/hazard_aware_route.geojson",
        "type": "vector",
    },
    "max_depth": {
        "formats": ["geotiff"],
        "rel_path": "lisflood_fp/outputs/v3_geometry_corrected/rasters/max_depth_v3.tif",
        "type": "raster",
    },
    "arrival_time": {
        "formats": ["geotiff"],
        "rel_path": "lisflood_fp/outputs/v3_geometry_corrected/rasters/arrival_time_v3.tif",
        "type": "raster",
    },
    "exposure_summary": {
        "formats": ["csv"],
        "rel_path": "exposure/v3/summary/hazard_exposure_summary.json",
        "type": "tabular_json",
    },
}


def get_product_meta(product: str) -> Optional[Dict[str, Any]]:
    """Get metadata for product with resolved full path."""
    if product not in PRODUCTS_MAP:
        return None
    meta = dict(PRODUCTS_MAP[product])
    base = get_data_dir()
    rel = meta.get("rel_path")
    meta["path"] = os.path.join(base, rel) if rel else meta.get("path", "")
    return meta


def geojson_to_kml(geojson_path: str, output_path: str):
    with open(geojson_path, "r") as f:
        data = json.load(f)

    kml = simplekml.Kml()
    features = data.get("features", [])

    for feat in features:
        geom = feat.get("geometry", {})
        props = feat.get("properties", {})
        gtype = geom.get("type")
        coords = geom.get("coordinates")
        name = props.get("name", props.get("Name", "Feature"))

        if not coords:
            continue

        desc = "\n".join([f"{k}: {v}" for k, v in props.items()])

        if gtype == "Point":
            kml.newpoint(name=name, coords=[(coords[0], coords[1])], description=desc)
        elif gtype == "LineString":
            kml.newlinestring(name=name, coords=coords, description=desc)
        elif gtype == "Polygon":
            pol = kml.newpolygon(name=name, description=desc)
            if len(coords) > 0:
                pol.outerboundaryis = coords[0]
                if len(coords) > 1:
                    pol.innerboundaryis = coords[1:]
        elif gtype == "MultiPolygon":
            for poly_coords in coords:
                pol = kml.newpolygon(name=name, description=desc)
                if len(poly_coords) > 0:
                    pol.outerboundaryis = poly_coords[0]
                    if len(poly_coords) > 1:
                        pol.innerboundaryis = poly_coords[1:]
    kml.save(output_path)


def geojson_to_shp_zip(geojson_path: str, output_path: str, product_name: str):
    with open(geojson_path, "r") as f:
        data = json.load(f)

    features = data.get("features", [])
    if not features:
        with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("manifest.json", json.dumps({"status": "empty"}))
        return

    geom_types = set(f.get("geometry", {}).get("type") for f in features if f.get("geometry"))
    if "MultiPolygon" in geom_types or "Polygon" in geom_types:
        shp_type = shapefile.POLYGON
    elif "LineString" in geom_types or "MultiLineString" in geom_types:
        shp_type = shapefile.POLYLINE
    else:
        shp_type = shapefile.POINT

    temp_dir = tempfile.mkdtemp()
    base_shp = os.path.join(temp_dir, f"{product_name}")

    with shapefile.Writer(base_shp, shapeType=shp_type) as w:
        props = set()
        for f in features:
            props.update(f.get("properties", {}).keys())
        for p in props:
            w.field(str(p)[:10], "C", "255")

        for f in features:
            geom = f.get("geometry")
            if not geom:
                continue

            record_dict = f.get("properties", {})
            record_vals = [str(record_dict.get(p, "")) for p in props]
            w.record(*record_vals)

            coords = geom.get("coordinates")
            gtype = geom.get("type")
            if shp_type == shapefile.POLYGON:
                if gtype == "Polygon":
                    w.poly(coords)
                elif gtype == "MultiPolygon":
                    for poly in coords:
                        w.poly(poly)
            elif shp_type == shapefile.POLYLINE:
                if gtype == "LineString":
                    w.line([coords])
                elif gtype == "MultiLineString":
                    w.line(coords)
            elif shp_type == shapefile.POINT:
                w.point(coords[0], coords[1])

    with open(base_shp + ".prj", "w") as prj:
        prj.write(
            'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],'
            'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
        )

    with open(os.path.join(temp_dir, "manifest.json"), "w") as mf:
        json.dump(
            {
                "product": product_name,
                "format": "shapefile",
                "provenance": "MODELLED",
                "solver": "LISFLOOD-FP 8.1 / FloodLab",
            },
            mf,
            indent=2,
        )

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for ext in [".shp", ".shx", ".dbf", ".prj"]:
            if os.path.exists(base_shp + ext):
                zf.write(base_shp + ext, f"{product_name}{ext}")
        zf.write(os.path.join(temp_dir, "manifest.json"), "manifest.json")


def json_to_csv(json_path: str, output_path: str):
    with open(json_path, "r") as f:
        data = json.load(f)

    rows = []
    if isinstance(data, dict):
        if "summary" in data:
            for k, v in data["summary"].items():
                if isinstance(v, dict):
                    for sub_k, sub_v in v.items():
                        rows.append({"Category": k, "Metric": sub_k, "Value": sub_v})
                else:
                    rows.append({"Category": "General", "Metric": k, "Value": v})
        else:
            for k, v in data.items():
                rows.append({"Key": k, "Value": str(v)})
    elif isinstance(data, list):
        rows = data

    if not rows:
        with open(output_path, "w") as f:
            f.write("No data\n")
        return

    keys = set()
    for r in rows:
        keys.update(r.keys())

    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(keys))
        writer.writeheader()
        writer.writerows(rows)


@router.get("")
async def list_available_exports(run_id: str):
    available = {}
    base = get_data_dir()
    if run_id == "v4_extended":
        import glob

        frames = glob.glob(
            f"{base}/lisflood_fp/outputs/v4_extended/outputs/temporal_depth/geotiffs/*.tif"
        )
        if frames:
            for f in frames:
                name = os.path.basename(f).replace(".tif", "")
                available[name] = ["geotiff"]
        v4_raster = f"{base}/lisflood_fp/outputs/v4_extended/outputs/rasters"
        v4_vector = f"{base}/lisflood_fp/outputs/v4_extended/outputs/vectors"
        v4_exp = f"{base}/exposure/v4"
        v4_hadr = f"{base}/hadr/v4"
        v4_checks = [
            ("max_depth", f"{v4_raster}/max_depth_v4_corrected.tif", ["geotiff"]),
            ("arrival_time", f"{v4_raster}/arrival_time_v4_corrected.tif", ["geotiff"]),
            ("inundation_extent", f"{v4_vector}/inundation_extent_v4_corrected.geojson", ["geojson", "kml", "shp"]),
            ("exposed_roads", f"{v4_exp}/roads/exposed_roads.geojson", ["geojson", "kml", "shp"]),
            ("exposed_settlements", f"{v4_exp}/settlements/exposed_settlements.geojson", ["geojson", "kml", "shp"]),
            ("exposed_healthcare", f"{v4_exp}/healthcare/exposed_healthcare.geojson", ["geojson", "kml", "shp"]),
            ("exposed_bridges", f"{v4_exp}/bridges/exposed_bridges.geojson", ["geojson", "kml", "shp"]),
            ("exposed_power", f"{v4_exp}/power/exposed_power.geojson", ["geojson", "kml", "shp"]),
            ("exposure_summary", f"{v4_exp}/summary/hazard_exposure_summary.json", ["csv"]),
            ("normal_route", f"{v4_hadr}/routes/normal_route.geojson", ["geojson", "kml", "shp"]),
            ("hazard_aware_route", f"{v4_hadr}/routes/hazard_aware_route.geojson", ["geojson", "kml", "shp"]),
        ]
        for prod_name, file_path, formats in v4_checks:
            if os.path.exists(file_path):
                available[prod_name] = formats
    else:
        for prod in PRODUCTS_MAP:
            meta = get_product_meta(prod)
            if meta and os.path.exists(meta["path"]):
                available[prod] = meta["formats"]
    return available


@router.get("/{product}")
async def get_export(run_id: str, product: str, format: str = Query("geojson")):
    if ".." in run_id or "/" in run_id or ".." in product or "/" in product:
        raise HTTPException(400, "Invalid path parameters")

    base = get_data_dir()
    source_path = None
    supported_formats = []

    if run_id == "v4_extended":
        v4_catalog = {
            "max_depth": (
                f"{base}/lisflood_fp/outputs/v4_extended/outputs/rasters/max_depth_v4_corrected.tif",
                ["geotiff"],
            ),
            "arrival_time": (
                f"{base}/lisflood_fp/outputs/v4_extended/outputs/rasters/arrival_time_v4_corrected.tif",
                ["geotiff"],
            ),
            "inundation_extent": (
                f"{base}/lisflood_fp/outputs/v4_extended/outputs/vectors/inundation_extent_v4_corrected.geojson",
                ["geojson", "kml", "shp"],
            ),
            "exposed_roads": (
                f"{base}/exposure/v4/roads/exposed_roads.geojson",
                ["geojson", "kml", "shp"],
            ),
            "exposed_settlements": (
                f"{base}/exposure/v4/settlements/exposed_settlements.geojson",
                ["geojson", "kml", "shp"],
            ),
            "exposed_healthcare": (
                f"{base}/exposure/v4/healthcare/exposed_healthcare.geojson",
                ["geojson", "kml", "shp"],
            ),
            "exposed_bridges": (
                f"{base}/exposure/v4/bridges/exposed_bridges.geojson",
                ["geojson", "kml", "shp"],
            ),
            "exposed_power": (
                f"{base}/exposure/v4/power/exposed_power.geojson",
                ["geojson", "kml", "shp"],
            ),
            "exposure_summary": (
                f"{base}/exposure/v4/summary/hazard_exposure_summary.json",
                ["csv"],
            ),
            "normal_route": (
                f"{base}/hadr/v4/routes/normal_route.geojson",
                ["geojson", "kml", "shp"],
            ),
            "hazard_aware_route": (
                f"{base}/hadr/v4/routes/hazard_aware_route.geojson",
                ["geojson", "kml", "shp"],
            ),
        }
        if product.startswith("depth_"):
            source_path = (
                f"{base}/lisflood_fp/outputs/v4_extended/outputs/temporal_depth/geotiffs/{product}.tif"
            )
            supported_formats = ["geotiff"]
        elif product in v4_catalog:
            source_path, supported_formats = v4_catalog[product]
        else:
            raise HTTPException(404, "PRODUCT_NOT_AVAILABLE")
    else:
        meta = get_product_meta(product)
        if not meta:
            raise HTTPException(404, "PRODUCT_NOT_AVAILABLE")
        supported_formats = meta["formats"]
        source_path = meta["path"]

    if format not in supported_formats:
        raise HTTPException(400, "FORMAT_NOT_SUPPORTED")

    if not source_path or not os.path.exists(source_path):
        raise HTTPException(404, "PRODUCT_NOT_AVAILABLE")

    if format == "geojson" and source_path.endswith(".geojson"):
        return FileResponse(source_path, media_type="application/geo+json", filename=f"{run_id}_{product}.geojson")
    elif format == "geotiff" and source_path.endswith(".tif"):
        return FileResponse(source_path, media_type="image/tiff", filename=f"{run_id}_{product}.tif")
    elif format == "kml" and source_path.endswith(".geojson"):
        tmp_kml = tempfile.mktemp(suffix=".kml")
        geojson_to_kml(source_path, tmp_kml)
        return FileResponse(
            tmp_kml,
            media_type="application/vnd.google-earth.kml+xml",
            filename=f"{run_id}_{product}.kml",
        )
    elif format == "shp" and source_path.endswith(".geojson"):
        tmp_zip = tempfile.mktemp(suffix=".zip")
        geojson_to_shp_zip(source_path, tmp_zip, product)
        return FileResponse(
            tmp_zip,
            media_type="application/zip",
            filename=f"{run_id}_{product}_shapefile.zip",
        )
    elif format == "csv":
        tmp_csv = tempfile.mktemp(suffix=".csv")
        json_to_csv(source_path, tmp_csv)
        return FileResponse(tmp_csv, media_type="text/csv", filename=f"{run_id}_{product}.csv")

    raise HTTPException(400, "Export generation failed")
