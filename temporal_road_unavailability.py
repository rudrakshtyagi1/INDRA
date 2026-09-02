import json

with open("data/processed/tehri_simulations/exposure/v4/roads/exposed_roads.geojson", "r") as f:
    roads = json.load(f)["features"]

timesteps = [0, 300, 600, 900, 1200, 1800, 2400, 3000, 3600]
unavailability = {t: 0 for t in timesteps}

for feat in roads:
    arr_hr = feat["properties"].get("arrival_time_hr")
    if arr_hr is not None:
        arr_sec = arr_hr * 3600
        for t in timesteps:
            if arr_sec <= t:
                unavailability[t] += 1

for t in timesteps:
    print(f"ROAD_EDGES_UNAVAILABLE_T{t} = {unavailability[t]}")
