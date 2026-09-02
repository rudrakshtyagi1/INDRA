import re

with open("backend/floodlab/api/routers/exports.py", "r") as f:
    content = f.read()

# Replace the PRODUCTS_MAP part to support v4_extended dynamically
new_get_export = """
@router.get("")
async def list_available_exports(run_id: str):
    available = {}
    if run_id == "v4_extended":
        import glob
        frames = glob.glob("/tmp/v4_setup/outputs/temporal_depth/geotiffs/*.tif")
        if frames:
            for f in frames:
                name = f.split('/')[-1].replace('.tif', '')
                available[name] = ["geotiff"]
        if os.path.exists("/tmp/v4_setup/rasters/max_depth_v4.tif"):
            available["max_depth"] = ["geotiff"]
        if os.path.exists("/tmp/v4_setup/rasters/arrival_time_v4.tif"):
            available["arrival_time"] = ["geotiff"]
        if os.path.exists("/tmp/v4_setup/vectors/inundation_extent_v4.geojson"):
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
            source_path = f"/tmp/v4_setup/outputs/temporal_depth/geotiffs/{product}.tif"
        elif product == "max_depth":
            source_path = "/tmp/v4_setup/rasters/max_depth_v4.tif"
        elif product == "arrival_time":
            source_path = "/tmp/v4_setup/rasters/arrival_time_v4.tif"
        elif product == "inundation_extent":
            source_path = "/tmp/v4_setup/vectors/inundation_extent_v4.geojson"
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
"""

# We'll replace the existing endpoints with the new ones.
# Find the first @router.get("") and replace till EOF.
import re
content = re.sub(r'@router\.get\(""\).*', new_get_export, content, flags=re.DOTALL)

with open("backend/floodlab/api/routers/exports.py", "w") as f:
    f.write(content)
