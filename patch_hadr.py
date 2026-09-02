import re

with open("frontend/src/pages/HADRDashboard.jsx", "r") as f:
    content = f.read()

# Let's completely replace the stats assignment.
old_stats = """  const stats = v3.v3Routes || {
     normal_route: { distance_km: 0, eta_min: 0, hazard_conflict_edges: 2, status: 'NOT FEASIBLE AGAINST KNOWN MODELLED HAZARD' },
     hazard_aware_route: { distance_km: 0, eta_min: 0, hazard_conflict_edges: 0, status: 'AVOIDS CURRENTLY MODELLED HAZARD SEGMENTS', extra_distance_km: 10.32 }
  };"""

new_stats = """  let stats = {
     normal_route: { distance_km: 0, eta_min: 0, hazard_conflict_edges: 2, status: 'NOT FEASIBLE AGAINST KNOWN MODELLED HAZARD' },
     hazard_aware_route: { distance_km: 0, eta_min: 0, hazard_conflict_edges: 0, status: 'AVOIDS CURRENTLY MODELLED HAZARD SEGMENTS', extra_distance_km: 10.32 }
  };
  
  if (v3.v3Routes && v3.v3Routes.routes && v3.v3Routes.routes.length > 0) {
      // Use the first valid route or specific one for the dashboard
      const r = v3.v3Routes.routes[1] || v3.v3Routes.routes[0];
      stats.normal_route.distance_km = (r.normal_route_dist_m || 0) / 1000;
      stats.hazard_aware_route.distance_km = (r.hazard_aware_route_dist_m || 0) / 1000;
      stats.normal_route.hazard_conflict_edges = r.hazard_edges_avoided || 2;
      stats.hazard_aware_route.extra_distance_km = stats.hazard_aware_route.distance_km - stats.normal_route.distance_km;
      
      if (stats.hazard_aware_route.extra_distance_km < 0) stats.hazard_aware_route.extra_distance_km = 0;
  }
"""

content = content.replace(old_stats, new_stats)

with open("frontend/src/pages/HADRDashboard.jsx", "w") as f:
    f.write(content)

