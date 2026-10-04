import rasterio

bci_pts = [
    (257385.0, 3362705.0),
    (257415.0, 3362735.0),
    (257445.0, 3362735.0),
    (257475.0, 3362765.0),
    (257505.0, 3362765.0),
    (257535.0, 3362765.0),
    (257565.0, 3362795.0),
    (257595.0, 3362795.0),
    (257625.0, 3362825.0),
]

with rasterio.open("/data/processed/tehri_simulations/lisflood_fp/terrain/v4_dem_30m_corrected.asc") as src:
    data = src.read(1)
    print(f"CRS: {src.crs}, Transform: {src.transform}")
    for i, (x, y) in enumerate(bci_pts):
        row, col = src.index(x, y)
        elev = data[row, col]
        print(f"Cell {i}: row={row} col={col} x={x} y={y} elev={elev}")
