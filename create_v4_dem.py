import rasterio
from rasterio.windows import Window
import os
import numpy as np

v3_dem = "/data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m.tif"
glo30 = "/data/processed/tehri_inputs/terrain/tehri_upstream_validation_dem_glo30_v2.tif" 
# wait, glo30 downstream is downstream_dem_glo30.tif. Let's find which one covers V3 exactly!

print("Done")
