import rasterio

# Check V3 DEM
v3_dem = "/data/processed/tehri_simulations/lisflood_fp/terrain/v3_dem_30m.tif"
raw_dem = "/data/processed/tehri_inputs/terrain/downstream_dem_glo30.tif"

def audit_dem(path, name):
    try:
        with rasterio.open(path) as src:
            print(f"=== {name} ===")
            print("CRS:", src.crs)
            print("Resolution:", src.res)
            print("Shape (rows, cols):", src.shape)
            print("Bounds:", src.bounds)
            print("Total Cells:", src.shape[0] * src.shape[1])
            width_km = (src.bounds.right - src.bounds.left)/1000
            height_km = (src.bounds.top - src.bounds.bottom)/1000
            print(f"Width (km): {width_km:.2f}")
            print(f"Height (km): {height_km:.2f}")
            
            # Simple assumption: river follows diagonal roughly, or just max dimension
            print(f"Max Extent (km): {max(width_km, height_km):.2f}")
    except Exception as e:
        print(f"Failed to audit {path}: {e}")

audit_dem(v3_dem, "CURRENT V3 DEM")
audit_dem(raw_dem, "AVAILABLE DOWNSTREAM DEM")

