import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Crosshair,
  Navigation,
  Eye,
  EyeOff,
  ChevronDown,
  Building2,
  Plane,
  Car,
  Footprints,
  ShieldAlert,
} from 'lucide-react';
import L from 'leaflet';
import { useV3Data } from '../hooks/useV3Data';
import { createBasemapLayer } from '../utils/mapTiles';
import MissionInspector from '../components/hadr/MissionInspector';
import HierarchyFilterBar from '../components/map/HierarchyFilterBar';
import {
  PROTOTYPE_TACTICAL_ROUTES,
  PROTOTYPE_NDRF_BASE,
} from '../data/prototype/tehriPrototypeRoutes';
import { PROTOTYPE_SETTLEMENTS } from '../data/prototype/tehriPrototypeSettlements';
import { getFloodTimestepData, RIVER_CENTERLINE } from '../data/prototype/tehriPrototypeFlood';
import {
  PROTOTYPE_INFRASTRUCTURE,
  INFRA_TYPES,
  getInfrastructureRisk,
} from '../data/prototype/tehriInfrastructure';
import {
  MAJOR_REGIONAL_TOWNS,
  CORRIDOR_CLUSTERS,
  getFilteredSettlements,
} from '../data/prototype/tehriAdministrativeHierarchy';

const FLOOD_SNAPSHOT_MIN = 45; // Fixed snapshot for HADR view

export default function HADRDashboard({ selectedPreset, simulationResult, onOpenExport }) {

  const [activeId, setActiveId] = useState('sirain');
  const v3 = useV3Data();

  const [routeDrawn, setRouteDrawn] = useState(true); // Drawn by default for clear immediate tactical picture
  const [selectedRouteMode, setSelectedRouteMode] = useState('ROAD'); // 'ROAD' | 'FALLBACK_GROUND' | 'AIR_EVAC'
  const [layersOpen, setLayersOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(12);
  const [filters, setFilters] = useState({
    district: 'all',
    tehsil: 'all',
    riskState: 'all',
    searchQuery: '',
  });

  // Layer Toggles
  const [layerVisibility, setLayerVisibility] = useState({
    flood: true,
    ndrf_base: true,
    hospitals: true,
    shelters: true,
    helipads: true,
    bridges: true,
    active_route: true,
    rejected_route: true,
  });

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef({
    rejected: null,
    activeRoute: null,
    hazard: null,
    settlements: [],
    infrastructure: [],
    flood: [],
    river: null,
    base: null,
  });

  const toggleLayer = (key) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.340, 78.460],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });
    createBasemapLayer(map).addTo(map);
    mapInstanceRef.current = map;

    // Track zoom level
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    // River centerline
    const river = L.polyline(
      RIVER_CENTERLINE.map((p) => [p.lat, p.lon]),
      {
        color: '#1e40af',
        weight: 3,
        opacity: 0.5,
      }
    ).addTo(map);
    routeLayersRef.current.river = river;

    // Flood snapshot
    const data = getFloodTimestepData(FLOOD_SNAPSHOT_MIN);
    const floodLayers = [];
    if (data.shallowPolygon?.length > 2) {
      floodLayers.push(
        L.polygon(data.shallowPolygon, {
          color: '#38bdf8',
          fillColor: '#0284c7',
          fillOpacity: 0.3,
          weight: 1,
        }).addTo(map)
      );
    }
    if (data.moderatePolygon?.length > 2) {
      floodLayers.push(
        L.polygon(data.moderatePolygon, {
          color: '#60a5fa',
          fillColor: '#1d4ed8',
          fillOpacity: 0.5,
          weight: 1.5,
        }).addTo(map)
      );
    }
    if (data.deepPolygon?.length > 2) {
      floodLayers.push(
        L.polygon(data.deepPolygon, {
          color: '#93c5fd',
          fillColor: '#1e3a8a',
          fillOpacity: 0.75,
          weight: 2,
        }).addTo(map)
      );
    }
    routeLayersRef.current.flood = floodLayers;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Render Filtered Settlements
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    routeLayersRef.current.settlements.forEach((m) => {
      try {
        map.removeLayer(m);
      } catch (_) {}
    });
    routeLayersRef.current.settlements = [];

    // Filter settlements using administrative hierarchy & search filters
    const prioritySettlements = getFilteredSettlements(PROTOTYPE_SETTLEMENTS, filters);

    prioritySettlements.forEach((st) => {
      const isTarget = st.id === activeId;
      const urgencyColor =
        st.urgency === 'CRITICAL' ? '#ef4444' : st.urgency === 'HIGH' ? '#f59e0b' : '#3b82f6';

      const iconHtml = `
        <div style="
          background: rgba(19,28,44,0.95);
          border: ${isTarget ? '2px solid #38bdf8' : `1.5px solid ${urgencyColor}85`};
          border-radius: 7px; padding: 3px 8px;
          display: flex; align-items: center; gap: 6px;
          box-shadow: ${isTarget ? '0 0 16px #38bdf8' : '0 3px 10px rgba(0,0,0,0.5)'};
          white-space: nowrap; cursor: pointer;
        ">
          <span style="width:7px; height:7px; border-radius:50%; background:${urgencyColor}; flex-shrink:0;"></span>
          <div style="display:flex; flex-direction:column;">
            <span style="color:#f8fafc; font-size:10px; font-weight:700;">${st.name}</span>
            <span style="color:#94a3b8; font-size:9px; font-mono;">T+${st.arrivalMin}m · ${st.population.toLocaleString()} pop</span>
          </div>
        </div>`;

      const icon = L.divIcon({
        className: '',
        html: iconHtml,
        iconSize: [140, 28],
        iconAnchor: [70, 14],
      });

      const marker = L.marker([st.lat, st.lon], { icon, zIndexOffset: isTarget ? 1000 : 700 }).addTo(map);
      marker.on('click', () => {
        setActiveId(st.id);
      });

      routeLayersRef.current.settlements.push(marker);
    });
  }, [activeId, filters]);

  // 3. Render Healthcare, Shelters, Helipads & NDRF Base Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    routeLayersRef.current.infrastructure.forEach((m) => {
      try {
        map.removeLayer(m);
      } catch (_) {}
    });
    routeLayersRef.current.infrastructure = [];

    // NDRF Staging Base
    if (layerVisibility.ndrf_base) {
      const baseIcon = L.divIcon({
        className: '',
        html: `<div style="
          background: rgba(12,18,32,0.95); border: 2px solid #22c55e;
          border-radius: 8px; padding: 4px 9px; display: flex; align-items: center; gap: 6px;
          box-shadow: 0 0 16px rgba(34,197,94,0.4); white-space: nowrap;
        ">
          <span style="width:8px; height:8px; border-radius:50%; background:#22c55e; flex-shrink:0; animation:pulse 2s infinite;"></span>
          <div style="display:flex; flex-direction:column;">
            <span style="color:#22c55e; font-size:9.5px; font-weight:800; font-family:monospace;">NDRF STAGING POST (CHAMBA RIDGE)</span>
            <span style="color:#94a3b8; font-size:8px; font-family:monospace;">Tactical Response Post · PROTOTYPE FIXTURE</span>
          </div>
        </div>`,
        iconSize: [195, 28],
        iconAnchor: [97, 14],
      });
      const bm = L.marker([PROTOTYPE_NDRF_BASE.lat, PROTOTYPE_NDRF_BASE.lon], { icon: baseIcon, zIndexOffset: 950 }).addTo(map);
      routeLayersRef.current.infrastructure.push(bm);
    }

    // Operational Infrastructure Filter
    const activeAssets = PROTOTYPE_INFRASTRUCTURE.filter((asset) => {
      if (asset.type === 'hospital' || asset.type === 'clinic_phc') return layerVisibility.hospitals;
      if (asset.type === 'shelter') return layerVisibility.shelters;
      if (asset.type === 'helipad') return layerVisibility.helipads;
      if (asset.type === 'bridge') return layerVisibility.bridges;
      return false;
    });

    activeAssets.forEach((asset) => {
      const risk = getInfrastructureRisk(asset, FLOOD_SNAPSHOT_MIN);
      const typeDef = INFRA_TYPES[asset.type] || { icon: '🏢' };

      const markerHtml = `
        <div style="
          width: 22px; height: 22px; border-radius: 6px;
          background: rgba(12,18,32,0.92);
          border: 1.5px solid ${risk.color}90;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; cursor: pointer;
        ">
          ${typeDef.icon}
        </div>`;

      const icon = L.divIcon({
        className: '',
        html: markerHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([asset.lat, asset.lon], { icon, zIndexOffset: 650 })
        .addTo(map)
        .bindTooltip(
          `<div style="font-family:monospace; font-size:10px; line-height:1.4">
            <strong style="color:#f1f5f9">${asset.name}</strong><br/>
            Type: <strong>${typeDef.label}</strong><br/>
            Status: <span style="color:${risk.color}; font-weight:700">${risk.label}</span><br/>
            Access: <strong>${asset.accessRoadStatus.replace(/_/g, ' ')}</strong><br/>
            ${asset.capacity ? `Capacity: <strong>${asset.capacity.toLocaleString()} persons</strong><br/>` : ''}
            <span style="color:#94a3b8; font-size:8px">PROTOTYPE FIXTURE</span>
          </div>`,
          { direction: 'top' }
        );

      routeLayersRef.current.infrastructure.push(marker);
    });
  }, [layerVisibility]);

  // 4. Draw / Update Multi-Modal Tactical Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing route polylines & hazard markers
    ['rejected', 'activeRoute', 'hazard'].forEach((key) => {
      if (routeLayersRef.current[key]) {
        try {
          map.removeLayer(routeLayersRef.current[key]);
        } catch (_) {}
        routeLayersRef.current[key] = null;
      }
    });

    if (!routeDrawn) return;

    const routes = PROTOTYPE_TACTICAL_ROUTES[activeId];
    if (!routes) return;

    // A. Rejected Route (Submerged Bridge / Low Gorge Track)
    if (layerVisibility.rejected_route && routes.rejectedRoute) {
      const rejected = L.polyline(routes.rejectedRoute.routeCoords, {
        color: '#dc2626',
        weight: 2.5,
        opacity: 0.65,
        dashArray: '8,5',
      }).addTo(map);
      routeLayersRef.current.rejected = rejected;

      // Blocked hazard chokepoint marker
      const [hlat, hlon] = routes.rejectedRoute.hazardPointCoords;
      const hazardIcon = L.divIcon({
        className: '',
        html: `<div style="
          width: 22px; height: 22px; border-radius: 50%;
          background: rgba(220,38,38,0.92); border: 2px solid #fca5a5;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 14px rgba(220,38,38,0.6);
          font-size: 11px; font-weight: 900; color: white;
        ">✕</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const hazard = L.marker([hlat, hlon], { icon: hazardIcon, zIndexOffset: 920 })
        .addTo(map)
        .bindTooltip(
          `<div style="font-family:monospace; font-size:10px; max-width:210px;">
            <strong style="color:#f87171">⚠ ROAD IMPASSABLE — SUBMERGED CHOKEPOINT</strong><br/>
            ${routes.rejectedRoute.hazardReason}<br/>
            <em style="color:#94a3b8; font-size:8px;">PROTOTYPE FIXTURE</em>
          </div>`,
          { direction: 'top' }
        );
      routeLayersRef.current.hazard = hazard;
    }

    // B. Active Multi-Modal Route (ROAD / FALLBACK_GROUND / AIR_EVAC / BOAT)
    if (layerVisibility.active_route) {
      let routeData = routes.roadRoute;
      if (selectedRouteMode === 'FALLBACK_GROUND') routeData = routes.fallbackGroundRoute;
      else if (selectedRouteMode === 'AIR_EVAC') routeData = routes.airEvacRoute;
      else if (selectedRouteMode === 'BOAT' && routes.boatRoute) routeData = routes.boatRoute;

      if (routeData) {
        const polyline = L.polyline(routeData.routeCoords, {
          color: routeData.color || '#10b981',
          weight: selectedRouteMode === 'AIR_EVAC' ? 2.5 : 4,
          opacity: 0.95,
          dashArray: routeData.dashArray,
        }).addTo(map);
        routeLayersRef.current.activeRoute = polyline;

        // Auto-fit bounds
        try {
          const allCoords = [...routeData.routeCoords, ...(routes.rejectedRoute?.routeCoords || [])];
          map.fitBounds(L.latLngBounds(allCoords).pad(0.2), { animate: true, duration: 0.6 });
        } catch (_) {}
      }
    }
  }, [activeId, routeDrawn, selectedRouteMode, layerVisibility]);

  const handleCalculateRoute = (id) => {
    setActiveId(id);
    setRouteDrawn(true);
  };

  const handleFitCenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([30.340, 78.460], 12, { duration: 0.8 });
  };

  return (
    <div className="w-full h-full flex bg-[var(--surface-0)] overflow-hidden">
      {/* Map Viewport */}
      <div className="flex-1 relative overflow-hidden min-w-0">
        <div ref={mapContainerRef} className="map-canvas" />

        {/* Top Administrative & Settlement Hierarchy Filter Toolbar */}
        <div className="absolute top-4 left-4 z-20 max-w-[calc(100%-20px)]">
          <HierarchyFilterBar
            zoomLevel={zoomLevel}
            filters={filters}
            onFilterChange={setFilters}
            settlements={PROTOTYPE_SETTLEMENTS}
            activeSettlementId={activeId}
            onSelectSettlementId={(id) => {
              if (id) {
                setActiveId(id);
                setRouteDrawn(true);
                const st = PROTOTYPE_SETTLEMENTS.find((s) => s.id === id);
                if (st && mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([st.lat, st.lon], 14, { duration: 0.6 });
                }
              }
            }}
          />
        </div>

        {/* Floating Map Layers & Legend Control */}
        <div className="absolute bottom-4 left-3 z-10 flex flex-col gap-2 items-start">
          {/* Layer Toggle Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLayersOpen(!layersOpen)}
              className="floating-control flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Operational Layers</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${layersOpen ? 'rotate-180' : ''}`} />
            </button>

            {layersOpen && (
              <div className="absolute bottom-full mb-1 left-0 floating-control p-2 flex flex-col gap-1 min-w-[200px] shadow-2xl">
                <p className="text-[8px] font-mono uppercase text-[var(--text-muted)] px-2 py-1 border-b border-[var(--surface-border)]">
                  Tactical Map Layers
                </p>
                {[
                  { key: 'hospitals', label: '🏥 Hospitals & Clinics' },
                  { key: 'shelters', label: '⛺ Relief Shelters' },
                  { key: 'helipads', label: '🚁 Helipads & Air Evac' },
                  { key: 'bridges', label: '🌉 Bridges & Chokepoints' },
                  { key: 'ndrf_base', label: '🛡️ NDRF Staging Base' },
                  { key: 'active_route', label: '🟩 Active Safe Corridor' },
                  { key: 'rejected_route', label: '🟥 Submerged Road Failure' },
                ].map(({ key, label }) => {
                  const visible = layerVisibility[key] !== false;
                  return (
                    <button
                      key={key}
                      onClick={() => toggleLayer(key)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition text-left w-full"
                    >
                      {visible ? (
                        <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          visible ? 'text-[var(--text-secondary)] font-medium' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recenter Button */}
          <button
            onClick={handleFitCenter}
            className="floating-control flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <Crosshair className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Center Corridor</span>
          </button>
        </div>

        {/* Floating Route Legend */}
        {routeDrawn && (
          <div className="floating-control absolute top-3 right-3 z-10 p-3 space-y-1.5">
            <p className="text-[8.5px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-1">
              Route Representation
            </p>
            <div className="flex items-center gap-2">
              <div className="w-6 border-t-2 border-green-500" />
              <span className="text-[9.5px] text-green-400 font-mono">Road Route (Solid)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 border-t-2 border-dashed border-amber-400" />
              <span className="text-[9.5px] text-amber-400 font-mono">Foot Trail / Ridge (Dashed)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 border-t-2 border-dotted border-purple-400" />
              <span className="text-[9.5px] text-purple-400 font-mono">Air Evac / Helipad (Dotted)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 border-t-2 border-dashed border-red-500" />
              <span className="text-[9.5px] text-red-400 font-mono">Rejected Submerged Road</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Mission Inspector (320px) */}
      <div
        style={{ width: 'var(--inspector-width)', flexShrink: 0 }}
        className="border-l border-[var(--surface-border)] overflow-hidden"
      >
        <MissionInspector v3={v3} 
          activeId={activeId}
          onSelectId={(id) => setActiveId(id)}
          onCalculateRoute={handleCalculateRoute}
          routeDrawn={routeDrawn}
          selectedRouteMode={selectedRouteMode}
          onSelectRouteMode={setSelectedRouteMode}
        />
      </div>
    </div>
  );
}
