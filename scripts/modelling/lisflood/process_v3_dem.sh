#!/bin/bash
set -e
cd /workspace
gdalbuildvrt data/processed/tehri_simulations/lisflood_fp/terrain/dem_30m.vrt data/raw/gee/copernicus_dem/*.tif
gdalwarp -t_srs EPSG:32644 -tr 30 30 -te 255000 3350000 265000 3365000 \
    -r bilinear \
    data/processed/tehri_simulations/lisflood_fp/terrain/dem_30m.vrt \
    data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m.tif

gdal_translate -of AAIGrid -a_nodata -9999 \
    data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m.tif \
    data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m_ascii.asc
