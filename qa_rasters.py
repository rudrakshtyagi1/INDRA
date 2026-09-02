from osgeo import gdal, osr
import numpy as np

print("--- MAX DEPTH QA ---")
ds = gdal.Open("/workspace/data/processed/tehri_simulations/lisflood_fp/outputs/rasters/max_depth.tif")
band = ds.GetRasterBand(1)
depth_wse = band.ReadAsArray()
crs_wkt = ds.GetProjection()
width = ds.RasterXSize
height = ds.RasterYSize
transform = ds.GetGeoTransform()
nodata = band.GetNoDataValue()

srs = osr.SpatialReference()
srs.ImportFromWkt(crs_wkt)
crs = srs.GetAttrValue("AUTHORITY", 0) + ":" + srs.GetAttrValue("AUTHORITY", 1)

print(f"CRS: {crs}")
print(f"Dimensions: {width} x {height}")
print(f"Cell size: {transform[1]}, {-transform[5]}")
print(f"NoData: {nodata}")

dem_ds = gdal.Open("/workspace/data/processed/tehri_simulations/lisflood_fp/terrain/downstream_dem_ascii.asc")
dem = dem_ds.GetRasterBand(1).ReadAsArray()

# Mask valid cells
valid_mask = (depth_wse > 0) & (depth_wse < 9000) & (dem > 0) & (dem < 9000)
actual_depth = np.where(valid_mask, depth_wse - dem, np.nan)

wet_mask = (actual_depth > 0.05) & ~np.isnan(actual_depth)
depth_values = actual_depth[wet_mask]

print(f"Valid cells (in DEM): {np.sum((dem > 0) & (dem < 9000))}")
print(f"Wet cells (Depth > 0.05): {np.sum(wet_mask)}")

if len(depth_values) > 0:
    print(f"Minimum depth: {np.min(depth_values):.2f}")
    print(f"Mean depth: {np.mean(depth_values):.2f}")
    print(f"Median depth: {np.median(depth_values):.2f}")
    print(f"95th percentile: {np.percentile(depth_values, 95):.2f}")
    print(f"99th percentile: {np.percentile(depth_values, 99):.2f}")
    print(f"Maximum depth: {np.max(depth_values):.2f}")
    
    max_idx = np.nanargmax(np.where(wet_mask, actual_depth, np.nan))
    row, col = np.unravel_index(max_idx, actual_depth.shape)
    easting = transform[0] + (col + 0.5) * transform[1]
    northing = transform[3] + (row + 0.5) * transform[5]
    print(f"Max depth location: Easting={easting}, Northing={northing}")
    
    target_srs = osr.SpatialReference()
    target_srs.ImportFromEPSG(4326)
    target_srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    coord_trans = osr.CoordinateTransformation(srs, target_srs)
    lon, lat, _ = coord_trans.TransformPoint(easting, northing)
    print(f"Lat/Lon: {lat}, {lon}")
    
    print("--- EXTREME DEPTH SANITY CHECK ---")
    cell_area = transform[1] * (-transform[5])
    for d_thresh in [10, 20, 50, 100]:
        count = np.sum(depth_values > d_thresh)
        area = count * cell_area / 1e6
        print(f"> {d_thresh} m: {count} cells, {area:.3f} km2")

print("--- ARRIVAL TIME QA ---")
arr_ds = gdal.Open("/workspace/data/processed/tehri_simulations/lisflood_fp/outputs/rasters/arrival_time.tif")
arr_band = arr_ds.GetRasterBand(1)
arr = arr_band.ReadAsArray()
arr_nodata = arr_band.GetNoDataValue()

print(f"Units: HOURS (LISFLOOD-FP float default for .inittm)")
print(f"NoData: {arr_nodata}")
valid_arr = arr[(arr > 0) & (arr < 9999)]
if len(valid_arr) > 0:
    print(f"Minimum arrival time: {np.min(valid_arr):.4f} h")
    print(f"Median arrival time: {np.median(valid_arr):.4f} h")
    print(f"Maximum arrival time: {np.max(valid_arr):.4f} h")

dists = ["2km", "5km", "10km", "15km"]
xs = [257425, 258535, 259135, 262795]
ys = [3360745, 3357745, 3352765, 3347755]

for d, x_c, y_c in zip(dists, xs, ys):
    col = int((x_c - transform[0]) / transform[1])
    row = int((y_c - transform[3]) / transform[5])
    try:
        val = arr[row, col]
        if val > 0 and val < 9999:
            print(f"Checkpoint {d}: {val:.4f} h ({val*3600:.1f} s)")
        else:
            window = arr[row-2:row+3, col-2:col+3]
            v_win = window[(window > 0) & (window < 9999)]
            if len(v_win) > 0:
                print(f"Checkpoint {d}: {np.min(v_win):.4f} h ({np.min(v_win)*3600:.1f} s) (from nearest wet cell)")
            else:
                print(f"Checkpoint {d}: NOT REACHED")
    except:
        print(f"Checkpoint {d}: OUT OF BOUNDS")

