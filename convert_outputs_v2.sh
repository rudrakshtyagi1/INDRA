#!/bin/bash
set -e
cd /workspace/data/processed/tehri_simulations/lisflood_fp/outputs/v2_boundary_corrected
gdal_translate -a_srs EPSG:32644 -a_nodata -9999 raw/tehri_coarse_v2.max rasters/max_depth_v2.tif
gdal_translate -a_srs EPSG:32644 -a_nodata -9999 raw/tehri_coarse_v2.inittm rasters/arrival_time_v2.tif

gdal_calc.py -A rasters/max_depth_v2.tif --outfile=rasters/inundation_mask_v2.tif --calc="A>0.05" --NoDataValue=0
gdal_polygonize.py rasters/inundation_mask_v2.tif -f "GeoJSON" rasters/inundation_extent_v2.geojson
