#!/bin/bash
set -e
cd /workspace/data/processed/tehri_simulations/lisflood_fp/outputs/v3_geometry_corrected
gdal_translate -a_srs EPSG:32644 -a_nodata -9999 raw/tehri_v3.max rasters/max_depth_v3.tif
gdal_translate -a_srs EPSG:32644 -a_nodata -9999 raw/tehri_v3.inittm rasters/arrival_time_v3.tif

gdal_calc.py -A rasters/max_depth_v3.tif --outfile=rasters/inundation_mask_v3.tif --calc="A>0.05" --NoDataValue=0
gdal_polygonize.py rasters/inundation_mask_v3.tif -f "GeoJSON" rasters/inundation_extent_v3.geojson
