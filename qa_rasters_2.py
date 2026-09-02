from osgeo import gdal
import numpy as np

ds = gdal.Open("/workspace/data/processed/tehri_simulations/lisflood_fp/outputs/rasters/max_depth.tif")
band = ds.GetRasterBand(1)
wse_or_depth = band.ReadAsArray()
print(f"Max value: {np.max(wse_or_depth)}")
print(f"Number of cells > 0.05: {np.sum(wse_or_depth > 0.05)}")
print(f"Number of cells > 0.05 and < 1000: {np.sum((wse_or_depth > 0.05) & (wse_or_depth < 1000))}")
