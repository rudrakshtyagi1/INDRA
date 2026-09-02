import geopandas as gpd

print("--- Settlements ---")
gdf_settlements = gpd.read_file("data/raw/osm/settlements_merged.gpkg")
print(gdf_settlements.columns)
print(gdf_settlements['place'].unique() if 'place' in gdf_settlements.columns else "no place col")

print("--- Infrastructure ---")
gdf_infra = gpd.read_file("data/raw/osm/infrastructure_merged.gpkg")
print(gdf_infra.columns)
for col in ['amenity', 'bridge', 'power', 'highway']:
    if col in gdf_infra.columns:
        print(f"{col}: {gdf_infra[col].unique()}")

print("--- Roads ---")
gdf_roads = gpd.read_file("data/raw/osm/road_network_merged_v2.gpkg")
print(gdf_roads.columns)
