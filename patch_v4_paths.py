import re

for filename in ["backend/floodlab/api/routers/exports.py"]:
    with open(filename, "r") as f:
        content = f.read()
    content = content.replace("/tmp/v4_setup/outputs/temporal_depth/geotiffs", "/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/temporal_depth/geotiffs")
    content = content.replace("/tmp/v4_setup/rasters", "/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/rasters")
    content = content.replace("/tmp/v4_setup/vectors", "/data/processed/tehri_simulations/lisflood_fp/outputs/v4_extended/outputs/vectors")
    with open(filename, "w") as f:
        f.write(content)
