import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  ShieldAlert,
  RotateCcw,
  X,
  ArrowRight,
  Info,
  Layers,
  PanelRight,
  Compass,
} from 'lucide-react';
import L from 'leaflet';
import { useV3Data } from '../hooks/useV3Data';
import { createBasemapLayer } from '../utils/mapTiles';
import { RIVER_CENTERLINE, getFloodTimestepData } from '../data/prototype/tehriPrototypeFlood';
import { PROTOTYPE_SETTLEMENTS, getSettlementStatus } from '../data/prototype/tehriPrototypeSettlements';
import { PROTOTYPE_METADATA } from '../data/prototype/tehriPrototypeRun';
import {
  PROTOTYPE_INFRASTRUCTURE,
  INFRA_TYPES,
  getInfrastructureRisk,
} from '../data/prototype/tehriInfrastructure';
import {
  DISTRICTS,
  getDistrictExposure,
  getSelectedAreaExposure,
} from '../data/prototype/tehriPopulationExposure';

import PlaybackRail from '../components/sim/PlaybackRail';
import AnalyticsStrip from '../components/sim/AnalyticsStrip';
import FloatingMapControls from '../components/sim/FloatingMapControls';
import SimulationInspector from '../components/sim/SimulationInspector';
import CesiumTerrainViewer from '../components/map/CesiumTerrainViewer';
import HierarchyFilterBar from '../components/map/HierarchyFilterBar';
import {
  MAJOR_REGIONAL_TOWNS,
  CORRIDOR_CLUSTERS,
  getFilteredSettlements,
} from '../data/prototype/tehriAdministrativeHierarchy';

export default function SimulationLab({
  simulationResult,
  selectedPreset,
  onRunSimulation,
  isSimulating,
  onNavigateToHadr,
  initialTimeMin = 30,
  onTimeChange,
}) {
  const [currentTimeMin, setCurrentTimeMin] = useState(initialTimeMin);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(12);
  const [mapDimension, setMapDimension] = useState('2D'); // '2D' | '3D'
  const [filters, setFilters] = useState({
    district: 'all',
    tehsil: 'all',
    riskState: 'all',
    searchQuery: '',
  });

  const [activeSettlementId, setActiveSettlementId] = useState('');
  const v3 = useV3Data();


  // Layer Toggles
  const [layerVisibility, setLayerVisibility] = useState({
    depth_layers: true,
    wavefront: true,
    settlements: true,
    infrastructure: true,
    admin_exposure: false,
    sph_nearfield: true,
    coupling_transect: true,
  });

  // Selected State
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [queryRadiusKm, setQueryRadiusKm] = useState(5);

  const [followFront, setFollowFront] = useState(false);
  const [hasRun, setHasRun] = useState(!!simulationResult);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    river: null,
    sph: null,
    coupling: null,
    flood: [],
    wavefront: null,
    settlements: [],
    towns: [],
    clusters: [],
    infrastructure: [],
    districts: [],
    queryCircle: null,
  });

  const meta = PROTOTYPE_METADATA;
  const isFinished = currentTimeMin >= 180;

  // Sync to parent
  const handleTimeChange = (t) => {
    setCurrentTimeMin(t);
    onTimeChange?.(t);
  };

  // Recalculate selected area if time or radius changes
  useEffect(() => {
    if (selectedArea) {
      const updated = getSelectedAreaExposure(
        selectedArea.center[0],
        selectedArea.center[1],
        queryRadiusKm,
        currentTimeMin
      );
      setSelectedArea(updated);
    }
  }, [currentTimeMin, queryRadiusKm]);

  // Animation playback loop
  useEffect(() => {
    let raf = null;
    let last = null;
    const msPerSimMin = 100 / playbackSpeed;

    const tick = (now) => {
      if (!last) last = now;
      const elapsed = now - last;
      if (elapsed >= msPerSimMin) {
        last = now;
        setCurrentTimeMin((prev) => {
          if (prev >= 180) {
            setIsPlaying(false);
            return 180;
          }
          const next = Math.min(180, prev + 1);
          onTimeChange?.(next);
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isPlaying, playbackSpeed]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.330, 78.490],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });
    createBasemapLayer(map).addTo(map);
    mapInstanceRef.current = map;

    // Track zoom level for zoom-dependent hierarchy
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    // Map click for Selected Area Exposure
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const areaData = getSelectedAreaExposure(lat, lng, queryRadiusKm, currentTimeMin);
      setSelectedArea(areaData);
      setSelectedAsset(null);
      setIsInspectorOpen(true);
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
    layersRef.current.river = river;

    // SPH domain
    const sph = L.circle([30.378, 78.481], {
      radius: 2000,
      color: '#22d3ee',
      fillColor: '#22d3ee',
      fillOpacity: 0.08,
      weight: 1,
      dashArray: '6,4',
    }).addTo(map);
    sph.bindTooltip('DualSPHysics domain (0–2 km) · PROTOTYPE FIXTURE', { direction: 'top' });
    layersRef.current.sph = sph;

    // Coupling transect
    const coupling = L.polyline(
      [[30.370, 78.468], [30.366, 78.494]],
      {
        color: '#a855f7',
        weight: 2,
        dashArray: '6,4',
        opacity: 0,
      }
    ).addTo(map);
    coupling.bindTooltip('Q(t) coupling transect x = 2.0 km', { direction: 'top' });
    layersRef.current.coupling = coupling;

    // 145 km Prototype Domain Boundary at Bijnor Barrage
    const boundaryLine = L.polyline(
      [[29.390, 78.080], [29.360, 78.180]],
      {
        color: '#f59e0b',
        weight: 2.5,
        dashArray: '6,6',
        opacity: 0.85,
      }
    ).addTo(map);

    const boundaryIcon = L.divIcon({
      className: '',
      html: `
        <div style="
          background: rgba(19,28,44,0.95);
          border: 1.5px solid #f59e0b;
          border-radius: 6px; padding: 3px 8px;
          display: flex; align-items: center; gap: 5px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.5);
          white-space: nowrap;
        ">
          <span style="width:6px; height:6px; border-radius:50%; background:#f59e0b; flex-shrink:0;"></span>
          <span style="color:#f8fafc; font-size:10px; font-weight:700;">PROTOTYPE STUDY DOMAIN BOUNDARY (145 km)</span>
        </div>`,
      iconSize: [260, 26],
      iconAnchor: [130, 13],
    });

    const boundaryMarker = L.marker([29.375, 78.130], { icon: boundaryIcon, zIndexOffset: 900 })
      .addTo(map)
      .bindTooltip(
        `<div style="font-size:11px; line-height:1.4">
          <strong style="color:#f8fafc">PROTOTYPE STUDY DOMAIN BOUNDARY</strong><br/>
          Location: <strong>Bijnor Barrage / Madhya Ganga (Km 145.0)</strong><br/>
          <span style="color:#94a3b8; font-size:10px">Prototype study cutoff point (not physical end of water).</span>
        </div>`,
        { direction: 'top' }
      );

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Draw / Update Query Buffer Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.queryCircle) {
      try {
        map.removeLayer(layersRef.current.queryCircle);
      } catch (_) {}
      layersRef.current.queryCircle = null;
    }

    if (selectedArea) {
      const circle = L.circle(selectedArea.center, {
        radius: selectedArea.radiusKm * 1000,
        color: '#22d3ee',
        weight: 1.5,
        dashArray: '4,4',
        fillColor: '#22d3ee',
        fillOpacity: 0.08,
      }).addTo(map);
      layersRef.current.queryCircle = circle;
    }
  }, [selectedArea]);

  // 3. Update Flood Layers & Wavefront
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Toggle SPH / coupling
    try {
      if (layerVisibility.sph_nearfield) map.addLayer(layersRef.current.sph);
      else map.removeLayer(layersRef.current.sph);
      if (layerVisibility.coupling_transect) layersRef.current.coupling.setStyle({ opacity: 1 });
      else layersRef.current.coupling.setStyle({ opacity: 0 });
    } catch (_) {}

    // Clear flood layers
    layersRef.current.flood.forEach((l) => {
      try {
        map.removeLayer(l);
      } catch (_) {}
    });
    layersRef.current.flood = [];

    if (layersRef.current.wavefront) {
      try {
        map.removeLayer(layersRef.current.wavefront);
      } catch (_) {}
      layersRef.current.wavefront = null;
    }

    if (currentTimeMin === 0 || !layerVisibility.depth_layers) return;

    const data = getFloodTimestepData(currentTimeMin);

    // Shallow envelope (< 0.5m)
    if (data.shallowPolygon?.length > 2) {
      const l = L.polygon(data.shallowPolygon, {
        color: '#38bdf8',
        fillColor: '#0284c7',
        fillOpacity: 0.35,
        weight: 1.2,
        opacity: 0.8,
      }).addTo(map);
      layersRef.current.flood.push(l);
    }

    // Moderate zone (0.5 - 3.0m)
    if (data.moderatePolygon?.length > 2) {
      const l = L.polygon(data.moderatePolygon, {
        color: '#60a5fa',
        fillColor: '#1d4ed8',
        fillOpacity: 0.55,
        weight: 1.5,
        opacity: 0.9,
      }).addTo(map);
      layersRef.current.flood.push(l);
    }

    // Deep channel (> 3.0m)
    if (data.deepPolygon?.length > 2) {
      const l = L.polygon(data.deepPolygon, {
        color: '#93c5fd',
        fillColor: '#1e3a8a',
        fillOpacity: 0.82,
        weight: 2.0,
        opacity: 1.0,
      }).addTo(map);
      layersRef.current.flood.push(l);
    }

    // Wavefront marker
    if (layerVisibility.wavefront && data.wavefrontCoord) {
      const [wlat, wlon] = data.wavefrontCoord;
      const kmReach = ((currentTimeMin / 180) * 100).toFixed(1);
      const wIcon = L.divIcon({
        className: '',
        html: `
          <div style="display:flex;align-items:center;gap:5px;background:rgba(7,11,18,0.92);
            border:1px solid rgba(34,211,238,0.6);border-radius:6px;padding:3px 8px;
            box-shadow:0 0 14px rgba(34,211,238,0.3);white-space:nowrap">
            <span style="width:6px;height:6px;border-radius:50%;background:#22d3ee;
              animation:pulse 1.5s infinite;display:inline-block;flex-shrink:0"></span>
            <span style="color:#22d3ee;font-size:9px;font-weight:700;font-family:monospace">
              FRONT · T+${currentTimeMin}m · ${kmReach} km
            </span>
          </div>`,
        iconSize: [160, 22],
        iconAnchor: [80, 11],
      });
      const wm = L.marker([wlat, wlon], { icon: wIcon, zIndexOffset: 1000 }).addTo(map);
      layersRef.current.wavefront = wm;
    }

    // Follow front
    if (followFront && data.wavefrontCoord) {
      map.panTo(data.wavefrontCoord, { animate: true, duration: 0.5 });
    }
  }, [currentTimeMin, layerVisibility, followFront]);

  // 4. Multi-Scale Hierarchy: Towns, Clusters, & Filtered Settlements
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing settlement, town, and cluster markers
    ['settlements', 'towns', 'clusters'].forEach((key) => {
      layersRef.current[key].forEach((m) => {
        try {
          map.removeLayer(m);
        } catch (_) {}
      });
      layersRef.current[key] = [];
    });

    if (!layerVisibility.settlements) return;

    // ─── TIER 1: FULL DOMAIN (Zoom <= 9) ──────────────────────────────────
    // Show only Regional Towns (Zero individual villages)
    if (zoomLevel <= 9) {
      MAJOR_REGIONAL_TOWNS.forEach((town) => {
        const iconHtml = `
          <div style="background:rgba(19,28,44,0.92);border:1.5px solid #60a5fa;border-radius:6px;padding:3px 8px;display:flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(0,0,0,0.5);white-space:nowrap;cursor:pointer">
            <span style="width:7px;height:7px;border-radius:50%;background:#38bdf8;flex-shrink:0"></span>
            <div style="display:flex;flex-direction:column">
              <span style="color:#f8fafc;font-size:11px;font-weight:700">${town.name}</span>
              <span style="color:#94a3b8;font-size:9px">${town.role}</span>
            </div>
          </div>`;

        const icon = L.divIcon({
          className: '',
          html: iconHtml,
          iconSize: [160, 28],
          iconAnchor: [80, 14],
        });

        const marker = L.marker([town.lat, town.lon], { icon, zIndexOffset: 700 }).addTo(map);
        marker.on('click', () => {
          map.flyTo([town.lat, town.lon], 11, { duration: 0.6 });
        });
        layersRef.current.towns.push(marker);
      });
      return;
    }

    // ─── TIER 2: DOWNSTREAM CORRIDOR (Zoom 10–12) ──────────────────────────
    // Show Corridor Clusters with aggregate count badges + Regional Towns
    if (zoomLevel <= 12) {
      // 1. Regional Anchor Towns
      MAJOR_REGIONAL_TOWNS.forEach((town) => {
        const iconHtml = `
          <div style="background:rgba(19,28,44,0.90);border:1px solid #38bdf880;border-radius:5px;padding:2px 6px;display:flex;align-items:center;gap:4px;box-shadow:0 2px 8px rgba(0,0,0,0.4);white-space:nowrap;cursor:pointer">
            <span style="width:5px;height:5px;border-radius:50%;background:#38bdf8;flex-shrink:0"></span>
            <span style="color:#f1f5f9;font-size:10px;font-weight:600">${town.name}</span>
          </div>`;

        const icon = L.divIcon({
          className: '',
          html: iconHtml,
          iconSize: [140, 22],
          iconAnchor: [70, 11],
        });

        const marker = L.marker([town.lat, town.lon], { icon, zIndexOffset: 600 }).addTo(map);
        marker.on('click', () => {
          map.flyTo([town.lat, town.lon], 13, { duration: 0.6 });
        });
        layersRef.current.towns.push(marker);
      });

      // 2. Settlement Clusters
      CORRIDOR_CLUSTERS.forEach((cluster) => {
        // District filter for cluster
        if (filters.district !== 'all' && cluster.districtId !== filters.district) return;

        const clusterIconHtml = `
          <div style="background:rgba(19,28,44,0.95);border:1.5px solid #f59e0b;border-radius:8px;padding:4px 9px;display:flex;align-items:center;gap:7px;box-shadow:0 4px 16px rgba(0,0,0,0.5);white-space:nowrap;cursor:pointer">
            <div style="background:#f59e0b25;border:1px solid #f59e0b80;color:#fbbf24;font-size:10px;font-weight:800;padding:2px 6px;border-radius:5px">
              ${cluster.totalSettlements}
            </div>
            <div style="display:flex;flex-direction:column">
              <span style="color:#f8fafc;font-size:10.5px;font-weight:700">${cluster.name}</span>
              <span style="color:#fbbf24;font-size:9px;font-weight:600">${cluster.criticalCount} Critical · ${cluster.totalPopulation.toLocaleString()} Pop</span>
            </div>
          </div>`;

        const icon = L.divIcon({
          className: '',
          html: clusterIconHtml,
          iconSize: [210, 32],
          iconAnchor: [105, 16],
        });

        const marker = L.marker([cluster.lat, cluster.lon], { icon, zIndexOffset: 800 }).addTo(map);
        marker.on('click', () => {
          map.flyTo([cluster.lat, cluster.lon], 13, { duration: 0.6 });
        });

        marker.bindTooltip(
          `<div style="font-size:11px;line-height:1.4">
            <strong style="color:#f1f5f9">${cluster.name} (${cluster.kmRange})</strong><br/>
            Settlements: <strong>${cluster.totalSettlements}</strong> (Critical: <span style="color:#f87171">${cluster.criticalCount}</span>)<br/>
            Population at Risk: <strong>${cluster.totalPopulation.toLocaleString()}</strong><br/>
            Arrival Window: <strong>${cluster.arrivalRange}</strong><br/>
            <span style="color:#94a3b8;font-size:9px">Click to inspect local settlements</span>
          </div>`,
          { direction: 'top' }
        );

        layersRef.current.clusters.push(marker);
      });
      return;
    }

    // ─── TIER 3: IMMEDIATE IMPACT (Zoom >= 13) ──────────────────────────────
    // Show individual settlements filtered by district, tehsil, risk state
    const filteredSettlements = getFilteredSettlements(PROTOTYPE_SETTLEMENTS, filters);

    filteredSettlements.forEach((st) => {
      const isTarget = st.id === activeSettlementId;
      const status = getSettlementStatus(st, currentTimeMin);
      const color =
        status.state === 'INUNDATED'
          ? '#ef4444'
          : status.state === 'THREATENED'
          ? '#f59e0b'
          : '#22c55e';

      const iconHtml = `
        <div style="
          background: rgba(19,28,44,0.95);
          border: ${isTarget ? '2px solid #38bdf8' : `1.5px solid ${color}85`};
          border-radius: 7px; padding: 3px 8px;
          display: flex; align-items: center; gap: 6px;
          box-shadow: ${isTarget ? '0 0 16px #38bdf8' : '0 3px 10px rgba(0,0,0,0.5)'};
          white-space: nowrap; cursor: pointer;
        ">
          <span style="width:7px; height:7px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
          <div style="display:flex; flex-direction:column;">
            <span style="color:#f8fafc; font-size:10px; font-weight:700;">${st.name}</span>
            <span style="color:#94a3b8; font-size:9px; font-mono;">T+${st.arrivalMin}m · ${st.population.toLocaleString()} pop</span>
          </div>
        </div>`;

      const icon = L.divIcon({
        className: '',
        html: iconHtml,
        iconSize: [150, 28],
        iconAnchor: [75, 14],
      });

      const marker = L.marker([st.lat, st.lon], { icon, zIndexOffset: isTarget ? 1000 : 700 })
        .addTo(map)
        .bindTooltip(
          `<div style="font-size:11px; line-height:1.4">
            <strong style="color:#f8fafc">${st.name}</strong><br/>
            Status: <span style="color:${color}; font-weight:700">${status.label}</span><br/>
            Population: <strong>${st.population.toLocaleString()}</strong><br/>
            Flood Wave Arrival: <strong>T+${st.arrivalMin} min</strong><br/>
            Peak Depth: <strong>${st.peakDepthM} m</strong><br/>
            Safe Shelter: <strong>${st.safeShelter || 'Designated High Ground'}</strong><br/>
            <span style="color:#94a3b8; font-size:9px">PROTOTYPE FIXTURE</span>
          </div>`,
          { direction: 'top' }
        );

      marker.on('click', () => {
        setActiveSettlementId(st.id);
        const areaData = getSelectedAreaExposure(st.lat, st.lon, queryRadiusKm, currentTimeMin);
        setSelectedArea(areaData);
        setIsInspectorOpen(true);
      });

      layersRef.current.settlements.push(marker);
    });
  }, [currentTimeMin, layerVisibility.settlements, zoomLevel, filters, activeSettlementId]);

  // 5. Update Critical Infrastructure Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    layersRef.current.infrastructure.forEach((m) => {
      try {
        map.removeLayer(m);
      } catch (_) {}
    });
    layersRef.current.infrastructure = [];

    if (!layerVisibility.infrastructure) return;

    PROTOTYPE_INFRASTRUCTURE.forEach((asset) => {
      const risk = getInfrastructureRisk(asset, currentTimeMin);
      const typeDef = INFRA_TYPES[asset.type] || { icon: '🏢', symbol: '■' };
      const isSelected = selectedAsset?.id === asset.id;

      // Filter: at full basin zoom (<10), only show major assets (dams, hospitals)
      if (zoomLevel < 10 && !['dam', 'hospital'].includes(asset.type)) {
        return;
      }

      const markerHtml = `
        <div style="
          width: 22px; height: 22px; border-radius: 6px;
          background: rgba(12,18,32,0.92);
          border: ${isSelected ? '2px solid #38bdf8' : `1.5px solid ${risk.color}90`};
          box-shadow: ${isSelected ? '0 0 12px #38bdf8' : `0 2px 6px rgba(0,0,0,0.5)`};
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; cursor: pointer; transition: transform 0.15s;
        ">
          ${typeDef.icon}
        </div>`;

      const icon = L.divIcon({
        className: '',
        html: markerHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([asset.lat, asset.lon], { icon, zIndexOffset: 500 })
        .addTo(map)
        .bindTooltip(
          `<div style="font-family:monospace;font-size:10px;line-height:1.4">
            <strong style="color:#f1f5f9">${asset.name}</strong><br/>
            Type: <strong>${typeDef.label}</strong><br/>
            Risk: <span style="color:${risk.color};font-weight:700">${risk.label}</span><br/>
            Access: <strong>${asset.accessRoadStatus.replace(/_/g, ' ')}</strong><br/>
            <span style="color:#94a3b8;font-size:8px">PROTOTYPE INFRASTRUCTURE</span>
          </div>`,
          { direction: 'top' }
        );

      marker.on('click', () => {
        setSelectedAsset(asset);
        setIsInspectorOpen(true);
      });

      layersRef.current.infrastructure.push(marker);
    });
  }, [currentTimeMin, layerVisibility.infrastructure, selectedAsset, zoomLevel]);

  // 6. Update District Admin Boundaries Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    layersRef.current.districts.forEach((d) => {
      try {
        map.removeLayer(d);
      } catch (_) {}
    });
    layersRef.current.districts = [];

    if (!layerVisibility.admin_exposure) return;

    const districtExposureList = getDistrictExposure(currentTimeMin);

    districtExposureList.forEach((district) => {
      const poly = L.polygon(district.boundaryPolygon, {
        color: '#60a5fa',
        weight: 1.5,
        dashArray: '6,6',
        fillColor: '#3b82f6',
        fillOpacity: 0.04,
      }).addTo(map);

      poly.bindTooltip(
        `<div style="font-family:monospace;font-size:10px;line-height:1.4">
          <strong style="color:#60a5fa">${district.name.toUpperCase()}</strong><br/>
          Flooded Area: <strong>${district.floodedAreaKm2} km²</strong><br/>
          Exposed Pop: <strong style="color:${district.exposedPop > 0 ? '#ef4444' : '#22c55e'}">${district.exposedPop.toLocaleString()}</strong><br/>
          Affected Settlements: <strong>${district.exposedSettlements} / ${district.totalDistrictSettlements}</strong><br/>
          <span style="color:#94a3b8;font-size:8px">PROTOTYPE EXPOSURE</span>
        </div>`,
        { sticky: true }
      );

      poly.on('click', () => {
        const areaData = getSelectedAreaExposure(
          district.center[0],
          district.center[1],
          12,
          currentTimeMin
        );
        setSelectedArea(areaData);
        setIsInspectorOpen(true);
      });

      layersRef.current.districts.push(poly);
    });
  }, [currentTimeMin, layerVisibility.admin_exposure]);

  const toggleLayer = (key) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFitFlood = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([30.26, 78.44], 10, { duration: 0.8 });
  };

  const handleFocusAsset = (asset) => {
    const map = mapInstanceRef.current;
    if (!map || !asset) return;
    map.flyTo([asset.lat, asset.lon], 14, { duration: 0.6 });
    setSelectedAsset(asset);
  };

  const handleFocusSettlement = (settlement) => {
    const map = mapInstanceRef.current;
    if (!map || !settlement) return;
    map.flyTo([settlement.lat, settlement.lon], 14, { duration: 0.6 });
  };

  const currentTimeHrs = currentTimeMin / 60;

  // Before run: show scenario canvas
  if (!hasRun && !simulationResult && !isSimulating) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-8 bg-[var(--surface-0)]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-6 items-center max-w-md w-full px-6"
        >
          <div className="text-center space-y-2">
            <p className="text-[10px] font-semibold tracking-widest text-blue-400 uppercase">
              Simulation Lab
            </p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Tehri Dam Breach Simulation
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Coupled DualSPHysics near-field (0–2 km) + Delft3D FM far-field (2–100 km) flood routing with spatial population & critical infrastructure exposure.
            </p>
          </div>

          <div className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] divide-y divide-[var(--surface-border)]">
            {[
              ['Scenario', 'Tehri Dam Severe Breach'],
              ['Pipeline', 'DualSPHysics → Delft3D FM'],
              ['Reach', '0 – 100 km Bhagirathi corridor'],
              ['Exposure Layers', 'Population Raster & Infrastructure'],
              ['Data Standard', 'PROTOTYPE FIXTURE'],
            ].map(([label, value]) => (
              <div key={label} className="inspector-row px-4">
                <span className="inspector-row__label">{label}</span>
                <span className="inspector-row__value text-[11px]">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => {
                onRunSimulation?.();
                setHasRun(true);
                setIsPlaying(true);
              }}
              disabled={isSimulating}
              className="
                w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500
                text-white font-semibold text-sm tracking-wide
                transition shadow-lg shadow-blue-900/30
                disabled:opacity-50 flex items-center justify-center gap-2
              "
            >
              <Play className="w-4 h-4 fill-white" />
              Run Flood Simulation
            </button>
            <button
              onClick={() => {
                setHasRun(true);
                setIsPlaying(false);
              }}
              className="w-full py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-secondary)] text-sm hover:border-[var(--surface-border-strong)] hover:text-[var(--text-primary)] transition"
            >
              Load prototype data
            </button>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--surface-border)] w-full">
            <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              All outputs are <strong className="text-[var(--text-secondary)]">PROTOTYPE FIXTURE</strong> values for demonstration. No live solver execution occurs.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Full simulation workspace
  return (
    <div className="w-full h-full flex flex-col bg-[var(--surface-0)] overflow-hidden">
      {/* Slim sim context bar */}
      <div className="h-9 px-4 flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface-1)] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
            MODEL: DualSPHysics &rarr; LISFLOOD-FP | PHYSICAL VALIDATION: NOT AVAILABLE
          </span>
          <span className="status-pill status-pill--prototype">WHAT-IF HYDRODYNAMIC BENCHMARK</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-[var(--text-primary)] tabular-nums">
            {currentTimeMin < 60
              ? `T+${currentTimeMin}m`
              : `T+${Math.floor(currentTimeMin / 60)}h ${currentTimeMin % 60}m`}
          </span>

          {isFinished && onNavigateToHadr && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={onNavigateToHadr}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-600/20 border border-amber-500/30 text-amber-400 text-[10px] font-semibold hover:bg-amber-600/30 transition"
            >
              <ShieldAlert className="w-3 h-3" />
              View HADR
              <ArrowRight className="w-3 h-3" />
            </motion.button>
          )}

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTimeMin(initialTimeMin);
              setHasRun(false);
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition"
            title="Close simulation"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Body: Map (Left) + Simulation Inspector (Right) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Map Area */}
        <div className="flex-1 relative overflow-hidden min-w-0">
          {mapDimension === '3D' ? (
            <CesiumTerrainViewer onReturnTo2D={() => setMapDimension('2D')} />
          ) : (
            <>
              <div ref={mapContainerRef} className="map-canvas" />

              {/* Floating Depth Legend */}
              <div className="floating-control absolute top-3 right-3 z-10 p-3 space-y-1.5">
                <p className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-2">
                  MODELLED MAXIMUM DEPTH
                </p>
                {[
                  { color: 'bg-red-500 border-red-700', label: '> 5 m' },
                  { color: 'bg-orange-500 border-orange-700', label: '3 – 5 m' },
                  { color: 'bg-yellow-500 border-yellow-700', label: '1.5 – 3 m' },
                  { color: 'bg-blue-500 border-blue-700', label: '0.5 – 1.5 m' },
                  { color: 'bg-cyan-400 border-cyan-600', label: '0.05 – 0.5 m' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-3 h-2.5 rounded-sm border ${color}`} />
                    <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
                  </div>
                ))}
              </div>

              {/* Top Administrative & Settlement Hierarchy Filter Toolbar */}
              <div className="absolute top-4 left-4 z-20 max-w-[calc(100%-240px)]">
                <HierarchyFilterBar
                  zoomLevel={zoomLevel}
                  filters={filters}
                  onFilterChange={setFilters}
                  settlements={PROTOTYPE_SETTLEMENTS}
                  activeSettlementId={activeSettlementId}
                  onSelectSettlementId={(id) => {
                    setActiveSettlementId(id);
                    const st = PROTOTYPE_SETTLEMENTS.find((s) => s.id === id);
                    if (st && mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([st.lat, st.lon], 14, { duration: 0.6 });
                      const areaData = getSelectedAreaExposure(st.lat, st.lon, queryRadiusKm, currentTimeMin);
                      setSelectedArea(areaData);
                      setIsInspectorOpen(true);
                    }
                  }}
                />
              </div>

              {/* Floating Map Controls */}
              <FloatingMapControls
                layerVisibility={layerVisibility}
                onToggleLayer={toggleLayer}
                onFitFlood={handleFitFlood}
                onFollowFront={() => setFollowFront(!followFront)}
                followFront={followFront}
                isInspectorOpen={isInspectorOpen}
                onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
                mapDimension={mapDimension}
                onToggleDimension={() => setMapDimension(mapDimension === '2D' ? '3D' : '2D')}
                onSelectCameraPreset={(preset) => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo(preset.center, preset.zoom, { duration: 0.8 });
                  }
                }}
              />
            </>
          )}
        </div>

        {/* Dynamic Right Simulation Inspector (320px) */}
        {isInspectorOpen && (
          <div
            style={{ width: '320px', flexShrink: 0 }}
            className="h-full overflow-hidden z-10"
          >
            <SimulationInspector
              currentTimeMin={currentTimeMin}
              selectedAsset={selectedAsset}
              onSelectAsset={setSelectedAsset}
              selectedArea={selectedArea}
              onClearSelectedArea={() => setSelectedArea(null)}
              onSelectRadius={setQueryRadiusKm}
              onSelectSettlement={handleFocusSettlement}
              onFocusAsset={handleFocusAsset}
              onClose={() => setIsInspectorOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Playback rail (4-Hour Domain Timeline) */}
      <PlaybackRail
        currentTimeMin={currentTimeMin}
        onTimeChange={handleTimeChange}
        isPlaying={isPlaying}
        maxTimeMin={13.33}
        onTogglePlay={() => {
          if (isFinished) {
            setCurrentTimeMin(0);
          }
          setIsPlaying(!isPlaying);
        }}
        onReset={() => {
          setIsPlaying(false);
          setCurrentTimeMin(0);
        }}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        isAnalyticsOpen={isAnalyticsOpen}
        onToggleAnalytics={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
      />

      {/* Analytics strip */}
      <AnalyticsStrip
        isOpen={isAnalyticsOpen}
        currentTimeMin={currentTimeMin}
        currentTimeHrs={currentTimeHrs}
      />
    </div>
  );
}
