#!/bin/bash
set -e

MINX=242800
MINY=3338500
MAXX=262800
MAXY=3368500

echo "Reprojecting and cropping DEM to 90m..."
gdalwarp -t_srs EPSG:32644 -tr 90 90 -r bilinear -te $MINX $MINY $MAXX $MAXY -dstnodata -9999 \
  -overwrite \
  /workspace/data/processed/tehri_inputs/terrain/downstream_dem_glo30.tif \
  /workspace/data/processed/tehri_simulations/lisflood_fp/terrain/downstream_dem.tif

echo "Converting to ASCII Grid..."
gdal_translate -of AAIGrid -a_nodata -9999 \
  /workspace/data/processed/tehri_simulations/lisflood_fp/terrain/downstream_dem.tif \
  /workspace/data/processed/tehri_simulations/lisflood_fp/terrain/downstream_dem_ascii.asc

echo "Done."
