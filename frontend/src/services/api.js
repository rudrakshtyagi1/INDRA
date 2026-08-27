/**
 * HydroBreach Frontend API Client
 * Interfaces with FastAPI hydrodynamic simulation backend.
 */

const API_BASE = '/api';

export const api = {
  // Preset Scenarios
  getPresets: async () => {
    const res = await fetch(`${API_BASE}/scenarios/presets`);
    if (!res.ok) throw new Error('Failed to fetch presets');
    return res.json();
  },

  getPresetById: async (id) => {
    const res = await fetch(`${API_BASE}/scenarios/presets/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch preset ${id}`);
    return res.json();
  },

  // Calculate Breach Mechanics
  calculateBreach: async (params) => {
    const res = await fetch(`${API_BASE}/scenarios/calculate-breach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to calculate breach parameters');
    return res.json();
  },

  // DEM Profiles
  getDemProfile: async (reachLengthKm = 25.0, upstreamElev = 2200.0, downstreamElev = 1100.0) => {
    const res = await fetch(
      `${API_BASE}/scenarios/dem-profile?reach_length_km=${reachLengthKm}&upstream_elev_m=${upstreamElev}&downstream_elev_m=${downstreamElev}`
    );
    if (!res.ok) throw new Error('Failed to fetch DEM profile');
    return res.json();
  },

  // Run Hydrodynamic Simulation (SPH, Delft3D, or Dual)
  runSimulation: async (payload) => {
    const res = await fetch(`${API_BASE}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Simulation failed to start');
    return res.json();
  },

  getSimulationRun: async (runId) => {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}`);
    if (!res.ok) throw new Error(`Failed to fetch run ${runId}`);
    return res.json();
  },

  // Loss & Damage Evaluation
  evaluateDamage: async (payload) => {
    const res = await fetch(`${API_BASE}/damage/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to evaluate damage');
    return res.json();
  },

  // GEE Sentinel-1 SAR Alerts & Surveillance
  getGEEAlerts: async () => {
    const res = await fetch(`${API_BASE}/gee/alerts`);
    if (!res.ok) throw new Error('Failed to fetch GEE alerts');
    return res.json();
  },

  getGEEZones: async () => {
    const res = await fetch(`${API_BASE}/gee/zones`);
    if (!res.ok) throw new Error('Failed to fetch GEE surveillance zones');
    return res.json();
  },

  runSARAnalysis: async (bbox, preDate, postDate, polarization = 'VV') => {
    const res = await fetch(`${API_BASE}/gee/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bbox,
        pre_event_date: preDate,
        post_event_date: postDate,
        polarization,
      }),
    });
    if (!res.ok) throw new Error('SAR analysis failed');
    return res.json();
  },

  // Export URLs / Triggers
  exportGeoJSON: async (payload) => {
    const res = await fetch(`${API_BASE}/export/geojson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  downloadKML: async (payload) => {
    const res = await fetch(`${API_BASE}/export/kml`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payload.scenario_name || 'HydroBreach'}_inundation.kml`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadShapefile: async (payload) => {
    const res = await fetch(`${API_BASE}/export/shapefile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payload.scenario_name || 'HydroBreach'}_shapefile.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadCSVReport: async (payload) => {
    const res = await fetch(`${API_BASE}/export/report-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payload.scenario_name || 'HydroBreach'}_HADR_Report.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadDelft3DFiles: async (payload) => {
    const res = await fetch(`${API_BASE}/export/delft3d-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payload.scenario_name || 'HydroBreach'}_delft3d_fm.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // Hydrology & Catchment Runoff (SCS-CN)
  calculateHydrology: async (params) => {
    const res = await fetch(`${API_BASE}/hydrology/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to calculate SCS-CN hydrology');
    return res.json();
  },

  // Uncertainty & Sensitivity Ensemble
  runUncertaintyEnsemble: async (params) => {
    const res = await fetch(`${API_BASE}/uncertainty/run-ensemble`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to run uncertainty ensemble');
    return res.json();
  },
};
