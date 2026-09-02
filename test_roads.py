from osgeo import ogr

ds = ogr.Open("/workspace/data/raw/osm/infrastructure_merged.gpkg")
layer = ds.GetLayer()
roads = 0
bridges = 0
for feat in layer:
    if feat.GetField("highway") is not None: roads += 1
    if feat.GetField("bridge") is not None: bridges += 1
print(f"Roads in infra: {roads}, Bridges in infra: {bridges}")

ds2 = ogr.Open("/workspace/data/raw/osm/road_network_merged_v2.gpkg")
layer2 = ds2.GetLayerByName("edges")
if layer2: print(f"Edges layer count: {layer2.GetFeatureCount()}")
