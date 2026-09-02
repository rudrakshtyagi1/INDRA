import tifffile
import os

dems = [
    "data/processed/tehri_inputs/terrain/tehri_upstream_validation_dem_glo30_v2.tif",
    "data/processed/tehri_inputs/terrain/downstream_dem_glo30.tif",
    "data/processed/tehri_inputs/terrain/tehri_upstream_hydroconditioned_dem.tif",
    "data/processed/tehri_inputs/terrain/tehri_upstream_validation_dem_glo30.tif"
]

for d in dems:
    try:
        with tifffile.TiffFile(d) as tif:
            tags = tif.pages[0].tags
            print(f"=== {d} ===")
            width = tags['ImageWidth'].value
            length = tags['ImageLength'].value
            print(f"Cols (Width): {width}, Rows (Height): {length}")
            if 'ModelPixelScaleTag' in tags:
                res = tags['ModelPixelScaleTag'].value
                print(f"Resolution: {res}")
                print(f"Extent Width (km): {width * res[0] / 1000:.2f}")
                print(f"Extent Height (km): {length * res[1] / 1000:.2f}")
            else:
                print("No pixel scale tag.")
    except Exception as e:
        print(f"Failed {d}: {e}")
