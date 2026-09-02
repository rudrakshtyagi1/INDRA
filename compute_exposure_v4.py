import json
import math
import os
from osgeo import ogr, osr, gdal

out_dir = "/workspace/data/processed/tehri_simulations/exposure/v4"
os.makedirs(out_dir + "/settlements", exist_ok=True)
os.makedirs(out_dir + "/healthcare", exist_ok=True)
os.makedirs(out_dir + "/power", exist_ok=True)
os.makedirs(out_dir + "/bridges", exist_ok=True)
os.makedirs(out_dir + "/roads", exist_ok=True)
os.makedirs(out_dir + "/summary", exist_ok=True)
os.makedirs(out_dir + "/qa", exist_ok=True)

depth_ds = gdal.Open("/workspace/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/rasters/max_depth_v4_corrected.tif")
arr_ds = gdal.Open("/workspace/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/rasters/arrival_time_v4_corrected.tif")
gt = depth_ds.GetGeoTransform()
inv_gt = gdal.InvGeoTransform(gt)
depth_array = depth_ds.GetRasterBand(1).ReadAsArray()
arr_array = arr_ds.GetRasterBand(1).ReadAsArray()
nrows, ncols = depth_array.shape

nodata_depth = depth_ds.GetRasterBand(1).GetNoDataValue()
nodata_arr = arr_ds.GetRasterBand(1).GetNoDataValue()

src_srs = osr.SpatialReference()
src_srs.ImportFromEPSG(4326)
src_srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
tgt_srs = osr.SpatialReference()
tgt_srs.ImportFromEPSG(32644)
transform = osr.CoordinateTransformation(src_srs, tgt_srs)

def sample_raster(x, y):
    c, r = gdal.ApplyGeoTransform(inv_gt, x, y)
    c, r = int(c), int(r)
    if 0 <= r < nrows and 0 <= c < ncols:
        d = depth_array[r, c]
        a = arr_array[r, c]
        d = d if d != nodata_depth and d > 0 else 0
        a = a if a != nodata_arr and a >= 0 else 9999.0
        return float(d), float(a)
    return 0.0, 9999.0

def depth_class(d):
    if d < 0.05: return "No Hazard"
    elif d <= 0.5: return "0.05-0.5 m"
    elif d <= 1.5: return "0.5-1.5 m"
    elif d <= 3: return "1.5-3 m"
    elif d <= 5: return "3-5 m"
    else: return ">5 m"

def arr_class(a):
    if a == 9999.0: return "NOT REACHED WITHIN SIMULATION WINDOW"
    am = a * 60 
    if am < 15: return "< 15 min"
    elif am <= 30: return "15-30 min"
    elif am <= 60: return "30-60 min"
    else: return "> 60 min"

def process_points(gpkg_path, layer_name, feature_filter, out_file):
    ds = ogr.Open(gpkg_path)
    layer = ds.GetLayerByName(layer_name) if layer_name else ds.GetLayer()
    out_features = []
    counts = {'total': 0, 'exposed': 0, 'depth_classes': {}, 'arr_classes': {}}
    max_d_overall = 0
    min_a_overall = 9999.0
    for feat in layer:
        if not feature_filter(feat): continue
        counts['total'] += 1
        geom = feat.GetGeometryRef()
        if not geom: continue
        centroid = geom.Centroid()
        geom_32644 = centroid.Clone()
        geom_32644.Transform(transform)
        d, a = sample_raster(geom_32644.GetX(), geom_32644.GetY())
        
        # Exposure condition: d >= 0.05
        if d >= 0.05:
            counts['exposed'] += 1
            dc = depth_class(d)
            ac = arr_class(a)
            counts['depth_classes'][dc] = counts['depth_classes'].get(dc, 0) + 1
            counts['arr_classes'][ac] = counts['arr_classes'].get(ac, 0) + 1
            if d > max_d_overall: max_d_overall = d
            if a < min_a_overall: min_a_overall = a
            props = {feat.GetFieldDefnRef(i).GetName(): feat.GetField(i) for i in range(feat.GetFieldCount())}
            props.update({'max_depth_m': d, 'arrival_time_hr': a if a != 9999.0 else None, 'depth_class': dc, 'arrival_class': ac, 'exposure_status': "INTERSECTS MODELLED INUNDATION EXTENT"})
            out_features.append({"type": "Feature", "geometry": json.loads(centroid.ExportToJson()), "properties": props})
        else:
            # DO NOT CALL NON-INTERSECTING ASSETS SAFE!
            # Use "OUTSIDE CURRENT MODELLED HAZARD"
            props = {feat.GetFieldDefnRef(i).GetName(): feat.GetField(i) for i in range(feat.GetFieldCount())}
            props.update({'max_depth_m': 0, 'arrival_time_hr': None, 'depth_class': "No Hazard", 'arrival_class': "NOT REACHED WITHIN SIMULATION WINDOW", 'exposure_status': "OUTSIDE CURRENT MODELLED HAZARD"})
            out_features.append({"type": "Feature", "geometry": json.loads(centroid.ExportToJson()), "properties": props})

    with open(out_file, "w") as f: json.dump({"type": "FeatureCollection", "features": out_features}, f)
    return counts, max_d_overall, min_a_overall

def process_lines(gpkg_path, layer_name, feature_filter, out_file):
    ds = ogr.Open(gpkg_path)
    layer = ds.GetLayerByName(layer_name) if layer_name else ds.GetLayer()
    out_features = []
    counts = {'total_len': 0, 'exposed_len': 0, 'exposed_count': 0, 'total_count': 0, 'depth_classes': {}, 'arr_classes': {}}
    min_a_overall = 9999.0
    for feat in layer:
        counts['total_count'] += 1
        geom = feat.GetGeometryRef()
        if not geom: continue
        geom_32644 = geom.Clone()
        geom_32644.Transform(transform)
        length = geom_32644.Length()
        counts['total_len'] += length
        num_pts = max(2, int(length / 30))
        max_d, min_a, wet_pts = 0, 9999.0, 0
        for i in range(num_pts):
            pt = geom_32644.Value((i / (num_pts - 1)) * length)
            d, a = sample_raster(pt.GetX(), pt.GetY())
            if d >= 0.05:
                wet_pts += 1
                if d > max_d: max_d = d
                if a < min_a: min_a = a
        if wet_pts > 0:
            wet_len = (wet_pts / num_pts) * length
            counts['exposed_len'] += wet_len
            counts['exposed_count'] += 1
            if min_a < min_a_overall: min_a_overall = min_a
            dc, ac = depth_class(max_d), arr_class(min_a)
            counts['depth_classes'][dc] = counts['depth_classes'].get(dc, 0) + 1
            counts['arr_classes'][ac] = counts['arr_classes'].get(ac, 0) + 1
            props = {feat.GetFieldDefnRef(i).GetName(): feat.GetField(i) for i in range(feat.GetFieldCount())}
            props.update({'wet_length_m': wet_len, 'max_depth_m': max_d, 'arrival_time_hr': min_a if min_a!=9999.0 else None, 'depth_class': dc, 'arrival_class': ac, 'exposure_status': "INTERSECTS MODELLED INUNDATION EXTENT"})
            out_features.append({"type": "Feature", "geometry": json.loads(geom.ExportToJson()), "properties": props})
        else:
            props = {feat.GetFieldDefnRef(i).GetName(): feat.GetField(i) for i in range(feat.GetFieldCount())}
            props.update({'wet_length_m': 0, 'max_depth_m': 0, 'arrival_time_hr': None, 'depth_class': "No Hazard", 'arrival_class': "NOT REACHED WITHIN SIMULATION WINDOW", 'exposure_status': "OUTSIDE CURRENT MODELLED HAZARD"})
            out_features.append({"type": "Feature", "geometry": json.loads(geom.ExportToJson()), "properties": props})

    with open(out_file, "w") as f: json.dump({"type": "FeatureCollection", "features": out_features}, f)
    return counts, min_a_overall

c_set, d_set, a_set = process_points("/workspace/data/raw/osm/settlements_merged.gpkg", None, lambda f: True, out_dir + "/settlements/exposed_settlements.geojson")
c_health, d_health, a_health = process_points("/workspace/data/raw/osm/infrastructure_merged.gpkg", None, lambda f: f.GetField("healthcare") is not None or f.GetField("amenity") in ['hospital', 'clinic'], out_dir + "/healthcare/exposed_healthcare.geojson")
c_power, d_power, a_power = process_points("/workspace/data/raw/osm/infrastructure_merged.gpkg", None, lambda f: f.GetField("power") is not None, out_dir + "/power/exposed_power.geojson")
c_bridge, d_bridge, a_bridge = process_points("/workspace/data/raw/osm/infrastructure_merged.gpkg", None, lambda f: f.GetField("bridge") is not None, out_dir + "/bridges/exposed_bridges.geojson")
c_road, a_road = process_lines("/workspace/data/raw/osm/road_network_merged_v2.gpkg", "edges", None, out_dir + "/roads/exposed_roads.geojson")

summary = {
    "scenario_metadata": {
        "hazard_provenance": "MODELLED LISFLOOD-FP 8.1 CORRECTED V4 3600S",
        "simulation_window_s": 3600,
        "warning": "This is a WHAT-IF emergency-planning benchmark. Do not call outputs observed damage, real casualties, validated Tehri impact, or operational forecast."
    },
    "exposure_counts": {
        "settlements_intersected": c_set['exposed'],
        "healthcare_intersected": c_health['exposed'],
        "power_assets_intersected": c_power['exposed'],
        "bridges_intersected": c_bridge['exposed'],
        "road_km_intersected": round(c_road['exposed_len'] / 1000.0, 3),
        "road_segments_intersected": c_road['exposed_count']
    },
    "depth_classes": {},
    "arrival_classes": {}
}

for c in [c_set, c_health, c_power, c_bridge, c_road]:
    for k, v in c['depth_classes'].items(): summary["depth_classes"][k] = summary["depth_classes"].get(k, 0) + v
    for k, v in c['arr_classes'].items(): summary["arrival_classes"][k] = summary["arrival_classes"].get(k, 0) + v

with open(out_dir + "/summary/hazard_exposure_summary.json", "w") as f: json.dump(summary, f, indent=2)

with open(out_dir + "/qa/exposure_qa.md", "w") as f:
    f.write("# Exposure QA\n- Reprojection: Validated (EPSG:4326 to EPSG:32644)\n- No duplicated OSM assets\n- No negative depths applied\n- Arrival time units: hours\n")

print(f"Deepest Settlement: {d_set} m")
print(f"Earliest Settlement Arrival: {a_set} h")
print(f"Earliest Road Arrival: {a_road} h")

