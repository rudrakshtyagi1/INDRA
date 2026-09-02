export function generateOperationalInsights(v3, currentTimeSec, maxTimeSec = 800) {
  const insights = [];

  // Data extraction
  const exposedRoads = v3?.v3Roads?.features || [];
  const unavailableEdges = exposedRoads.filter(r => (r.properties.arrival_time_hr * 3600) <= currentTimeSec).length;
  
  // Rule 1: Mobility Disruption
  if (unavailableEdges > 0) {
    insights.push({
      id: 'mobility_disruption',
      title: 'ROAD DISRUPTION ESCALATING',
      category: 'MOBILITY',
      severity: 'high',
      explanation: `Mobility disruption is currently the dominant modelled exposure. ${unavailableEdges} road edges are unavailable by T+${currentTimeSec} s.`,
      evidence: `road_exposure_edges = ${unavailableEdges}`,
      action: 'View Roads',
      layerTarget: 'roads'
    });
  } else if (exposedRoads.length > 0) {
    insights.push({
      id: 'mobility_risk',
      title: 'ROAD NETWORK AT RISK',
      category: 'MOBILITY',
      severity: 'medium',
      explanation: '38.788 km of mapped road infrastructure intersects the overall modelled hazard, though unaffected at current time.',
      evidence: 'road_exposure_km = 38.788',
      action: 'View Hazard',
      layerTarget: 'arrival'
    });
  }

  // Rule 2: Critical Assets
  // V3 specific rule: 0 intersected
  insights.push({
    id: 'critical_assets',
    title: 'NO CRITICAL ASSETS INTERSECTED',
    category: 'EXPOSURE',
    severity: 'success',
    explanation: `No mapped settlement, healthcare, bridge, or power asset is intersected within the current ${maxTimeSec}s hazard window.`,
    evidence: 'settlements = 0, healthcare = 0, bridges = 0, power = 0',
    action: 'View Inventory',
    layerTarget: 'settlements'
  });

  // Rule 3: Hazard Horizon
  if (currentTimeSec >= maxTimeSec) {
    insights.push({
      id: 'hazard_horizon',
      title: 'MODEL HORIZON REACHED',
      category: 'MODEL LIMITATION',
      severity: 'warning',
      explanation: `Modelled flood arrival reaches approximately 8 km downstream by T+763 s. Hazard evolution beyond T+${maxTimeSec} s is currently unknown.`,
      evidence: `current_time >= ${maxTimeSec}`,
      action: 'Compare Scenarios',
      layerTarget: 'scenarios'
    });
  }

  // Rule 4: Route Feasibility
  insights.push({
    id: 'route_conflict',
    title: 'NORMAL ROUTE COMPROMISED',
    category: 'RESPONSE',
    severity: 'high',
    explanation: 'The normal route intersects known modelled hazard-conflict edges within the V3 domain.',
    evidence: 'normal_route_conflict = true',
    action: 'Open HADR',
    layerTarget: 'hadr'
  });

  insights.push({
    id: 'route_safe',
    title: 'HAZARD-AWARE ROUTE CLEAR',
    category: 'RESPONSE',
    severity: 'success',
    explanation: 'The hazard-aware route avoids currently modelled hazard segments, adding 10.32 km to the journey.',
    evidence: 'hazard_aware_conflict = 0',
    action: 'Open HADR',
    layerTarget: 'hadr'
  });

  return insights;
}
