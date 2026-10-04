from osgeo import ogr
import json

ds = ogr.Open('/workspace/data/raw/osm/road_network_merged_v2.gpkg')
edges_layer = ds.GetLayerByName('edges')
graph = {}
for feat in edges_layer:
    u = int(feat.GetField('u'))
    v = int(feat.GetField('v'))
    if u not in graph: graph[u] = []
    if v not in graph: graph[v] = []
    graph[u].append(v)
    graph[v].append(u)

visited = set()
ccs = []
for node in graph:
    if node not in visited:
        comp = []
        stack = [node]
        while stack:
            curr = stack.pop()
            if curr not in visited:
                visited.add(curr)
                comp.append(curr)
                stack.extend(graph.get(curr, []))
        ccs.append(comp)

ccs.sort(key=len, reverse=True)
print("Top 5 connected component sizes:", [len(c) for c in ccs[:5]])
largest_cc = set(ccs[0])

# Find hospitals in largest_cc
ds_infra = ogr.Open('/workspace/data/raw/osm/infrastructure_merged.gpkg')
hospitals = []
for feat in ds_infra.GetLayer():
    if feat.GetField("healthcare") is not None or feat.GetField("amenity") in ['hospital', 'clinic']:
        geom = feat.GetGeometryRef()
        if geom: hospitals.append((feat.GetField('name'), geom.Centroid().GetX(), geom.Centroid().GetY()))

nodes_layer = ds.GetLayerByName('nodes')
node_coords = {}
for feat in nodes_layer:
    nid = int(feat.GetField('osmid'))
    geom = feat.GetGeometryRef()
    if geom: node_coords[nid] = (geom.GetX(), geom.GetY())

def dist(x1, y1, x2, y2):
    dx = (x1 - x2) * 111320 * 0.866
    dy = (y1 - y2) * 111320
    return (dx*dx + dy*dy)**0.5

def get_nearest(x, y, valid_nodes):
    min_d, best = float('inf'), None
    for nid in valid_nodes:
        nx, ny = node_coords[nid]
        d = dist(x, y, nx, ny)
        if d < min_d: min_d, best = d, nid
    return best

dest_nodes = {}
for name, x, y in hospitals:
    nn = get_nearest(x, y, largest_cc)
    if nn: dest_nodes[nn] = name

# Pick an origin in largest_cc near the dam (78.48, 30.38)
origin = get_nearest(78.48, 30.38, largest_cc)
print("Origin in largest CC:", origin, "Distance from dam:", dist(78.48, 30.38, node_coords[origin][0], node_coords[origin][1]))
print("Hospital dests in largest CC:", len(dest_nodes))
