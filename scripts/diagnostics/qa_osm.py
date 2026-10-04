import json
import urllib.request
import urllib.parse
from shapely.geometry import shape, MultiPolygon

print("--- 5. GEOJSON CONSISTENCY ---")
with open("data/processed/tehri_simulations/lisflood_fp/outputs/rasters/inundation_extent.geojson") as f:
    geojson = json.load(f)

crs = geojson.get("crs", "Not explicitly defined (usually EPSG:4326 for GeoJSON but check coords)")
features = geojson.get("features", [])
print(f"CRS object present: {bool(geojson.get('crs'))}")
print(f"Polygon count: {len(features)}")

# Let's check coordinate values to deduce CRS
first_coord = features[0]['geometry']['coordinates'][0][0]
if type(first_coord[0]) == list:
    first_coord = first_coord[0]
print(f"Sample coord: {first_coord}")
if first_coord[0] > 1000:
    print("Coordinates appear to be projected (EPSG:32644).")
else:
    print("Coordinates appear to be Lat/Lon (EPSG:4326).")

polygons = []
for feat in features:
    geom = shape(feat['geometry'])
    polygons.append(geom)

extent_geom = MultiPolygon(polygons) if len(polygons) > 1 else polygons[0]
# Area in projected CRS is just .area
print(f"Area from GeoJSON geometry: {extent_geom.area / 1e6:.3f} km2")

print("\n--- 6. OSM INTERSECTION RECHECK ---")
# To query overpass, we need a bounding box in Lat/Lon.
# We know the bounding box of the DEM in UTM 44N is roughly:
# X: 242800 to 262800, Y: 3338500 to 3368500
# In Lat/Lon, this is approximately:
# Lat: 30.15 to 30.42, Lon: 78.32 to 78.53
# Let's just do a bounding box query over this region and do a simple intersection.
# Wait! Instead of a complex local intersection, the user explicitly allowed:
# "report ONLY: geometric overlap counts" and "Do not fabricate agreement if checkpoints are represented separately."
# I'll query Overpass. If I can't install Shapely in time, I'll just report a mock or a simplified bounding box.
# Wait, I HAVE Shapely! Let's do the Overpass query.

overpass_url = "http://overpass-api.de/api/interpreter"
overpass_query = """
[out:json];
(
  node["place"](30.15,78.32,30.42,78.53);
  way["highway"](30.15,78.32,30.42,78.53);
  way["bridge"="yes"](30.15,78.32,30.42,78.53);
  node["amenity"="hospital"](30.15,78.32,30.42,78.53);
  node["amenity"="clinic"](30.15,78.32,30.42,78.53);
  node["power"](30.15,78.32,30.42,78.53);
  way["power"](30.15,78.32,30.42,78.53);
);
out center;
"""
print("Querying Overpass API for bounding box...")
try:
    req = urllib.request.Request(overpass_url, data=overpass_query.encode('utf-8'))
    with urllib.request.urlopen(req) as response:
        osm_data = json.loads(response.read().decode())
    
    print(f"OSM nodes/ways retrieved: {len(osm_data['elements'])}")
    
    # We need to transform extent_geom to Lat/Lon to intersect, or OSM points to UTM!
    import pyproj
    from shapely.ops import transform
    project = pyproj.Transformer.from_crs("epsg:32644", "epsg:4326", always_xy=True).transform
    extent_geom_ll = transform(project, extent_geom)
    
    from shapely.geometry import Point
    
    counts = {"settlements": 0, "healthcare": 0, "roads": 0, "bridges": 0, "power": 0}
    for el in osm_data['elements']:
        lon = el.get('lon') or el.get('center', {}).get('lon')
        lat = el.get('lat') or el.get('center', {}).get('lat')
        if lon and lat:
            pt = Point(lon, lat)
            if extent_geom_ll.intersects(pt):
                tags = el.get('tags', {})
                if 'place' in tags:
                    counts['settlements'] += 1
                elif tags.get('amenity') in ['hospital', 'clinic']:
                    counts['healthcare'] += 1
                elif tags.get('bridge') == 'yes':
                    counts['bridges'] += 1
                elif 'highway' in tags:
                    counts['roads'] += 1
                elif 'power' in tags:
                    counts['power'] += 1
                    
    for k, v in counts.items():
        print(f"{k}: {v} (INTERSECTS MODELLED INUNDATION EXTENT)")

except Exception as e:
    print(f"Overpass query failed: {e}")

