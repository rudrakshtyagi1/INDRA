# API Contracts

## Base URL

Development: http://localhost:8000
All endpoints prefixed with /api/

## Authentication

MVP: no authentication (open). Production: JWT Bearer token via /api/auth/token.

## Endpoints

### Dams

GET /api/dams
  Response: [{id, name, river, state, lat, lon, dam_height_m, dam_type}]

GET /api/dams/{id}
  Response: {id, name, river, state, lat, lon, structural_specs, provenance_map}

POST /api/dams
  Body: {name, river, state, lat, lon, dam_height_m, reservoir_volume_m3, ...}
  Response: {id, created: true}

### Scenarios

GET /api/scenarios
  Response: [{id, name, dam_name, is_hypothetical, observation_validation_status}]

GET /api/scenarios/presets
  Response: list from configs/scenarios/*.yaml

POST /api/scenarios
  Body: {name, dam_id, config_json}
  Response: {id, created: true}

### Hydrology

POST /api/hydrology/calculate
  Body: {catchment_area_km2, curve_number_cn, rainfall_24h_mm, time_of_concentration_hrs}
  Response: {runoff_depth_mm, peak_inflow_m3s, time_series_hrs, inflow_hydrograph_m3s, provenance}

### Simulations

POST /api/simulations/run
  Body: {scenario_id, solver_type, breach_model, custom_params (optional)}
  Response: {run_id, status: "PENDING", message: "Simulation queued"}

GET /api/simulations/{run_id}
  Response: {run_id, status, breach_result, sph_summary, coupling_summary, delft3d_summary, damage, manifest_path}

GET /api/simulations/{run_id}/status
  Response: {run_id, status, progress_pct, message, elapsed_s}

GET /api/simulations
  Query: ?limit=10&offset=0
  Response: [{run_id, scenario_id, status, created_at, solver_type}]

### Uncertainty

POST /api/uncertainty/run
  Body: {scenario_id, ensemble_size, param_variations (optional)}
  Response: {run_id, status, message}

GET /api/uncertainty/{run_id}
  Response: {run_id, ensemble_size, station_results: {station_id: {p10, p50, p90}}, sensitivity_rankings}

### Satellite

GET /api/satellite/alerts
  Response: [{zone_id, zone_name, alert_level, detected_area_ha, estimated_volume_m3, acquisition_date, provenance: "OBSERVED"}]

POST /api/satellite/analyse
  Body: {bbox: [min_lon, min_lat, max_lon, max_lat], pre_date, post_date, polarization}
  Response: {detected_water_area_ha, estimated_volume_m3, otsu_threshold_dB, provenance: "OBSERVED"}

### Exposure

POST /api/exposure/evaluate
  Body: {run_id}
  Response: {population_at_risk, displaced, buildings_destroyed, buildings_submerged, agricultural_ha, economic_loss_crores_inr, village_priority_list}

### Routing

POST /api/routing/evacuate
  Body: {run_id, village_coords, shelter_locations (optional)}
  Response: [{origin, destination, path_coords, travel_time_min, lead_time_available_min, status}]

POST /api/routing/rescue
  Body: {run_id, ndrf_base_coords, target_settlements, agency_thresholds (optional)}
  Response: [{ndrf_base, target, path_coords, travel_time_min, traversability_issues}]

### Validation

POST /api/validation/verify
  Body: {run_id}
  Response: {mass_conservation, ritter_comparison, passed}

POST /api/validation/compare
  Body: {run_id}
  Response: {extent_csi, extent_pod, extent_far, depth_rmse, depth_mae, hydrograph_metrics}

POST /api/validation/observe
  Body: {run_id, event_id (optional)}
  Response: {available, metrics (if available), reason (if not available)}

### Jobs

GET /api/jobs/{job_id}
  Response: {job_id, status, progress_pct, result_url, error}

### Export

GET /api/export/{run_id}/geojson
GET /api/export/{run_id}/shapefile
GET /api/export/{run_id}/kml
GET /api/export/{run_id}/csv
GET /api/export/{run_id}/manifest
  Returns: file download or {path: "..."}
