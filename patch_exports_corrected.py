import re

filename = "backend/floodlab/api/routers/exports.py"
with open(filename, "r") as f:
    content = f.read()

content = content.replace("max_depth_v4.tif", "max_depth_v4_corrected.tif")
content = content.replace("arrival_time_v4.tif", "arrival_time_v4_corrected.tif")
content = content.replace("inundation_extent_v4.geojson", "inundation_extent_v4_corrected.geojson")

with open(filename, "w") as f:
    f.write(content)
