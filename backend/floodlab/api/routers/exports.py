import os
import json
import uuid
import zipfile
import tempfile
import shapefile
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
import simplekml
from floodlab.schemas.control import RunStatus
from floodlab.api.routers.scenarios import RUNS_DB, SCENARIOS_DB

router = APIRouter()

# Register Tehri V3 if needed (since it uses dynamic modules, we ensure it's loaded)
# But it's already in SCENARIOS_DB from scenarios.py

V3_BASE = os.environ.get("DATA_DIR", "/data/processed/tehri_simulations")

PRODUCTS_MAP = {
    "inundation_extent": {
        "formats": ["geojson", "shp", "kml"],
        "path": f"{V3_BASE}/lisflood_fp/outputs/v3_geometry_corrected/rasters/inundation_extent_v3.geojson",
        "type": "vector"
    },
    "exposed_roads": {
        "formats": ["geojson", "shp", "kml"],
        "path": f"{V3_BASE}/exposure/v3/roads/exposed_roads.geojson",
        "type": "vector"
    },
    "exposed_settlements": {
        "formats": ["geojson", "shp", "kml"],
        "path": f"{V3_BASE}/exposure/v3/settlements/exposed_settlements.geojson",
        "type": "vector"
    },
    "exposed_healthcare": {
        "formats": ["geojson", "shp", "kml"],
        "path": f"{V3_BASE}/exposure/v3/healthcare/exposed_healthcare.geojson",
        "type": "vector"
    },
    "exposed_bridges": {
        "formats": ["geojson", "shp", "kml"],
        "path": f"{V3_BASE}/exposure/v3/bridges/exposed_bridges.geojson",
        "type": "vector"
    },
    "exposed_power": {
        "formats": ["geojson", "shp", "kml"],
        "path": f"{V3_BASE}/exposure/v3/power/exposed_power.geojson",
        "type": "vector"
    },
    "normal_route": {
        "formats": ["geojson", "shp", "kml"],
        "path": f"{V3_BASE}/hadr/v3/routes/normal_route.geojson",
        "type": "vector"
    },
    "hazard_aware_route": {
        "formats": ["geojson", "shp", "kml"],
        "path": f"{V3_BASE}/hadr/v3/routes/hazard_aware_route.geojson",
        "type": "vector"
    },
    "max_depth": {
        "formats": ["geotiff"],
        "path": f"{V3_BASE}/lisflood_fp/outputs/v3_geometry_corrected/rasters/max_depth_v3.tif",
        "type": "raster"
    },
    "arrival_time": {
        "formats": ["geotiff"],
        "path": f"{V3_BASE}/lisflood_fp/outputs/v3_geometry_corrected/rasters/arrival_time_v3.tif",
        "type": "raster"
    },
    "exposure_summary": {
        "formats": ["csv"],
        "path": f"{V3_BASE}/exposure/v3/summary/hazard_exposure_summary.json",
        "type": "tabular_json"
    }
}

def geojson_to_kml(geojson_path, output_path):
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

def geojson_to_shp_zip(geojson_path, output_path, product_name):
    with open(geojson_path, "r") as f:
        data = json.load(f)
        
    features = data.get("features", [])
    if not features:
        # Empty shapefile handling logic
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("manifest.json", json.dumps({"status": "empty"}))
        return

    # Determine dominant geometry type
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
        # Create fields
        props = set()
        for f in features:
            props.update(f.get("properties", {}).keys())
        for p in props:
            # Type detection could be added, fallback to char
            w.field(str(p)[:10], 'C', '255')
            
        for f in features:
            geom = f.get("geometry")
            if not geom: continue
            
            # Record
            record_dict = f.get("properties", {})
            record_vals = [str(record_dict.get(p, "")) for p in props]
            w.record(*record_vals)
            
            # Shape
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
                
    # Add prj file (EPSG:4326)
    with open(base_shp + ".prj", "w") as prj:
        prj.write('GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]')
        
    # Write manifest
    with open(os.path.join(temp_dir, "manifest.json"), "w") as mf:
        json.dump({
            "product": product_name,
            "format": "shapefile",
            "provenance": "MODELLED",
            "solver": "LISFLOOD-FP 8.1 / FloodLab"
        }, mf, indent=2)

    # Zip it up
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for ext in [".shp", ".shx", ".dbf", ".prj"]:
            if os.path.exists(base_shp + ext):
                zf.write(base_shp + ext, f"{product_name}{ext}")
        zf.write(os.path.join(temp_dir, "manifest.json"), "manifest.json")


def json_to_csv(json_path, output_path):
    import csv
    with open(json_path, "r") as f:
        data = json.load(f)
    
    # Flatten exposure summary
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
    if run_id == "v4_extended":
        import glob
        frames = glob.glob("/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/temporal_depth/geotiffs/*.tif")
        if frames:
            for f in frames:
                name = f.split('/')[-1].replace('.tif', '')
                available[name] = ["geotiff"]
        if os.path.exists("/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/rasters/max_depth_v4_corrected.tif"):
            available["max_depth"] = ["geotiff"]
        if os.path.exists("/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/rasters/arrival_time_v4_corrected.tif"):
            available["arrival_time"] = ["geotiff"]
        if os.path.exists("/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/vectors/inundation_extent_v4_corrected.geojson"):
            available["inundation_extent"] = ["geojson", "kml", "shp"]
    else:
        for prod, meta in PRODUCTS_MAP.items():
            if os.path.exists(meta["path"]):
                available[prod] = meta["formats"]
    return available

@router.get("/{product}")
async def get_export(run_id: str, product: str, format: str = Query("geojson")):
    if ".." in run_id or "/" in run_id or ".." in product or "/" in product:
        raise HTTPException(400, "Invalid path parameters")
        
    source_path = None
    if run_id == "v4_extended":
        if product.startswith("depth_"):
            source_path = f"/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/temporal_depth/geotiffs/{product}.tif"
        elif product == "max_depth":
            source_path = "/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/rasters/max_depth_v4_corrected.tif"
        elif product == "arrival_time":
            source_path = "/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/rasters/arrival_time_v4_corrected.tif"
        elif product == "inundation_extent":
            source_path = "/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/vectors/inundation_extent_v4_corrected.geojson"
        elif product == "exposed_roads":
            source_path = "/data/processed/tehri_simulations/exposure/v4/roads/exposed_roads.geojson"
        elif product == "exposed_settlements":
            source_path = "/data/processed/tehri_simulations/exposure/v4/settlements/exposed_settlements.geojson"
        elif product == "exposed_healthcare":
            source_path = "/data/processed/tehri_simulations/exposure/v4/healthcare/exposed_healthcare.geojson"
        elif product == "exposed_bridges":
            source_path = "/data/processed/tehri_simulations/exposure/v4/bridges/exposed_bridges.geojson"
        elif product == "exposed_power":
            source_path = "/data/processed/tehri_simulations/exposure/v4/power/exposed_power.geojson"
        elif product == "exposure_summary":
            source_path = "/data/processed/tehri_simulations/exposure/v4/summary/hazard_exposure_summary.json"
        elif product == "normal_route":
            source_path = "/data/processed/tehri_simulations/hadr/v4/routes/normal_route.geojson"
        elif product == "hazard_aware_route":
            source_path = "/data/processed/tehri_simulations/hadr/v4/routes/hazard_aware_route.geojson"
    else:
        if product in PRODUCTS_MAP:
            meta = PRODUCTS_MAP[product]
            if format in meta["formats"]:
                source_path = meta["path"]
                
    if not source_path or not os.path.exists(source_path):
        raise HTTPException(404, "PRODUCT_NOT_AVAILABLE")
        
    if format == "geojson" and source_path.endswith('.geojson'):
        return FileResponse(source_path, media_type="application/geo+json", filename=f"{run_id}_{product}.geojson")
    elif format == "geotiff" and source_path.endswith('.tif'):
        return FileResponse(source_path, media_type="image/tiff", filename=f"{run_id}_{product}.tif")
    elif format == "kml" and source_path.endswith('.geojson'):
        tmp_kml = tempfile.mktemp(suffix=".kml")
        geojson_to_kml(source_path, tmp_kml)
        return FileResponse(tmp_kml, media_type="application/vnd.google-earth.kml+xml", filename=f"{run_id}_{product}.kml")
    elif format == "shp" and source_path.endswith('.geojson'):
        tmp_zip = tempfile.mktemp(suffix=".zip")
        geojson_to_shp_zip(source_path, tmp_zip, product)
        return FileResponse(tmp_zip, media_type="application/zip", filename=f"{run_id}_{product}_shapefile.zip")
    elif format == "csv":
        tmp_csv = tempfile.mktemp(suffix=".csv")
        json_to_csv(source_path, tmp_csv)
        return FileResponse(tmp_csv, media_type="text/csv", filename=f"{run_id}_{product}.csv")
        
    raise HTTPException(400, "Export generation failed")
