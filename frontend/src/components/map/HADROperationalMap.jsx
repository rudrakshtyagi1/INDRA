import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ShieldAlert,
  Navigation,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Clock,
  Maximize2,
  Minimize2,
  Layers,
} from 'lucide-react';
import { createBasemapLayer } from '../../utils/mapTiles';
import { formatMinutes } from '../../utils/formatters';

// Nearby affected settlements in the local disaster response corridor (0–30 km)
export const LOCAL_SETTLEMENTS = [
  {
    id: 'sirain',
    name: 'Sirain Village',
    lat: 30.362,
    lon: 78.490,
    km: 4.2,
    population: 840,
    floodArrivalMin: 8,
    peakDepthM: 34.0,
    urgency: 'CRITICAL',
    safeShelter: 'New Tehri High Ground Shelter (Elev 1,550m MSL)',
    safeRoute: {
      etaMin: 14,
      distKm: 9.8,
      routeCoords: [
        [30.345, 78.395], // Chamba SDRF Forward Base
        [30.355, 78.430], // High Ridge Road
        [30.368, 78.460], // North Ridge Spur
        [30.362, 78.490], // Sirain Village High Ground
      ],
      safetyMarginMin: 22,
    },
    rejectedRoute: {
      etaMin: 9,
      distKm: 6.2,
      hazardReason: 'Low-lying Bhagirathi bridge at km 3.8 submerges in 6 min',
      bridgeFloodMin: 6,
      routeCoords: [
        [30.345, 78.395],
        [30.358, 78.445],
        [30.370, 78.475], // Flood Breach Inundation Point
        [30.362, 78.490],
      ],
    },
  },
  {
    id: 'tipri',
    name: 'Tipri Riverside',
    lat: 30.335,
    lon: 78.498,
    km: 9.5,
    population: 1250,
    floodArrivalMin: 18,
    peakDepthM: 28.5,
    urgency: 'CRITICAL',
    safeShelter: 'Chamba Ridge Relief Hub (Elev 1,480m MSL)',
    safeRoute: {
      etaMin: 18,
      distKm: 12.4,
      routeCoords: [
        [30.345, 78.395],
        [30.340, 78.435],
        [30.332, 78.470],
        [30.335, 78.498],
      ],
      safetyMarginMin: 24,
    },
    rejectedRoute: {
      etaMin: 11,
      distKm: 8.2,
      hazardReason: 'Valley road NH-94 impassable: 4.2m flood surge reaches riverbank at T+18 min',
      bridgeFloodMin: 14,
      routeCoords: [
        [30.345, 78.395],
        [30.352, 78.450],
        [30.342, 78.485], // Inundation Cutoff
        [30.335, 78.498],
      ],
    },
  },
  {
    id: 'pangarh',
    name: 'Pangarh Settlement',
    lat: 30.312,
    lon: 78.502,
    km: 14.8,
    population: 620,
    floodArrivalMin: 26,
    peakDepthM: 24.0,
    urgency: 'HIGH',
    safeShelter: 'Kandisaur High Ground Camp (Elev 1,220m MSL)',
    safeRoute: {
      etaMin: 22,
      distKm: 15.6,
      routeCoords: [
        [30.345, 78.395],
        [30.325, 78.430],
        [30.310, 78.470],
        [30.312, 78.502],
      ],
      safetyMarginMin: 32,
    },
    rejectedRoute: {
      etaMin: 15,
      distKm: 11.0,
      hazardReason: 'Gorge floor link cut off by 3.8m surge wave',
      bridgeFloodMin: 20,
      routeCoords: [
        [30.345, 78.395],
        [30.330, 78.460],
        [30.318, 78.490],
        [30.312, 78.502],
      ],
    },
  },
  {
    id: 'koteshwar_basti',
    name: 'Koteshwar Basti',
    lat: 30.278,
    lon: 78.512,
    km: 22.5,
    population: 3400,
    floodArrivalMin: 34,
    peakDepthM: 42.0,
    urgency: 'HIGH',
    safeShelter: 'Koteshwar Dam Right-Bank Safe Ridge (Elev 720m MSL)',
    safeRoute: {
      etaMin: 28,
      distKm: 19.2,
      routeCoords: [
        [30.345, 78.395],
        [30.310, 78.420],
        [30.285, 78.470],
        [30.278, 78.512],
      ],
      safetyMarginMin: 45,
    },
    rejectedRoute: {
      etaMin: 20,
      distKm: 14.5,
      hazardReason: 'Tailrace flood surges over lower access bridges at km 21.8',
      bridgeFloodMin: 28,
      routeCoords: [
        [30.345, 78.395],
        [30.300, 78.460],
        [30.282, 78.500],
        [30.278, 78.512],
      ],
    },
  },
];

export const NDRF_BASE = {
  name: 'SDRF / NDRF Forward Quick Response Staging Base',
  lat: 30.345,
  lon: 78.395,
  elevationMsl: 1450,
  personnel: '2 Companies (85 Responders, 14 Inflatable Zodiacs)',
};

export default function HADROperationalMap({
  selectedVillageId = 'sirain',
  onSelectVillage,
  isFullScreen = false,
  onToggleFullScreen,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    markers: [],
    safeRouteLine: null,
    rejectedRouteLine: null,
    hazardPointMarker: null,
  });

  const [viewMode, setViewMode] = useState('immediate');

  const activeVillage =
    LOCAL_SETTLEMENTS.find((v) => v.id === selectedVillageId) || LOCAL_SETTLEMENTS[0];

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.340, 78.450],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    createBasemapLayer(map).addTo(map);
    mapInstanceRef.current = map;

    // NDRF Staging Base Marker
    const ndrfIcon = L.divIcon({
      className: 'custom-ndrf-icon',
      html: `
        <div style="
          background: #0ea5e9;
          color: #020617;
          font-weight: 800;
          font-size: 10px;
          border: 2px solid #ffffff;
          border-radius: 8px;
          padding: 3px 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 4px 14px rgba(14, 165, 233, 0.6);
          font-family: monospace;
          white-space: nowrap;
        ">
          <span>● NDRF BASE</span>
        </div>
      `,
      iconSize: [90, 24],
      iconAnchor: [45, 12],
    });

    L.marker([NDRF_BASE.lat, NDRF_BASE.lon], { icon: ndrfIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-size: 12px; color: #0f172a; font-family: sans-serif;">
          <strong>${NDRF_BASE.name}</strong><br/>
          Elevation: <strong>${NDRF_BASE.elevationMsl} m MSL (Safe High Ridge)</strong><br/>
          Readiness: <strong>${NDRF_BASE.personnel}</strong>
        </div>
      `);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. View Mode Zoom Updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (viewMode === 'immediate') {
      map.flyTo([30.340, 78.450], 12, { duration: 0.8 });
    } else if (viewMode === 'corridor') {
      map.flyTo([30.220, 78.480], 11, { duration: 0.8 });
    } else if (viewMode === 'basin') {
      map.flyTo([30.200, 78.350], 9, { duration: 0.8 });
    }
  }, [viewMode]);

  // 3. Render Settlement Markers & Animate Dual Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old route lines
    if (layersRef.current.safeRouteLine) {
      map.removeLayer(layersRef.current.safeRouteLine);
      layersRef.current.safeRouteLine = null;
    }
    if (layersRef.current.rejectedRouteLine) {
      map.removeLayer(layersRef.current.rejectedRouteLine);
      layersRef.current.rejectedRouteLine = null;
    }
    if (layersRef.current.hazardPointMarker) {
      map.removeLayer(layersRef.current.hazardPointMarker);
      layersRef.current.hazardPointMarker = null;
    }

    // Render Village Markers
    layersRef.current.markers.forEach((m) => map.removeLayer(m));
    layersRef.current.markers = [];

    LOCAL_SETTLEMENTS.forEach((v) => {
      const isSelected = v.id === activeVillage.id;
      const isCritical = v.urgency === 'CRITICAL';

      const iconColor = isSelected ? '#38bdf8' : isCritical ? '#ef4444' : '#f59e0b';

      const vIcon = L.divIcon({
        className: 'custom-village-icon',
        html: `
          <div style="
            background: rgba(15, 23, 42, 0.95);
            border: 2px solid ${iconColor};
            border-radius: 9999px;
            padding: 3px 8px;
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            transform: ${isSelected ? 'scale(1.1)' : 'scale(1.0)'};
            transition: all 0.2s ease;
          ">
            <span style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: ${iconColor};
              display: inline-block;
            "></span>
            <span style="
              color: #f8fafc;
              font-size: 10px;
              font-weight: 700;
              font-family: monospace;
              white-space: nowrap;
            ">${v.name} (T+${v.floodArrivalMin}m)</span>
          </div>
        `,
        iconSize: [140, 24],
        iconAnchor: [70, 12],
      });

      const marker = L.marker([v.lat, v.lon], { icon: vIcon }).addTo(map);
      marker.on('click', () => onSelectVillage(v.id));
      layersRef.current.markers.push(marker);
    });

    // 4. Draw Animated Dual Routes for selected village
    if (activeVillage) {
      // 4A. Rejected Route (Red, dashed with hazard cutoff marker)
      const rejLine = L.polyline(activeVillage.rejectedRoute.routeCoords, {
        color: '#ef4444',
        weight: 3.5,
        dashArray: '6,6',
        opacity: 0.85,
      }).addTo(map);
      layersRef.current.rejectedRouteLine = rejLine;

      const hazCoord =
        activeVillage.rejectedRoute.routeCoords[
          Math.floor(activeVillage.rejectedRoute.routeCoords.length / 2)
        ];
      const hazIcon = L.divIcon({
        className: 'custom-hazard-icon',
        html: `
          <div style="
            background: #ef4444;
            color: #ffffff;
            font-weight: 900;
            font-size: 10px;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.9);
          ">✕</div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const hazMarker = L.marker(hazCoord, { icon: hazIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-size: 11px; color: #7f1d1d; font-family: sans-serif;">
            <strong>BRIDGE / GORGE INUNDATION POINT</strong><br/>
            ${activeVillage.rejectedRoute.hazardReason}
          </div>
        `);
      layersRef.current.hazardPointMarker = hazMarker;

      // 4B. Safe Recommended Route (Green, solid ridge bypass)
      const safeLine = L.polyline(activeVillage.safeRoute.routeCoords, {
        color: '#10b981',
        weight: 4,
        opacity: 0.95,
      }).addTo(map);
      layersRef.current.safeRouteLine = safeLine;
    }
  }, [activeVillage, onSelectVillage]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 flex flex-col justify-between ${
        isFullScreen ? 'h-full flex-1' : 'h-[520px]'
      }`}
    >
      {/* 1. Leaflet Map */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* 2. Top Bar: Viewport Scopes & Target */}
      <div className="relative z-10 p-4 flex flex-wrap items-center justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-950/95 backdrop-blur border border-slate-800 p-1 rounded-xl shadow-lg">
          <button
            onClick={() => setViewMode('immediate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'immediate'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            IMMEDIATE IMPACT
          </button>
          <button
            onClick={() => setViewMode('corridor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'corridor'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DOWNSTREAM CORRIDOR
          </button>
          <button
            onClick={() => setViewMode('basin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'basin'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FULL BASIN
          </button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-950/95 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Target:</span>
            <span className="text-cyan-400 font-bold">{activeVillage.name}</span>
          </div>

          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-2 rounded-xl bg-slate-950/95 border border-slate-800 text-slate-300 hover:text-white transition shadow-lg"
              title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen Routing Mode'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* 3. Bottom Operational Route Comparison Strip */}
      <div className="relative z-10 bg-slate-950/95 backdrop-blur border-t border-slate-800/90 px-5 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Recommended Safe Route Strip */}
        <div className="flex-1 bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-emerald-300 block uppercase tracking-wide">
                RECOMMENDED SAFE ROUTE (Ridge Bypass)
              </span>
              <span className="text-[10px] text-emerald-200/80 font-mono">
                {activeVillage.safeShelter}
              </span>
            </div>
          </div>
          <div className="text-right font-mono text-xs shrink-0">
            <span className="text-emerald-400 font-bold block">
              {activeVillage.safeRoute.etaMin} min &bull; {activeVillage.safeRoute.distKm} km
            </span>
            <span className="text-[10px] text-emerald-300">Margin: +{activeVillage.safeRoute.safetyMarginMin}m</span>
          </div>
        </div>

        {/* Rejected Unsafe Route Strip */}
        <div className="flex-1 bg-red-950/40 border border-red-500/40 rounded-xl p-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-red-300 block uppercase tracking-wide">
                REJECTED ROUTE (Valley Road)
              </span>
              <span className="text-[10px] text-red-200/80 font-mono">
                {activeVillage.rejectedRoute.hazardReason}
              </span>
            </div>
          </div>
          <div className="text-right font-mono text-xs shrink-0">
            <span className="text-red-400 font-bold block">
              {activeVillage.rejectedRoute.etaMin} min &bull; {activeVillage.rejectedRoute.distKm} km
            </span>
            <span className="text-[10px] text-red-300">Floods in {activeVillage.rejectedRoute.bridgeFloodMin}m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
