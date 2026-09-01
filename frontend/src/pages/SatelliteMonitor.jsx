import React from 'react';
import {
  Satellite,
  Radio,
  Layers,
  AlertTriangle,
  Database,
  ExternalLink,
  Cpu,
  Info,
} from 'lucide-react';
import { SERVICES_CONFIG } from '../config/services';

export default function SatelliteMonitor() {
  const geeConfigured = false;
  const copernicusConfigured = false;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[var(--surface-0)]">
      {/* Label bar */}
      <div className="h-9 px-5 flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface-1)] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
            Sentinel-1 SAR · Radar Inundation Surveillance
          </span>
          <span className="status-pill status-pill--running">
            Earth Engine Disconnected · Standby
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">
            GEE: NOT CONNECTED · COPERNICUS: NOT CONFIGURED
          </span>
        </div>
      </div>

      {/* Professional Empty State / Pipeline Architecture Console */}
      <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
        <div className="max-w-3xl w-full flex flex-col gap-6">

          {/* Standby Status Banner */}
          <div className="p-6 rounded-2xl bg-[var(--surface-2)] border border-[var(--surface-border)] flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Satellite className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Satellite Earth Observation Ingestion Standby
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Live radar satellite acquisitions require authentication with Google Earth Engine (<code className="text-blue-300 font-mono text-[11px]">GEE_PROJECT_ID</code>) or Copernicus Data Space Ecosystem (<code className="text-blue-300 font-mono text-[11px]">COPERNICUS_CLIENT_ID</code>). Synthetic backscatter drawings have been suppressed to preserve scientific integrity.
              </p>
            </div>
          </div>

          {/* Planned Ingestion & SAR Processing Pipeline */}
          <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--surface-border)] space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
                Planned SAR Processing Pipeline Architecture
              </p>
              <span className="text-[8px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                PIPELINE SPECIFICATION
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                {
                  step: '01',
                  title: 'Data Ingestion',
                  detail: 'Sentinel-1 C-SAR GRD (IW Mode, 10m spatial resolution, VV+VH).',
                },
                {
                  step: '02',
                  title: 'Radiometric Calibration',
                  detail: 'Terrain correction using CartoDEM 10m + Lee speckle filtering.',
                },
                {
                  step: '03',
                  title: 'Change Detection',
                  detail: 'Adaptive scene-specific threshold determined during processing (e.g. Otsu bitemporal log-ratio calibration).',
                },
                {
                  step: '04',
                  title: 'Polygon Vectorization',
                  detail: 'Excision of permanent water bodies → Inundation GeoJSON export.',
                },
              ].map(({ step, title, detail }) => (
                <div key={step} className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--surface-border)] space-y-1">
                  <span className="text-[9px] font-mono font-bold text-blue-400">{step}</span>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">{title}</h4>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Monitored Geographical Corridor Specs */}
          <div className="p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--surface-border)] flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
                Designated AOI Bounding Box
              </p>
              <p className="text-xs font-mono font-bold text-[var(--text-primary)] mt-0.5">
                Tehri Catchment & Bhagirathi Valley: [78.30°E, 30.25°N] to [78.85°E, 30.70°N]
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
                Observation Status
              </p>
              <p className="text-xs font-mono font-bold text-[var(--text-muted)] mt-0.5">
                DATA UNAVAILABLE (Awaiting GEE / Copernicus Credentials)
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Footer provenance notice */}
      <div className="h-10 px-5 flex items-center justify-between border-t border-[var(--surface-border)] bg-[var(--surface-1)] shrink-0">
        <span className="text-[9px] font-mono text-[var(--text-muted)]">
          FloodLab Earth Observation System · Provenance: DATA UNAVAILABLE / PIPELINE STANDBY
        </span>
        <span className="text-[9px] font-mono text-[var(--text-muted)]">
          No synthetic SAR backscatter rendered
        </span>
      </div>
    </div>
  );
}
