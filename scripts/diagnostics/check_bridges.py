import geopandas as gpd
from osgeo import gdal, osr

bridges = gpd.read_file("data/raw/osm/infrastructure_merged.gpkg")
bridges = bridges[bridges['bridge'].notnull()]
print(f"Total bridges: {len(bridges)}")

# Let's print coords of bridges near the dam
dam_x = 78.48
dam_y = 30.37
near = bridges[(bridges.geometry.x > dam_x - 0.1) & (bridges.geometry.x < dam_x + 0.1) & 
               (bridges.geometry.y > dam_y - 0.1) & (bridges.geometry.y < dam_y + 0.1)]
print(f"Bridges near dam (<10km): {len(near)}")
for i, b in near.iterrows():
    print(f"Bridge {b.get('name', 'N/A')}: x={b.geometry.x:.4f}, y={b.geometry.y:.4f}")
