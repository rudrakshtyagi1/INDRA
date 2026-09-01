import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Info } from 'lucide-react';
import L from 'leaflet';
import { createBasemapLayer } from '../utils/mapTiles';
import { RIVER_CENTERLINE, getFloodTimestepData } from '../data/prototype/tehriPrototypeFlood';
import { PROTOTYPE_SETTLEMENTS } from '../data/prototype/tehriPrototypeSettlements';
import { PROTOTYPE_METADATA } from '../data/prototype/tehriPrototypeRun';
import WeatherContextWidget from '../components/weather/WeatherContextWidget';
import ContextInspector from '../layout/ContextInspector';
import HydrographChart from '../components/charts/HydrographChart';

const SNAPSHOT_MIN = 60;

const FLOATING_METRICS = [
  {
    id: 'storage',
    label: 'Gross storage',
    value: '3.54 BCM',
    sub: 'Full Reservoir Level 830m MSL (Design Level)',
    provenance: 'REPORTED (CWC)',
    color: 'text-blue-400',
  },
  {
    id: 'qp',
    label: 'Peak outflow Qp',
    value: '84,200 m³/s',
    sub: 'Froehlich (2008) · Assumed FRL state',
    provenance: 'PRECOMPUTED PROTOTYPE',
    color: 'text-red-400',
  },
  {
    id: 'ingress',
    label: 'Earliest ingress',
    value: 'T+8 min',
    sub: 'Sirain Village (Km 4.2)',
    provenance: 'PRECOMPUTED PROTOTYPE',
    color: 'text-amber-400',
  },
];

export default function Overview({
  selectedPreset, simulationResult, onNavigate, onRunSimulation, isSimulating,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const meta = PROTOTYPE_METADATA;
  const breach = meta.breachMechanics;

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.22, 78.44],
      zoom: 10,
      zoomControl: false,
      attributionControl: true,
    });
    createBasemapLayer(map).addTo(map);
    mapInstanceRef.current = map;

    // River centerline
    L.polyline(RIVER_CENTERLINE.map((p) => [p.lat, p.lon]), {
      color: '#1e40af',
      weight: 3,
      opacity: 0.5,
    }).addTo(map);

    // Flood snapshot at T+60m
    const data = getFloodTimestepData(SNAPSHOT_MIN);
    if (data.shallowPolygon?.length > 2) {
      L.polygon(data.shallowPolygon, {
        color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.35, weight: 1.2,
      }).addTo(map);
    }
    if (data.moderatePolygon?.length > 2) {
      L.polygon(data.moderatePolygon, {
        color: '#60a5fa', fillColor: '#1d4ed8', fillOpacity: 0.55, weight: 1.5,
      }).addTo(map);
    }
    if (data.deepPolygon?.length > 2) {
      L.polygon(data.deepPolygon, {
        color: '#93c5fd', fillColor: '#1e3a8a', fillOpacity: 0.82, weight: 2.0,
      }).addTo(map);
    }

    // Dam marker
    const damIcon = L.divIcon({
      className: '',
      html: `<div style="background:rgba(7,11,18,0.92);border:1.5px solid rgba(59,130,246,0.7);
        border-radius:8px;padding:4px 9px;display:flex;align-items:center;gap:5px;
        box-shadow:0 0 14px rgba(59,130,246,0.25);white-space:nowrap">
        <span style="width:6px;height:6px;border-radius:50%;background:#3b82f6;display:inline-block;flex-shrink:0"></span>
        <span style="color:#93c5fd;font-size:10px;font-weight:700;font-family:monospace">Tehri Dam · 260.5m</span>
      </div>`,
      iconSize: [160, 22],
      iconAnchor: [80, 11],
    });
    L.marker([30.378, 78.481], { icon: damIcon }).addTo(map);

    // Settlement markers (key checkpoints only)
    const keySettlements = PROTOTYPE_SETTLEMENTS.filter((s) =>
      ['sirain', 'koteshwar', 'devprayag', 'rishikesh', 'haridwar'].includes(s.id)
    );
    keySettlements.forEach((st) => {
      const color = st.arrivalMin <= 18 ? '#ef4444' : st.arrivalMin <= 68 ? '#f59e0b' : '#3b82f6';
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:rgba(7,11,18,0.85);border:1px solid ${color}55;
          border-radius:5px;padding:2px 6px;display:flex;align-items:center;gap:3px;
          white-space:nowrap">
          <span style="width:4px;height:4px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
          <span style="color:#cbd5e1;font-size:9px;font-family:monospace">${st.name.split(' ')[0]} T+${st.arrivalMin}m</span>
        </div>`,
        iconSize: [120, 16],
        iconAnchor: [60, 8],
      });
      L.marker([st.lat, st.lon], { icon }).addTo(map);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="w-full h-full flex overflow-hidden bg-[var(--surface-0)]">
      {/* Map fills all space minus inspector */}
      <div className="flex-1 relative overflow-hidden min-w-0">
        <div ref={mapContainerRef} className="map-canvas" />

        {/* Floating metrics — bottom left */}
        <div className="absolute bottom-4 left-3 z-10 flex flex-col gap-2">
          {FLOATING_METRICS.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="floating-control px-3.5 py-2.5"
            >
              <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-0.5">
                {m.label}
              </p>
              <p className={`text-lg font-bold leading-none tracking-tight tabular-nums ${m.color}`}>
                {m.value}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-[var(--text-muted)]">{m.sub}</span>
                <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--surface-border)]">
                  {m.provenance}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Snapshot label */}
        <div className="absolute top-3 left-3 z-10">
          <span className="status-pill status-pill--prototype text-[9px]">
            Flood snapshot T+{SNAPSHOT_MIN}m · Prototype Fixture
          </span>
        </div>

        {/* Launch simulation CTA — floating bottom right of map */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          {!inspectorOpen && (
            <button
              onClick={() => setInspectorOpen(true)}
              className="floating-control px-3.5 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition flex items-center gap-2"
            >
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>Show Details</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('simulation')}
            className="
              flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-blue-600 hover:bg-blue-500
              text-white text-xs font-semibold
              transition shadow-lg shadow-blue-900/40
            "
          >
            <span>Launch Simulation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Context Inspector */}
      <ContextInspector
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        title="Scenario Overview"
      >
        <div className="p-4 space-y-1.5 border-b border-[var(--surface-border)]">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
            Tehri Dam · Bhagirathi Corridor
          </p>
          {[
            ['Dam Type', 'Zoned Earth & Rockfill'],
            ['Dam Height', '260.5 m (REPORTED)'],
            ['Gross Storage', '3.54 BCM (REPORTED)'],
            ['Hydraulic Head', '260.0 m (REPORTED)'],
            ['Corridor Reach', '0 – 100 km Bhagirathi River'],
            ['Pipeline Model', 'DualSPHysics → Q(t) → Delft3D FM'],
          ].map(([l, v]) => (
            <div key={l} className="inspector-row">
              <span className="inspector-row__label">{l}</span>
              <span className="inspector-row__value text-xs">{v}</span>
            </div>
          ))}
        </div>

        {/* System & External Services Status */}
        <div className="p-4 border-b border-[var(--surface-border)]">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
            External Service Status
          </p>
          {[
            { label: 'CARTO Basemap', status: 'CONNECTED', color: 'text-emerald-400' },
            { label: 'Cesium Ion (3D)', status: 'CONNECTED', color: 'text-emerald-400' },
            { label: 'NASA Earthdata (GPM)', status: 'AUTH READY', color: 'text-emerald-400' },
            { label: 'Google Earth Engine', status: 'NOT CONNECTED', color: 'text-[var(--text-muted)]' },
            { label: 'Copernicus Data Space', status: 'NOT CONFIGURED', color: 'text-[var(--text-muted)]' },
          ].map(({ label, status, color }) => (
            <div key={label} className="inspector-row">
              <span className="inspector-row__label">{label}</span>
              <span className={`text-xs font-mono font-bold ${color}`}>{status}</span>
            </div>
          ))}
        </div>

        {/* Weather context */}
        <div className="p-4 border-b border-[var(--surface-border)]">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
            Regional Meteorological Context
          </p>
          <WeatherContextWidget compact />
        </div>

        {/* Q(t) preview */}
        <div className="p-4 border-b border-[var(--surface-border)] space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            Hydrograph Q(t) Outflow
          </p>
          <div className="h-32">
            <HydrographChart
              times={breach.hydrographTimesHrs}
              flows={breach.hydrographFlowsM3s}
              currentTimeHrs={breach.timeToPeakHrs}
              peakDischarge={breach.peakDischargeM3s}
              timeToPeakHrs={breach.timeToPeakHrs}
            />
          </div>
        </div>

        {/* Run CTA */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => { onRunSimulation?.(); onNavigate('simulation'); }}
            disabled={isSimulating}
            className="
              w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
              text-white text-xs font-semibold
              transition flex items-center justify-center gap-2
              disabled:opacity-50 shadow-md shadow-blue-900/30
            "
          >
            <span>Execute Hydrodynamic Simulation</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
            Precomputed benchmark scenario for planning visualization.
          </p>
        </div>
      </ContextInspector>
    </div>
  );
}
