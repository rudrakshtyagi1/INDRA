import json
import networkx as nx
import geopandas as gpd
import math

with open("data/processed/tehri_simulations/exposure/v4/roads/exposed_roads.geojson", "r") as f:
    exposed_data = json.load(f)["features"]

exposed_dict = {}
for feat in exposed_data:
    props = feat["properties"]
    u, v = props["u"], props["v"]
    exposed_dict[(u, v)] = props
    if not props.get("oneway", False):
        exposed_dict[(v, u)] = props

gdf_edges = gpd.read_file("data/raw/osm/road_network_merged_v2.gpkg", layer="edges")
gdf_nodes = gpd.read_file("data/raw/osm/road_network_merged_v2.gpkg", layer="nodes")

gdf_nodes.set_index("osmid", inplace=True)
G = nx.MultiDiGraph()
node_coords = {}
for idx, row in gdf_nodes.iterrows():
    G.add_node(idx, y=row.geometry.y, x=row.geometry.x)
    node_coords[idx] = (row.geometry.x, row.geometry.y)

for idx, row in gdf_edges.iterrows():
    u, v = row["u"], row["v"]
    length = row.get("length", 100)
    speed_kmh = 30.0
    if row.get("highway") in ["motorway", "trunk"]: speed_kmh = 80.0
    elif row.get("highway") in ["primary", "secondary"]: speed_kmh = 50.0
    travel_time_s = length / (speed_kmh / 3.6)
    
    exp_props = exposed_dict.get((u, v))
    if not exp_props: exp_props = exposed_dict.get((v, u))
    arr_hr = exp_props.get("arrival_time_hr") if exp_props else None
    flood_arrival_s = float("inf") if arr_hr is None else arr_hr * 3600.0
    
    geom_json = row.geometry.__geo_interface__ if row.geometry else None
    
    G.add_edge(u, v, length=length, travel_time_s=travel_time_s, flood_arrival_s=flood_arrival_s, geometry=geom_json)
    
    # Check if oneway
    # In gdf_edges, the attribute is 'oneway' (boolean or string)
    oneway = row.get("oneway")
    if str(oneway).lower() not in ["true", "1", "yes"]:
        G.add_edge(v, u, length=length, travel_time_s=travel_time_s, flood_arrival_s=flood_arrival_s, geometry=geom_json)

def haversine(lon1, lat1, lon2, lat2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def get_nearest_node(lon, lat):
    min_dist = float("inf")
    nearest = None
    for node, coord in node_coords.items():
        dist = haversine(lon, lat, coord[0], coord[1])
        if dist < min_dist:
            min_dist = dist
            nearest = node
    return nearest

origin_node = 2613453416
dest_node = get_nearest_node(78.3315, 30.12882)

def route(aware=False):
    def weight(u, v, d): return d[0]["travel_time_s"]
    try:
        if not aware:
            path = nx.shortest_path(G, origin_node, dest_node, weight=weight)
        else:
            dist = {n: float("inf") for n in G.nodes()}
            dist[origin_node] = 0
            prev = {n: None for n in G.nodes()}
            prev_edge = {n: None for n in G.nodes()}
            import heapq
            pq = [(0, origin_node)]
            while pq:
                d, u = heapq.heappop(pq)
                if d > dist[u]: continue
                if u == dest_node: break
                for v in G[u]:
                    for key, edata in G[u][v].items():
                        edge_time = edata["travel_time_s"]
                        arr = edata["flood_arrival_s"]
                        if (d + edge_time + 600) >= arr: continue
                        new_d = d + edge_time
                        if new_d < dist[v]:
                            dist[v] = new_d
                            prev[v] = u
                            prev_edge[v] = key
                            heapq.heappush(pq, (new_d, v))
            if dist[dest_node] == float("inf"): return None
            path = []
            curr = dest_node
            while curr is not None:
                path.append(curr)
                curr = prev[curr]
            path.reverse()
        total_dist, total_time, conflict_edges = 0, 0, 0
        features = []
        curr_time = 0
        for i in range(len(path)-1):
            u, v = path[i], path[i+1]
            edata = min(G[u][v].values(), key=lambda x: x["travel_time_s"]) if not aware else G[u][v][prev_edge[v]]
            total_dist += edata["length"]
            total_time += edata["travel_time_s"]
            arr = edata["flood_arrival_s"]
            if (curr_time + edata["travel_time_s"] + 600) >= arr: conflict_edges += 1
            curr_time += edata["travel_time_s"]
            if edata["geometry"]: features.append({"type": "Feature", "geometry": edata["geometry"], "properties": {}})
        return {"dist_km": total_dist/1000.0, "time_s": total_time, "conflicts": conflict_edges, "features": features}
    except Exception as e: return None

normal = route(aware=False)
aware = route(aware=True)

import os
os.makedirs("data/processed/tehri_simulations/hadr/v4/routes", exist_ok=True)
if normal:
    with open("data/processed/tehri_simulations/hadr/v4/routes/normal_route.geojson", "w") as f:
        json.dump({"type": "FeatureCollection", "features": normal["features"]}, f)
if aware:
    with open("data/processed/tehri_simulations/hadr/v4/routes/hazard_aware_route.geojson", "w") as f:
        json.dump({"type": "FeatureCollection", "features": aware["features"]}, f)

print(f"NORMAL_ROUTE_DISTANCE_KM = {round(normal['dist_km'], 3) if normal else -1}")
print(f"NORMAL_ROUTE_ETA_SEC = {round(normal['time_s'], 1) if normal else -1}")
print(f"NORMAL_ROUTE_CONFLICT_EDGES = {normal['conflicts'] if normal else -1}")
if normal: print(f"NORMAL_ROUTE_STATUS = {'AVOIDS CURRENTLY MODELLED HAZARD SEGMENTS' if normal['conflicts'] == 0 else 'NOT FEASIBLE AGAINST MODELLED HAZARD'}")
else: print(f"NORMAL_ROUTE_STATUS = NO_PATH")

print(f"HAZARD_ROUTE_DISTANCE_KM = {round(aware['dist_km'], 3) if aware else -1}")
print(f"HAZARD_ROUTE_ETA_SEC = {round(aware['time_s'], 1) if aware else -1}")
print(f"HAZARD_ROUTE_CONFLICT_EDGES = {aware['conflicts'] if aware else -1}")
if aware: print(f"HAZARD_ROUTE_STATUS = {'AVOIDS CURRENTLY MODELLED HAZARD SEGMENTS' if aware['conflicts'] == 0 else 'NOT FEASIBLE AGAINST MODELLED HAZARD'}")
else: print(f"HAZARD_ROUTE_STATUS = ROUTE_NOT_FEASIBLE_UNDER_CURRENT_SCENARIO")
