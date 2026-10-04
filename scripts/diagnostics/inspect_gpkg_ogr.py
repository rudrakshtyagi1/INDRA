from osgeo import ogr
import sys

for gpkg in ["/workspace/data/raw/osm/settlements_merged.gpkg", "/workspace/data/raw/osm/infrastructure_merged.gpkg", "/workspace/data/raw/osm/road_network_merged_v2.gpkg"]:
    ds = ogr.Open(gpkg)
    if not ds: continue
    layer = ds.GetLayer()
    defn = layer.GetLayerDefn()
    print(f"--- {gpkg} ---")
    cols = [defn.GetFieldDefn(i).GetName() for i in range(defn.GetFieldCount())]
    print(cols)
