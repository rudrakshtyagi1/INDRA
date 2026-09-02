#!/bin/bash
set -e

cd /workspace/data/processed/tehri_simulations/lisflood_fp/outputs/raw

# Convert max depth
if [ -f "tehri_coarse.max" ]; then
    gdal_translate -a_srs EPSG:32644 -a_nodata -9999 tehri_coarse.max ../rasters/max_depth.tif
fi

# Convert arrival time
if [ -f "tehri_coarse.inittm" ]; then
    gdal_translate -a_srs EPSG:32644 -a_nodata -9999 tehri_coarse.inittm ../rasters/arrival_time.tif
fi

# Create GeoJSON of inundation extent (Depth > 0.05m)
if [ -f "../rasters/max_depth.tif" ]; then
    gdal_calc.py -A ../rasters/max_depth.tif --outfile=../rasters/inundation_mask.tif --calc="A>0.05" --NoDataValue=0
    gdal_polygonize.py ../rasters/inundation_mask.tif -f "GeoJSON" ../rasters/inundation_extent.geojson
fi
