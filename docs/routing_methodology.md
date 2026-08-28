# Routing Methodology

## Two Operational Missions

FloodLab implements two distinct routing missions for HADR operations:

### Mission A: Civilian Evacuation
**Route:** Village -> Safe Shelter / High Ground
**Question:** Can residents safely evacuate before flood waters arrive?

Algorithm:
1. Build flood arrival time map from Delft3D FM output
2. For each village, get flood_arrival_time T_flood (from arrival_time raster)
3. Compute travel time T_travel from village to nearest safe shelter via road graph
4. Compute lead time T_lead = T_flood - T_now
5. If T_travel * safety_factor <= T_lead: EVACUATION FEASIBLE -> compute safest route
   Else: EVACUATION CRITICAL -> flag for helicopter/boat rescue

Safe shelter candidates:
- Pre-designated government shelters (from OSM or supplied data)
- High-ground cells >= 2m above P90 flood envelope
- Ranked by: (reachable before flood) then by distance

### Mission B: NDRF Rescue
**Route:** NDRF Base -> Affected Settlement -> Safe Extraction
**Question:** Can rescue teams reach isolated settlements while roads are still passable?

Algorithm:
1. Start from NDRF base location (configurable per scenario)
2. Build time-dependent road graph: edge weights = travel_time if passable at query_time, else infinity
3. For each target settlement: compute Dijkstra shortest path with time-dependent costs
4. Rank settlements by rescue priority (see rescue_priority.py)

## Road Graph Construction

Data source: OpenStreetMap road network
Format: NetworkX MultiDiGraph

Edge attributes:
- road_class (motorway/trunk/primary/secondary/tertiary/residential/track/path)
- base_speed_kmh (from road class lookup table)
- flood_depth_m (sampled from depth raster at edge midpoint)
- flood_arrival_s (from arrival time raster)
- traversability_status (passable/uncertain/impassable - only assigned when agency thresholds configured)

## Vehicle-Class-Aware Routing

Road traversability classification is optional and depends on agency-configured thresholds.

When agency_thresholds are provided in configs/routing.yaml:
  passable_depth_threshold_m: 0.3  (example for standard vehicle)

Edge classification is applied and routing avoids impassable edges.

When passable_depth_threshold_m: null (default):
  Edge depth values are recorded but no binary passable/impassable classification is applied.
  Routing computes paths based on base travel times only.
  Users can inspect depth values per edge in the output.

This design prevents hardcoding vehicle capability assumptions without authoritative data.

## Time-Dependent Edge Cost

At query time T, edge cost = base_travel_time_s if flood_arrival_s > T else infinity

This models the progressive closure of roads as flood water advances.

## Flood Arrival Lookup

Flood arrival time raster (from Delft3D FM output):
- Grid cell value = time in seconds when depth first exceeds threshold (default 0.3 m)
- Sampled at each graph node (bilinear interpolation)
- Nodes outside flood domain: arrival_time = infinity (never flooded)
