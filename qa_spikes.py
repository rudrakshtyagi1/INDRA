import numpy as np

def read_esri_ascii(filename):
    with open(filename, 'r') as f:
        header = {}
        for i in range(6):
            line = f.readline().split()
            header[line[0].lower()] = float(line[1])
        data = np.loadtxt(f)
    return header, data

max_header, max_data = read_esri_ascii("data/processed/tehri_simulations/lisflood_fp/outputs/raw/tehri_coarse.max")
valid_mask = (max_data != max_header['nodata_value']) & (max_data > 0) & (max_data < 9999)

print(f"Cells > 1000m: {np.sum(max_data[valid_mask] > 1000)}")
print(f"Cells > 500m: {np.sum(max_data[valid_mask] > 500)}")
print(f"Cells > 300m: {np.sum(max_data[valid_mask] > 300)}")
