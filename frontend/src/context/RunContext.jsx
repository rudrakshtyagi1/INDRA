import React, { createContext, useContext, useState, useEffect } from 'react';

const RUN_CATALOG = {
  v4_extended: {
    run_id: 'v4_extended',
    scenario_id: 'TEHRI_V3_BENCHMARK',
    name: 'TEHRI V4 EXTENDED',
    fullName: 'Tehri V4 Extended Benchmark (3600s, 30 km)',
    shortName: 'V4 (3600s)',
    status: 'COMPLETED',
    qa_status: 'QA PASS',
    qa_details: '0.00023% mass conservation error',
    provenance: 'MODELLED LISFLOOD-FP 8.1 CORRECTED V4 3600S',
    warning: 'WHAT-IF EMERGENCY-PLANNING BENCHMARK — PHYSICAL VALIDATION: NOT AVAILABLE',
    simulation_window_s: 3600,
    domain_km: 30,
    grid_resolution_m: 30,
    near_field_solver: 'DualSPHysics 5.4 CPU',
    far_field_solver: 'LISFLOOD-FP 8.1',
    coupled_peak_q_m3s: 300000,
    coupled_peak_q_label: 'DUALSPHYSICS-DERIVED / FROUDE BACK-SCALED COUPLING BOUNDARY PEAK Q',
    max_depth_m: 431.41,
    max_depth_label: 'NUMERICAL BENCHMARK MAXIMUM — NOT PHYSICALLY VALIDATED',
    mass_balance_error_pct: 0.00023,
    // Verified Exposure metrics
    road_exposed_km: 60.819,
    road_segments_intersected: 74,
    settlements_intersected: 0,
    healthcare_intersected: 0,
    bridges_intersected: 0,
    power_intersected: 0,
    earliest_road_exposure_s: 120,
    // Verified HADR metrics
    normal_route_dist_km: 132.363,
    normal_route_hazard_edges: 6,
    normal_route_status: 'NOT FEASIBLE AGAINST CURRENT MODELLED HAZARD',
    hazard_aware_route_dist_km: null,
    hazard_aware_route_status: 'ROUTE NOT FEASIBLE UNDER CURRENT SCENARIO',
    // Frames
    frames_count: 61,
    frames_interval_s: 60,
    // Domain Bounds in Leaflet [[south, west], [north, east]]
    domain_bounds: [
      [30.1217, 78.45009],
      [30.39414, 78.56068],
    ],
    // URLs
    inundation_geojson_url: '/api/runs/v4_extended/exports/inundation_extent?format=geojson',
    max_depth_tif_url: '/api/runs/v4_extended/exports/max_depth?format=geotiff',
    normal_route_geojson_url: '/api/runs/v4_extended/exports/normal_route?format=geojson',
    hazard_aware_route_geojson_url: null,
    exposed_roads_geojson_url: '/api/runs/v4_extended/exports/exposed_roads?format=geojson',
  },
  v3_benchmark: {
    run_id: 'v3_benchmark',
    scenario_id: 'TEHRI_V3_BENCHMARK',
    name: 'TEHRI V3 BENCHMARK',
    fullName: 'Tehri V3 Prototype Benchmark (800s, 15 km)',
    shortName: 'V3 (800s)',
    status: 'COMPLETED',
    qa_status: 'QA PASS',
    qa_details: 'Verified prototype benchmark',
    provenance: 'PRECOMPUTED VERIFIED PROTOTYPE RESULT',
    warning: 'WHAT-IF EMERGENCY-PLANNING BENCHMARK — PHYSICAL VALIDATION: NOT AVAILABLE',
    simulation_window_s: 800,
    domain_km: 15,
    grid_resolution_m: 30,
    near_field_solver: 'DualSPHysics 5.4 CPU',
    far_field_solver: 'LISFLOOD-FP 8.1',
    coupled_peak_q_m3s: 300000,
    coupled_peak_q_label: 'DUALSPHYSICS-DERIVED / FROUDE BACK-SCALED COUPLING BOUNDARY PEAK Q',
    max_depth_m: 27.2,
    max_depth_label: 'LISFLOOD-FP numerical prototype output',
    mass_balance_error_pct: null,
    // Verified Exposure metrics
    road_exposed_km: 38.788,
    road_segments_intersected: 52,
    settlements_intersected: 0,
    healthcare_intersected: 0,
    bridges_intersected: 0,
    power_intersected: 0,
    earliest_road_exposure_s: 101,
    // Verified HADR metrics
    normal_route_dist_km: 133.61,
    normal_route_hazard_edges: 2,
    normal_route_status: 'NOT FEASIBLE AGAINST MODELLED HAZARD',
    hazard_aware_route_dist_km: 143.93,
    hazard_aware_detour_km: 10.32,
    hazard_aware_route_status: 'AVOIDS CURRENTLY MODELLED HAZARD SEGMENTS',
    // Frames
    frames_count: 17,
    frames_interval_s: 50,
    // Domain Bounds in Leaflet [[south, west], [north, east]]
    domain_bounds: [
      [30.25693, 78.45009],
      [30.39414, 78.55734],
    ],
    // URLs
    inundation_geojson_url: '/api/scenarios/v3/hazard',
    max_depth_tif_url: '/data/processed/tehri_simulations/lisflood_fp/outputs/v3_geometry_corrected/rasters/max_depth_v3.tif',
    normal_route_geojson_url: '/api/scenarios/v3/hadr/route/normal',
    hazard_aware_route_geojson_url: '/api/scenarios/v3/hadr/route/hazard_aware',
    exposed_roads_geojson_url: '/api/scenarios/v3/exposure/roads',
  },
};

const RunContext = createContext(null);

export function RunProvider({ children }) {
  // Defaults to TEHRI V4 EXTENDED BENCHMARK
  const [selectedRunId, setSelectedRunId] = useState('v4_extended');
  const [simTimeSec, setSimTimeSec] = useState(0);
  const [customRuns, setCustomRuns] = useState({});

  useEffect(() => {
    fetch('/api/scenarios/TEHRI_V3_BENCHMARK/runs')
      .then((res) => (res.ok ? res.json() : []))
      .then((runs) => {
        const custom = {};
        runs.forEach((r) => {
          if (r.run_id !== 'v4_extended' && r.run_id !== 'v3_benchmark') {
            custom[r.run_id] = {
              run_id: r.run_id,
              scenario_id: r.scenario_id,
              name: `SCENARIO // ${r.run_id.toUpperCase()}`,
              fullName: `Custom Scenario Run: ${r.run_id}`,
              shortName: r.run_id,
              status: r.status,
              qa_status: r.qa_status || 'READY',
              qa_details: 'Custom Run',
              provenance: 'USER_GENERATED_RUN',
              warning: 'WHAT-IF SCENARIO RUN',
              simulation_window_s: r.solver_configuration?.duration || 3600,
              domain_km: 30,
              grid_resolution_m: 30,
              near_field_solver: r.solver_configuration?.near_field_solver || 'DualSPHysics',
              far_field_solver: r.solver_configuration?.far_field_solver || 'LISFLOOD-FP',
              coupled_peak_q_m3s: 300000,
              coupled_peak_q_label: 'Coupling Hydrograph',
              max_depth_m: null,
              road_exposed_km: null,
              road_segments_intersected: null,
              settlements_intersected: 0,
              healthcare_intersected: 0,
              bridges_intersected: 0,
              power_intersected: 0,
              frames_count: 0,
              frames_interval_s: 60,
              domain_bounds: [
                [30.1217, 78.45009],
                [30.39414, 78.56068],
              ],
            };
          }
        });
        setCustomRuns(custom);
      })
      .catch(() => {});
  }, []);

  const allRuns = { ...RUN_CATALOG, ...customRuns };
  const currentRun = allRuns[selectedRunId] || RUN_CATALOG.v4_extended;

  // Format telemetry timestamp: T+HH:MM:SS
  const hrs = Math.floor(simTimeSec / 3600);
  const mins = Math.floor((simTimeSec % 3600) / 60);
  const secs = simTimeSec % 60;
  const timeFormatted = `T+${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <RunContext.Provider
      value={{
        selectedRunId,
        setSelectedRunId,
        currentRun,
        allRuns,
        runCatalog: RUN_CATALOG,
        simTimeSec,
        setSimTimeSec,
        timeFormatted,
      }}
    >
      {children}
    </RunContext.Provider>
  );
}

export function useRun() {
  const context = useContext(RunContext);
  if (!context) {
    throw new Error('useRun must be used within a RunProvider');
  }
  return context;
}
