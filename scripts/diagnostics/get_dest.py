import json

with open('/workspace/data/processed/tehri_simulations/exposure/v3/healthcare/exposed_healthcare.geojson') as f:
    hc = json.load(f)['features']
    print("Exposed Healthcare:", len(hc))

from osgeo import ogr
ds = ogr.Open("/workspace/data/raw/osm/infrastructure_merged.gpkg")
layer = ds.GetLayer()
for feat in layer:
    if feat.GetField("healthcare") is not None or feat.GetField("amenity") in ['hospital', 'clinic']:
        geom = feat.GetGeometryRef()
        if geom:
            c = geom.Centroid()
            print(f"Hospital: {feat.GetField('name')} at {c.GetX():.4f}, {c.GetY():.4f}")
