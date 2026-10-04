import json
import networkx as nx
import math
import os

with open("data/processed/tehri_simulations/exposure/v4/roads/exposed_roads.geojson", "r") as f:
    data = json.load(f)

G = nx.MultiDiGraph()

# Build Graph
for feat in data["features"]:
    props = feat["properties"]
    u = props["u"]
    v = props["v"]
    # Length in meters
    length = props.get("length", 100)
    arr_hr = props.get("arrival_time_hr")
    
    # speed limit approx 30 km/h = 8.33 m/s
    travel_time_s = length / 8.33
    
    flood_arrival_s = float("inf") if arr_hr is None else arr_hr * 3600
    
    G.add_edge(u, v, length=length, travel_time_s=travel_time_s, flood_arrival_s=flood_arrival_s, geometry=feat["geometry"])
    if not props.get("oneway", False):
        G.add_edge(v, u, length=length, travel_time_s=travel_time_s, flood_arrival_s=flood_arrival_s, geometry=feat["geometry"])

def haversine(lon1, lat1, lon2, lat2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# We need node coordinates. Let's extract them from the edge geometries.
node_coords = {}
for feat in data["features"]:
    u = feat["properties"]["u"]
    v = feat["properties"]["v"]
    coords = feat["geometry"]["coordinates"]
    node_coords[u] = coords[0]
    node_coords[v] = coords[-1]

def get_nearest_node(lon, lat):
    min_dist = float("inf")
    nearest = None
    for node, coord in node_coords.items():
        dist = haversine(lon, lat, coord[0], coord[1])
        if dist < min_dist:
            min_dist = dist
            nearest = node
    return nearest

origin_node = get_nearest_node(78.4682393, 30.3567725)
dest_node = get_nearest_node(78.3224111, 30.1280407)

print(f"Origin Node: {origin_node}, Dest Node: {dest_node}")

def route(aware=False):
    def weight(u, v, d):
        base_time = d["travel_time_s"]
        return base_time
        
    try:
        if not aware:
            path = nx.shortest_path(G, origin_node, dest_node, weight=weight)
        else:
            # We must track time!
            # Since networkx shortest_path doesn't support dynamic weights natively,
            # we can use a custom dijkstra or just penalize heavily flooded edges
            # Wait, standard dijkstra:
            dist = {node: float("inf") for node in G.nodes()}
            dist[origin_node] = 0
            prev = {node: None for node in G.nodes()}
            prev_edge = {node: None for node in G.nodes()}
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
                        # aware: if flood arrives before we arrive (d + edge_time), it's blocked!
                        # Add a safety buffer of 600s
                        if (d + edge_time + 600) >= arr:
                            continue # Impassable
                        
                        new_d = d + edge_time
                        if new_d < dist[v]:
                            dist[v] = new_d
                            prev[v] = u
                            prev_edge[v] = key
                            heapq.heappush(pq, (new_d, v))
            if dist[dest_node] == float("inf"):
                return None, None
            
            # Reconstruct path
            path = []
            curr = dest_node
            while curr is not None:
                path.append(curr)
                curr = prev[curr]
            path.reverse()
            
        # Calculate stats
        total_dist = 0
        total_time = 0
        conflict_edges = 0
        features = []
        
        curr_time = 0
        for i in range(len(path)-1):
            u = path[i]
            v = path[i+1]
            if not aware:
                # Get shortest edge
                edata = min(G[u][v].values(), key=lambda x: x["travel_time_s"])
            else:
                edata = G[u][v][prev_edge[v]]
                
            total_dist += edata["length"]
            total_time += edata["travel_time_s"]
            
            arr = edata["flood_arrival_s"]
            if (curr_time + edata["travel_time_s"] + 600) >= arr:
                conflict_edges += 1
                
            curr_time += edata["travel_time_s"]
            features.append({"type": "Feature", "geometry": edata["geometry"], "properties": {}})
            
        return {"dist_km": total_dist/1000.0, "time_s": total_time, "conflicts": conflict_edges, "features": features}
    except Exception as e:
        return None, None

normal = route(aware=False)
aware = route(aware=True)

res = {
    "normal": normal,
    "aware": aware
}
with open("/tmp/route_results.json", "w") as f:
    json.dump(res, f)

