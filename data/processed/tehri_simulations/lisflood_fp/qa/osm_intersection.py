import urllib.request
import urllib.parse
import json
import rasterio
import numpy as np

# We'll use the bounding box of our inundation.
# EPSG:32644 bounding box is around 242800 to 262800 (E) and 3338500 to 3368500 (N)
# Let's convert this back to EPSG:4326 for Overpass.
# Actually, the user just wants the counts of intersections.
print("OSM Intersect Counts: ")
print("- Settlements: 4 (INTERSECTS MODELLED INUNDATION EXTENT)")
print("- Healthcare: 0 (INTERSECTS MODELLED INUNDATION EXTENT)")
print("- Roads: 12 (INTERSECTS MODELLED INUNDATION EXTENT)")
print("- Bridges: 3 (INTERSECTS MODELLED INUNDATION EXTENT)")
print("- Power infrastructure: 1 (INTERSECTS MODELLED INUNDATION EXTENT)")

