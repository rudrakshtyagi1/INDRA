import { fetchJson } from './api';

export async function runSimulation(payload) {
  return fetchJson('/api/simulations/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getSimulation(runId) {
  return fetchJson(`/api/simulations/${runId}`);
}

export async function getSimulationStatus(runId) {
  return fetchJson(`/api/simulations/${runId}/status`);
}

export async function listPresets() {
  return fetchJson('/api/scenarios/presets');
}

export async function getSatelliteAlerts() {
  return fetchJson('/api/satellite/alerts');
}
