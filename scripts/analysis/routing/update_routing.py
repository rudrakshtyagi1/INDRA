import json, heapq, math, os
from osgeo import ogr

out_dir = "/workspace/data/processed/tehri_simulations/hadr/v3"
ds = ogr.Open('/workspace/data/raw/osm/road_network_merged_v2.gpkg')

hazard_info = {}
with open('/workspace/data/processed/tehri_simulations/exposure/v3/roads/exposed_roads.geojson') as f:
    exposed_edges = json.load(f)['features']
for f in exposed_edges:
    u = int(f['properties']['u'])
    v = int(f['properties']['v'])
    max_d = f['properties']['max_depth_m']
    arr_h = f['properties']['arrival_time_hr']
    arr_s = arr_h * 3600 if arr_h is not None else 9999.0 * 3600
    hazard_info[(u, v)] = (max_d, arr_s)
    hazard_info[(v, u)] = (max_d, arr_s)

graph = {}
edges_list = []
edges_layer = ds.GetLayerByName('edges')
for feat in edges_layer:
    u = int(feat.GetField('u'))
    v = int(feat.GetField('v'))
    length = float(feat.GetField('length'))
    max_d, arr_s = hazard_info.get((u, v), (0.0, 9999.0 * 3600))
    oneway = feat.GetField('oneway') == 1 or feat.GetField('oneway') == 'True' or feat.GetField('oneway') == 'true'
    
    e1 = {'u': u, 'v': v, 'length': length, 'max_d': max_d, 'arr_s': arr_s, 'osmid': feat.GetField('osmid'), 'geom': feat.GetGeometryRef().ExportToJson()}
    if u not in graph: graph[u] = []
    graph[u].append(e1)
    edges_list.append(e1)
    
    if not oneway:
        e2 = {'u': v, 'v': u, 'length': length, 'max_d': max_d, 'arr_s': arr_s, 'osmid': feat.GetField('osmid'), 'geom': feat.GetGeometryRef().ExportToJson()}
        if v not in graph: graph[v] = []
        graph[v].append(e2)

nodes_layer = ds.GetLayerByName('nodes')
node_coords = {int(f.GetField('osmid')): (f.GetGeometryRef().GetX(), f.GetGeometryRef().GetY()) for f in nodes_layer}

def dist(x1, y1, x2, y2):
    dx = (x1 - x2) * 111320 * 0.866
    dy = (y1 - y2) * 111320
    return (dx*dx + dy*dy)**0.5

ds_infra = ogr.Open('/workspace/data/raw/osm/infrastructure_merged.gpkg')
hospitals = []
for f in ds_infra.GetLayer():
    if f.GetField("healthcare") is not None or f.GetField("amenity") in ['hospital', 'clinic']:
        g = f.GetGeometryRef()
        if g: hospitals.append((f.GetField('name') or "Hospital", g.Centroid().GetX(), g.Centroid().GetY()))

def get_nearest(x, y):
    best, md = None, float('inf')
    for nid, (nx, ny) in node_coords.items():
        if nid not in graph: continue
        d = dist(x, y, nx, ny)
        if d < md: md, best = d, nid
    return best

dest_nodes = {}
for name, x, y in hospitals:
    nn = get_nearest(x, y)
    if nn: dest_nodes[nn] = {'name': name, 'x': x, 'y': y}

origin1 = get_nearest(78.48, 30.38) # Near dam
origin2 = get_nearest(78.47, 30.36) # Near downstream exposed area
origin3 = get_nearest(78.46, 30.35) 
origins = list(set([origin1, origin2, origin3]))

def time_aware_dijkstra(start_node, dest_set, start_t, hazard_aware=True, safety_buffer=600, speed_mps=8.33):
    pq = [(start_t, start_node, [])]
    visited = {}
    while pq:
        curr_t, u, path = heapq.heappop(pq)
        if u in dest_set: return curr_t, u, path
        if u in visited and visited[u] <= curr_t: continue
        visited[u] = curr_t
        for edge in graph.get(u, []):
            v = edge['v']
            next_t = curr_t + edge['length'] / speed_mps
            if hazard_aware:
                if edge['max_d'] > 0.5: continue
                if edge['arr_s'] <= next_t + safety_buffer: continue
            if next_t < visited.get(v, float('inf')):
                heapq.heappush(pq, (next_t, v, path + [edge]))
    return None, None, None

def export_route(path, out_file, props):
    fc = {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": json.loads(e['geom']), "properties": {"osmid": e['osmid'], "length": e['length'], "max_d": e['max_d'], "arr_s": e['arr_s']}} for e in path], "properties": props}
    with open(out_file, "w") as f: json.dump(fc, f)

summary = {"scenario_metadata": {"mission_start_time_s": 0, "safety_buffer_s": 600, "hazard_provenance": "LISFLOOD-FP V3"}, "routes": []}
for orig in origins:
    ox, oy = node_coords[orig]
    best_dest_sl = min(dest_nodes.keys(), key=lambda d: dist(ox, oy, dest_nodes[d]['x'], dest_nodes[d]['y']))
    n_time, n_dest, n_path = time_aware_dijkstra(orig, dest_nodes.keys(), 0, False)
    h_time, h_dest, h_path = time_aware_dijkstra(orig, dest_nodes.keys(), 0, True)
    
    margin = float('inf')
    hazard_edges = 0
    if n_path:
        curr_t = 0
        for edge in n_path:
            curr_t += edge['length']/8.33
            if edge['max_d'] > 0.5:
                hazard_edges += 1
                av_m = edge['arr_s'] - curr_t
                if av_m < margin: margin = av_m
                
    rs = "FEASIBLE_UNDER_CURRENT_SCENARIO"
    if n_path and margin < 600: rs = "ROUTE_NOT_FEASIBLE_UNDER_CURRENT_SCENARIO"
    
    summary["routes"].append({
        "origin": orig, "straight_line_nearest": dest_nodes[best_dest_sl]['name'], "reachable_nearest": dest_nodes[h_dest]['name'] if h_dest else None,
        "normal_route_dist_m": sum(e['length'] for e in n_path) if n_path else -1, "hazard_aware_route_dist_m": sum(e['length'] for e in h_path) if h_path else -1,
        "normal_ETA_s": n_time, "hazard_aware_ETA_s": h_time, "hazard_edges_avoided": hazard_edges, "minimum_operational_margin_s": margin, "route_status": rs
    })
    if n_path: export_route(n_path, out_dir + "/routes/normal_route.geojson", {"type": "normal"})
    if h_path: export_route(h_path, out_dir + "/routes/hazard_aware_route.geojson", {"type": "hazard_aware"})

with open(out_dir + "/summary/hadr_routing_summary.json", "w") as f: json.dump(summary, f, indent=2)

unavail = {0:0, 300:0, 600:0, 800:0}
for edge in edges_list:
    for t in unavail:
        if edge['max_d'] > 0.5 and edge['arr_s'] <= t: unavail[t] += 1

with open("/tmp/routing_metrics.json", "w") as f:
    json.dump({"unavail": unavail, "origins": origins, "dest_count": len(dest_nodes)}, f)
