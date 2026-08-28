import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  ShieldAlert,
  Waves,
  TrendingUp,
  MapPin,
  Clock,
  Play,
  ArrowRight,
  Activity,
  Layers,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import HydrographChart from '../components/charts/HydrographChart';
import ArrivalTimelineChart from '../components/charts/ArrivalTimelineChart';
import { RIVER_CORRIDOR_COORDS, CORRIDOR_STATIONS } from '../components/map/GeospatialSimulationMap';
import { createBasemapLayer } from '../../src/utils/mapTiles';
import { formatFinite } from '../utils/units';

export default function Overview({
  selectedPreset,
  simulationResult,
  onNavigate,
  onRunSimulation,
  isSimulating,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const damName = selectedPreset?.dam_name || 'Tehri Dam';
  const riverName = selectedPreset?.river || 'Bhagirathi River';
  const grossStorageM3 = selectedPreset?.reservoir_volume_m3 || 3.54e9;

  const breach = simulationResult?.breach_mechanics || {};
  const peakFlow = breach.peak_discharge_m3s || 84200.0;
  const hydroTimes = breach.hydrograph_times || [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0];
  const hydroFlows = breach.hydrograph_flows || [0, 12000, 48000, 84200, 62000, 38000, 21000, 8500, 2400, 500];

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.220, 78.420],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
    });

    createBasemapLayer(map).addTo(map);
    mapInstanceRef.current = map;

    // River Corridor Polyline
    L.polyline(RIVER_CORRIDOR_COORDS, {
      color: '#0284c7',
      weight: 3.5,
      opacity: 0.8,
    }).addTo(map);

    // Tehri Dam Near-Field Domain (0–2km Circle)
    L.circle([30.378, 78.481], {
      radius: 2000,
      color: '#06b6d4',
      fillColor: '#06b6d4',
      fillOpacity: 0.3,
      weight: 2,
    }).addTo(map);

    // Inundation Footprint Contour
    const leftCoords = RIVER_CORRIDOR_COORDS.map(([lat, lon], idx) => {
      const offset = 0.005 + (idx / RIVER_CORRIDOR_COORDS.length) * 0.008;
      return [lat + offset, lon - offset];
    });
    const rightCoords = RIVER_CORRIDOR_COORDS.slice().reverse().map(([lat, lon], idx) => {
      const offset = 0.005 + (idx / RIVER_CORRIDOR_COORDS.length) * 0.008;
      return [lat - offset, lon + offset];
    });
    L.polygon([...leftCoords, ...rightCoords], {
      color: '#38bdf8',
      fillColor: '#0284c7',
      fillOpacity: 0.4,
      weight: 1.5,
    }).addTo(map);

    // Add Checkpoint Markers
    CORRIDOR_STATIONS.forEach((st) => {
      const icon = L.divIcon({
        className: 'overview-station-icon',
        html: `
          <div style="
            background: rgba(15, 23, 42, 0.95);
            border: 1.5px solid #06b6d4;
            border-radius: 9999px;
            padding: 2px 6px;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          ">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #06b6d4; display: inline-block;"></span>
            <span style="color: #f8fafc; font-size: 9px; font-weight: 700; font-family: monospace; white-space: nowrap;">${st.name}</span>
          </div>
        `,
        iconSize: [110, 20],
        iconAnchor: [55, 10],
      });

      L.marker([st.lat, st.lon], { icon }).addTo(map);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        category="DISASTER MANAGEMENT COMMAND CENTER &bull; HIMALAYAN BASIN"
        title={`${damName} Hydrodynamic Breach Overview`}
        subtitle={`${riverName} gorge flood routing to Koteshwar, Devprayag, Rishikesh, and Haridwar.`}
        status="COMPLETED"
        statusLabel="HYDRODYNAMIC MODEL READY"
        actions={
          <button
            onClick={() => onNavigate('simulation')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20"
          >
            <span>Launch Simulation Lab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />

      {/* Top 4 Key Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Reservoir Storage (Vw)"
          value={formatFinite(grossStorageM3 / 1e9, 2)}
          unit="BCM"
          subtitle="Full Reservoir Level: 830m MSL"
          provenance="REPORTED"
          accentColor="cyan"
          icon={Waves}
        />
        <MetricCard
          title="Peak Outflow (Qp)"
          value={formatFinite(peakFlow, 0)}
          unit="m³/s"
          subtitle="Dam-Breach Hydrodynamic Wave"
          provenance="MODELLED"
          accentColor="red"
          icon={TrendingUp}
        />
        <MetricCard
          title="Downstream Corridor"
          value="100 km"
          subtitle="Reach from Dam Axis to Haridwar"
          provenance="OBSERVED"
          accentColor="slate"
          icon={MapPin}
        />
        <MetricCard
          title="Earliest Local Ingress"
          value="T+8 min"
          subtitle="Sirain Village (4.2 km downstream)"
          provenance="MODELLED"
          accentColor="amber"
          icon={Clock}
        />
      </div>

      {/* Main Geographic Leaflet Map */}
      <div className="relative w-full h-[440px] rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

        <div className="absolute top-4 right-4 z-10 bg-slate-950/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-cyan-400 shadow-lg">
          MODELLED / DYNAMIC WAVE MESH
        </div>
      </div>

      {/* Bottom 2 Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <HydrographChart
          times={hydroTimes}
          flows={hydroFlows}
          currentTimeHrs={1.5}
          peakDischarge={peakFlow}
          timeToPeakHrs={1.5}
        />
        <ArrivalTimelineChart
          currentTimeMin={45}
          stations={CORRIDOR_STATIONS}
        />
      </div>
    </div>
  );
}
