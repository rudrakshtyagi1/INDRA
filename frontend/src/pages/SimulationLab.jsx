import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  Info,
  Layers,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Activity,
  Scale,
  Waves,
  FileCheck,
  ChevronUp,
  ChevronDown,
  Camera,
  ShieldAlert,
  Zap,
  AlertTriangle,
  Bell,
  Shield,
  Users,
  MapPin,
  CheckCircle2,
  ChevronRight,
  X,
  Navigation,
  Truck,
  HeartPulse,
  Radio,
  Crosshair,
} from 'lucide-react';
import L from 'leaflet';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import { useRun } from '../context/RunContext';
import { useV3Data } from '../hooks/useV3Data';
import { api } from '../services/api';
import v4FramesMeta from '../data/v4_frames_meta.json';
import {
  UTTARAKHAND_CORRIDOR_BOUNDS,
  UTTARAKHAND_MAX_BOUNDS,
  UTTARAKHAND_FOCAL_PRESETS,
  generateVillageBuildings,
} from '../data/uttarakhandBuildings';
import SphParticleCanvas from '../components/simulation/SphParticleCanvas';
import FroudeCouplingPanel from '../components/simulation/FroudeCouplingPanel';
import BreachBenchmarkPanel from '../components/simulation/BreachBenchmarkPanel';
import FrameAuditTable from '../components/simulation/FrameAuditTable';
import CVDamMonitorPanel from '../components/simulation/CVDamMonitorPanel';
import {
  PROTOTYPE_TACTICAL_ROUTES,
  PROTOTYPE_NDRF_BASE,
  calculateOperationalMargin,
} from '../data/prototype/tehriPrototypeRoutes';

const SPEEDS = [1, 2, 5, 10];

export default function SimulationLab({ initialTimeMin, onTimeChange, onNavigateToHadr }) {
  const { currentRun, selectedRunId, setSimTimeSec } = useRun();
  const v3 = useV3Data();

  const isV4 = selectedRunId === 'v4_extended';
  const durationSec = currentRun.simulation_window_s || 3600;
  const frameIntervalSec = currentRun.frames_interval_s || 60;
  const getSubViewFromUrl = () => {
    if (typeof window === 'undefined') return 'lisflood';
    let v = new URLSearchParams(window.location.search).get('view');
    if (v && ['lisflood', 'cv', 'sph', 'coupling', 'breach', 'audit'].includes(v)) return v;
    if (window.location.hash.includes('?')) {
      v = new URLSearchParams(window.location.hash.split('?')[1]).get('view');
      if (v && ['lisflood', 'cv', 'sph', 'coupling', 'breach', 'audit'].includes(v)) return v;
    }
    return 'lisflood';
  };

  const getTimeFromUrl = () => {
    if (typeof window === 'undefined') return 0;
    let t = new URLSearchParams(window.location.search).get('t');
    if (t) return parseInt(t, 10);
    if (window.location.hash.includes('?')) {
      t = new URLSearchParams(window.location.hash.split('?')[1]).get('t');
      if (t) return parseInt(t, 10);
    }
    return 0;
  };

  // Sub-view mode: 'lisflood', 'cv', 'sph', 'coupling', 'breach', 'audit'
  const [subView, setSubView] = useState(getSubViewFromUrl);
  const [currentSec, setCurrentSec] = useState(getTimeFromUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [timelineMetric, setTimelineMetric] = useState('wet_area'); // 'wet_area', 'max_depth', 'roads'
  const [cvAlert, setCvAlert] = useState(null);
  const [villageRiskData, setVillageRiskData] = useState(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState('telemetry'); // 'telemetry' or 'villages'
  const [dismissedAlerts, setDismissedAlerts] = useState({});

  // Layer Toggles - modelDomain disabled by default to eliminate square clutter
  const [layers, setLayers] = useState({
    temporalDepth: true,
    maxDepth: false,
    arrivalTime: false,
    roads: true,
    settlements: true,
    buildings: true, // House-level footprints enabled by default
    bridges: true,
    modelDomain: false,
  });

  const toggleLayer = (k) => setLayers((prev) => ({ ...prev, [k]: !prev[k] }));

  // Base map & camera zoom focal presets
  const [activeBaseLayer, setActiveBaseLayer] = useState('satellite'); // 'satellite' or 'streets'
  const [currentZoomPreset, setCurrentZoomPreset] = useState('corridor');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const domainLayerRef = useRef(null);
  const floodFrameRef = useRef(null);
  const roadsLayerRef = useRef(null);
  const settlementsLayerRef = useRef(null);
  const sheltersLayerRef = useRef(null);
  const evacuationRoutesRef = useRef(null);
  const buildingsLayerRef = useRef(null);
  const bridgesLayerRef = useRef(null);
  const floodJetRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const allVillageBuildings = useRef({});

  // Live Road Collision & Multi-Modal Rerouting States
  const [selectedRerouteKey, setSelectedRerouteKey] = useState('sirain');
  const [rerouteMode, setRerouteMode] = useState('ROAD'); // 'ROAD' (Ridge Bypass), 'AIR_EVAC' (Helicopter), 'REJECTED' (Collided Road)
  const [isReroutingHudOpen, setIsReroutingHudOpen] = useState(true);
  const [dispatchedConvoy, setDispatchedConvoy] = useState(null);

  const collisionMarkersRef = useRef(null);
  const rerouteVectorGroupRef = useRef(null);
  const convoyMarkerRef = useRef(null);

  // Dynamic Water-Road Collision Calculation across Bhagirathi corridor
  const activeCollisions = useMemo(() => {
    const list = [];
    Object.entries(PROTOTYPE_TACTICAL_ROUTES).forEach(([key, data]) => {
      const floodMin = data.rejectedRoute?.bridgeFloodMin || data.floodArrivalMin || 10;
      const floodSec = floodMin * 60;
      const isCollided = currentSec >= floodSec;
      const isImpactActive = currentSec >= floodSec && currentSec <= floodSec + 360;
      const peakDepthM = data.peakDepthM || 28.0;
      const pt = data.rejectedRoute?.hazardPointCoords || [30.368, 78.470];

      list.push({
        key,
        name: data.settlementName,
        kmFromDam: data.kmFromDam,
        floodMin,
        floodSec,
        isCollided,
        isImpactActive,
        peakDepthM,
        point: pt,
        hazardReason: data.rejectedRoute?.hazardReason || 'Low valley road submerged by flood wave.',
        roadRoute: data.roadRoute,
        rejectedRoute: data.rejectedRoute,
        airEvacRoute: data.airEvacRoute,
        population: data.population,
      });
    });
    return list;
  }, [currentSec]);

  // Current Frame Index
  const frameIndex = isV4
    ? Math.min(60, Math.max(0, Math.round(currentSec / 60)))
    : Math.min(16, Math.max(0, Math.round(currentSec / 50)));

  // Current frame metadata
  const currentFrameInfo = isV4 ? v4FramesMeta[frameIndex] : null;
  const wetAreaKm2 = currentFrameInfo ? currentFrameInfo.wet_area_km2 : (currentSec > 0 ? (currentSec / 800) * 12.4 : 0);
  const wetCells = currentFrameInfo ? currentFrameInfo.wet_cells : Math.round(wetAreaKm2 * 1111);
  const frameMaxDepth = currentFrameInfo ? currentFrameInfo.max_depth_m : (currentSec > 0 ? 27.2 : 0);

  // Wetted road calculation for currentSec
  const wettedRoadCount =
    v3.v3Roads?.features?.filter((r) => (r.properties?.arrival_time_hr || 0) * 3600 <= currentSec).length ||
    (currentSec > 120 ? Math.min(currentRun.road_segments_intersected || 74, Math.round((currentSec / 3600) * 74)) : 0);

  // Simulation Playback Timer Effect (increments currentSec when isPlaying is true)
  useEffect(() => {
    if (!isPlaying) return;
    const stepIntervalMs = Math.max(100, Math.round(1000 / playbackSpeed));
    const timer = setInterval(() => {
      setCurrentSec((prev) => {
        const next = prev + frameIntervalSec;
        if (next >= durationSec) {
          setIsPlaying(false);
          return durationSec;
        }
        return next;
      });
    }, stepIntervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, durationSec, frameIntervalSec]);

  // Sync with global mission bar time and notify parent
  useEffect(() => {
    setSimTimeSec(currentSec);
    if (onTimeChange) {
      onTimeChange(Math.round(currentSec / 60));
    }
  }, [currentSec, setSimTimeSec, onTimeChange]);

  // Initial time sync from prop if provided
  useEffect(() => {
    if (initialTimeMin !== undefined && initialTimeMin > 0 && currentSec === 0) {
      setCurrentSec(initialTimeMin * 60);
    }
  }, [initialTimeMin]);

  const togglePlay = () => {
    if (!isPlaying && currentSec >= durationSec) {
      setCurrentSec(0);
    }
    setIsPlaying((prev) => !prev);
  };

  // Live Village Risk Assessment & Corridor Sync
  useEffect(() => {
    let isSubscribed = true;
    api.assessVillageRisk({
      mode: 'DEMO',
      scenario_id: 'ENS_P50',
      sim_time_s: currentSec,
    })
      .then((res) => {
        if (!isSubscribed || !res) return;
        setVillageRiskData(res);
      })
      .catch((err) => {
        console.error('Village risk assessment sync error:', err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentSec]);

  // Precompute building footprints for each village
  useEffect(() => {
    if (!villageRiskData?.settlements) return;
    const blds = {};
    villageRiskData.settlements.forEach((s) => {
      blds[s.settlement_id] = generateVillageBuildings(s.settlement_id, s.longitude, s.latitude, s.elevation_m);
    });
    allVillageBuildings.current = blds;
  }, [villageRiskData?.settlements]);

  // Reset currentSec only on run ID change and fit camera to Uttarakhand
  const prevRunIdRef = useRef(selectedRunId);
  useEffect(() => {
    if (prevRunIdRef.current !== selectedRunId) {
      prevRunIdRef.current = selectedRunId;
      setCurrentSec(0);
      setIsPlaying(false);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(UTTARAKHAND_CORRIDOR_BOUNDS, { padding: [20, 20] });
    }
  }, [selectedRunId]);

  // Initialize Map (Strictly locked to Uttarakhand Corridor)
  useEffect(() => {
    if (subView !== 'lisflood') return;
    if (mapInstanceRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      minZoom: 10,
      maxZoom: 19,
      maxBounds: UTTARAKHAND_MAX_BOUNDS,
      maxBoundsViscosity: 1.0, // strictly prevent scrolling away from Uttarakhand
    });

    // High-resolution basemap
    const tileUrl =
      activeBaseLayer === 'streets'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution:
        activeBaseLayer === 'streets'
          ? '&copy; OpenStreetMap contributors'
          : '&copy; Esri, Maxar, Earthstar Geographics',
      maxZoom: 19,
      maxNativeZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Custom Map Panes to preserve clear visual layering of water vs roads
    map.createPane('waterPane');
    map.getPane('waterPane').style.zIndex = 410;

    map.createPane('roadsPane');
    map.getPane('roadsPane').style.zIndex = 425;

    map.createPane('reroutePane');
    map.getPane('reroutePane').style.zIndex = 435;

    // Initial camera focus on Uttarakhand Bhagirathi corridor
    map.fitBounds(UTTARAKHAND_CORRIDOR_BOUNDS, { padding: [20, 20] });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      baseTileLayerRef.current = null;
    };
  }, [subView]);

  // Base Tile Layer Switcher (Satellite vs Streets)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }

    const tileUrl =
      activeBaseLayer === 'streets'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution:
        activeBaseLayer === 'streets'
          ? '&copy; OpenStreetMap contributors'
          : '&copy; Esri, Maxar, Earthstar Geographics',
      maxZoom: 19,
      maxNativeZoom: 18,
    });

    tileLayer.addTo(map);
    baseTileLayerRef.current = tileLayer;
  }, [activeBaseLayer]);

  // Model Domain Boundary Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (domainLayerRef.current) {
      map.removeLayer(domainLayerRef.current);
      domainLayerRef.current = null;
    }

    if (layers.modelDomain && currentRun.domain_bounds) {
      const b = currentRun.domain_bounds;
      const rect = L.rectangle(b, {
        color: '#0284C7',
        weight: 1,
        dashArray: '3, 6',
        fill: false,
        opacity: 0.35,
      });

      rect.bindTooltip(
        `MODEL DOMAIN (${currentRun.domain_km} km reach)`,
        { permanent: false, direction: 'top', className: 'operational-tooltip' }
      );

      rect.addTo(map);
      domainLayerRef.current = rect;
    }
  }, [layers.modelDomain, currentRun]);

  // Dynamic Flood Water Inundation Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!layers.temporalDepth) {
      if (floodFrameRef.current) {
        map.removeLayer(floodFrameRef.current);
        floodFrameRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    // Fetch dynamic temporal flood wave frame
    fetch(`/api/scenarios/v3/frames/${currentSec}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((frameGeoJson) => {
        if (!isSubscribed || !frameGeoJson) return;

        if (floodFrameRef.current) {
          map.removeLayer(floodFrameRef.current);
          floodFrameRef.current = null;
        }

        const isBreached = cvAlert?.sync_state?.cv_breach_detected;

        const layer = L.geoJSON(frameGeoJson, {
          pane: 'waterPane',
          smoothFactor: 0.5,
          style: () => ({
            fillColor: isBreached ? '#1E40AF' : '#0284C7',
            fillOpacity: isBreached ? 0.82 : 0.72,
            color: isBreached ? '#60A5FA' : '#38BDF8',
            weight: 1.5,
            lineCap: 'round',
            lineJoin: 'round',
          }),
          onEachFeature: (feature, l) => {
            const reachKm = feature.properties?.wave_front_km || Math.round((currentSec / 3600) * 65);
            const depthM = feature.properties?.depth_at_head_m || (currentSec > 0 ? 24.5 : 0);
            l.bindTooltip(
              `<div style="font-family:monospace; font-size:10px; font-weight:bold; padding:2px;">
                <div style="color:${isBreached ? '#EF4444' : '#38BDF8'};">🌊 ACTIVE FLOOD WAVE (T+${currentSec}s)</div>
                <div>Downstream Reach: ${reachKm} km</div>
                <div>Front Water Depth: ${depthM} m</div>
                ${isBreached ? '<div style="color:#FCA5A5;">BREACH FLUX: 723,705 m³/s</div>' : ''}
              </div>`,
              { sticky: true, className: 'operational-tooltip' }
            );
          },
        });

        layer.addTo(map);
        floodFrameRef.current = layer;
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [currentSec, layers.temporalDepth, cvAlert]);

  // Roads Vector Layer (Dynamic Submersion Styling)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (roadsLayerRef.current) {
      map.removeLayer(roadsLayerRef.current);
      roadsLayerRef.current = null;
    }

    if (layers.roads && v3.v3Roads) {
      const roadLayer = L.geoJSON(v3.v3Roads, {
        pane: 'roadsPane',
        style: (feature) => {
          const arrSec = feature.properties?.arrival_time_sec ?? (feature.properties?.arrival_time_hr ? feature.properties.arrival_time_hr * 3600 : 0);
          const isFlooded = currentSec > 0 && arrSec <= currentSec;
          return {
            color: isFlooded ? '#EF4444' : '#F59E0B',
            weight: isFlooded ? 3.5 : 1.8,
            opacity: isFlooded ? 0.95 : 0.65,
          };
        },
        onEachFeature: (feature, layer) => {
          const arrSec = feature.properties?.arrival_time_sec ?? (feature.properties?.arrival_time_hr ? feature.properties.arrival_time_hr * 3600 : 0);
          const isFlooded = currentSec > 0 && arrSec <= currentSec;
          layer.on('click', () => {
            setSelectedFeature({
              type: 'Road Segment',
              name: feature.properties?.name || 'Bhagirathi Valley Sector (NH-34)',
              status: isFlooded ? 'SUBMERGED (INUNDATED)' : 'PASSABLE (DRY)',
              arrivalSec: Math.round(arrSec),
              depthM: feature.properties?.max_depth_m || 8.4,
              kmFromDam: feature.properties?.km_from_dam || 14.2,
            });
          });
        },
      });

      roadLayer.addTo(map);
      roadsLayerRef.current = roadLayer;
    }
  }, [layers.roads, v3.v3Roads, currentSec]);

  // Physical Water-Road Collision Breach Markers & Tactical Multi-Modal Rerouting Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove existing layers
    if (collisionMarkersRef.current) {
      map.removeLayer(collisionMarkersRef.current);
      collisionMarkersRef.current = null;
    }
    if (rerouteVectorGroupRef.current) {
      map.removeLayer(rerouteVectorGroupRef.current);
      rerouteVectorGroupRef.current = null;
    }

    if (!layers.roads) return;

    const collGroup = L.layerGroup();
    const routeGroup = L.layerGroup();

    // 1. Render Active Water-Road Collision Breach Points & Submerged Valley Road Hazards
    activeCollisions.forEach((col) => {
      if (col.isCollided) {
        // High-Visibility Collision Beacon with pulsating water splash ripple
        const iconHtml = `
          <div class="collision-beacon" title="💥 WATER-ROAD COLLISION: ${col.name}">
            <div class="collision-beacon__ring"></div>
            <div class="collision-beacon__ring-delay"></div>
            <div class="collision-beacon__core">💥</div>
          </div>
        `;
        const collisionIcon = L.divIcon({
          className: '',
          html: iconHtml,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const marker = L.marker([col.point[0], col.point[1]], { icon: collisionIcon });
        marker.bindTooltip(
          `<div style="font-family:monospace; font-size:10px; padding:3px 5px; min-width:220px;">
            <div style="color:#EF4444; font-weight:bold; font-size:11px; border-bottom:1px solid #7F1D1D; padding-bottom:2px; margin-bottom:3px;">
              💥 WATER-ROAD COLLISION (T+${col.floodMin}m)
            </div>
            <div style="color:#FFF; font-weight:bold; font-size:11px;">${col.name} Sector Severed</div>
            <div style="color:#94A3B8; font-size:9px;">Corridor Chainage: Km ${col.kmFromDam} &middot; Pop: ${col.population}</div>
            <div style="color:#38BDF8; font-size:9px; margin-top:2px;">Water Depth at Road: <b style="color:#67E8F9; font-size:10px;">+${col.peakDepthM} m</b></div>
            <div style="color:#FCA5A5; font-size:9px; margin-top:1px;">${col.hazardReason}</div>
            <div style="color:#34D399; font-weight:bold; font-size:9px; margin-top:3px; border-top:1px dashed #334155; padding-top:2px;">
              🟢 High-Ridge Bypass Active (Safe Elev > 1,400m)
            </div>
          </div>`,
          { className: 'operational-tooltip', direction: 'top', offset: [0, -12] }
        );

        marker.on('click', () => {
          setSelectedRerouteKey(col.key);
          setSelectedFeature({
            type: 'Water-Road Collision Incident',
            name: `${col.name} Low-Crossing Submersion`,
            status: '⛔ WATER COLLISION ACTIVE · ROAD SEVERED',
            chainage: `Km ${col.kmFromDam} downstream`,
            peakDepthM: col.peakDepthM,
            arrivalMin: col.floodMin,
            hazardReason: col.hazardReason,
            action: 'Rerouting responders via Chamba High-Ridge Bypass',
          });
        });

        marker.addTo(collGroup);

        // Submerged Valley Low Road segment (Red hazard line)
        if (col.rejectedRoute?.routeCoords?.length) {
          const subLine = L.polyline(
            col.rejectedRoute.routeCoords.map(([lat, lon]) => [lat, lon]),
            {
              pane: 'reroutePane',
              color: '#EF4444',
              weight: 3.5,
              opacity: 0.9,
              dashArray: '6, 6',
            }
          );
          subLine.bindTooltip(
            `<div style="font-family:monospace; font-size:10px; padding:2px;">
              <b style="color:#EF4444;">⛔ SUBMERGED ROAD SECTOR (INUNDATED)</b><br/>
              ${col.name} Low Road &middot; Flood Stage: +${col.peakDepthM}m
            </div>`,
            { className: 'operational-tooltip', direction: 'top' }
          );
          subLine.addTo(collGroup);
        }
      }
    });

    // 2. Render Tactical Rerouting Bypass for the selected settlement
    const activeRouteData = PROTOTYPE_TACTICAL_ROUTES[selectedRerouteKey] || PROTOTYPE_TACTICAL_ROUTES.sirain;

    // A. Recommended High-Ridge Safe Bypass (Green)
    if (activeRouteData.roadRoute?.routeCoords?.length) {
      const ridgeLine = L.polyline(
        activeRouteData.roadRoute.routeCoords.map(([lat, lon]) => [lat, lon]),
        {
          pane: 'reroutePane',
          color: '#10B981',
          weight: rerouteMode === 'ROAD' ? 4.5 : 2.5,
          opacity: rerouteMode === 'ROAD' ? 0.95 : 0.45,
        }
      );
      ridgeLine.bindTooltip(
        `<div style="font-family:monospace; font-size:10px; padding:3px;">
          <b style="color:#34D399;">🟢 RECOMMENDED HIGH-RIDGE BYPASS (ELEV > 1,400m MSL)</b><br/>
          From: ${PROTOTYPE_NDRF_BASE.shortName} &rarr; ${activeRouteData.settlementName}<br/>
          Distance: ${activeRouteData.roadRoute.distKm} km &middot; ETA: ${activeRouteData.roadRoute.etaMin} min<br/>
          Safety Clearance: Safe above 34m flood wave
        </div>`,
        { className: 'operational-tooltip', direction: 'top' }
      );
      ridgeLine.addTo(routeGroup);
    }

    // B. Helicopter Air Evacuation Vector (Purple)
    if (activeRouteData.airEvacRoute?.routeCoords?.length && (rerouteMode === 'AIR_EVAC' || rerouteMode === 'ALL')) {
      const airLine = L.polyline(
        activeRouteData.airEvacRoute.routeCoords.map(([lat, lon]) => [lat, lon]),
        {
          pane: 'reroutePane',
          color: '#C084FC',
          weight: rerouteMode === 'AIR_EVAC' ? 3.5 : 2.0,
          opacity: rerouteMode === 'AIR_EVAC' ? 0.95 : 0.5,
          dashArray: '4, 8',
        }
      );
      airLine.bindTooltip(
        `<div style="font-family:monospace; font-size:10px; padding:2px;">
          <b style="color:#C084FC;">🚁 HELICOPTER EXTRACTION VECTOR</b><br/>
          Chamba Helipad &rarr; ${activeRouteData.settlementName} LZ (ETA: 5 min)
        </div>`,
        { className: 'operational-tooltip', direction: 'top' }
      );
      airLine.addTo(routeGroup);
    }

    // C. NDRF Staging Base Marker (Chamba Ridge)
    const baseIcon = L.divIcon({
      className: '',
      html: `
        <div style="
          background: #0F172A; border: 2px solid #38BDF8; border-radius: 4px;
          padding: 2px 6px; font-family: monospace; font-size: 9px; font-weight: bold;
          color: #38BDF8; white-space: nowrap; box-shadow: 0 0 10px rgba(56, 189, 248, 0.6);
          display: flex; align-items: center; gap: 4px;
        ">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38BDF8;"></span>
          NDRF BASE (1,450m MSL)
        </div>
      `,
      iconSize: [120, 20],
      iconAnchor: [60, 10],
    });
    const baseMarker = L.marker([PROTOTYPE_NDRF_BASE.lat, PROTOTYPE_NDRF_BASE.lon], { icon: baseIcon });
    baseMarker.bindTooltip(
      `<div style="font-family:monospace; font-size:10px;">
        <b style="color:#38BDF8;">🛡️ ${PROTOTYPE_NDRF_BASE.name}</b><br/>
        Elevation: 1,450m MSL (Safe from flood wave)<br/>
        Forward Operations &amp; Fleet Staging
      </div>`,
      { className: 'operational-tooltip', direction: 'top' }
    );
    baseMarker.addTo(routeGroup);

    collGroup.addTo(map);
    routeGroup.addTo(map);

    collisionMarkersRef.current = collGroup;
    rerouteVectorGroupRef.current = routeGroup;
  }, [currentSec, selectedRerouteKey, rerouteMode, activeCollisions, layers.roads]);

  // Animated Rescue Convoy Movement on High-Ridge Bypass
  useEffect(() => {
    if (!dispatchedConvoy?.active || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const activeRouteData = PROTOTYPE_TACTICAL_ROUTES[dispatchedConvoy.settlementKey] || PROTOTYPE_TACTICAL_ROUTES.sirain;
    const coords = activeRouteData.roadRoute?.routeCoords || [];
    if (!coords.length) return;

    const interval = setInterval(() => {
      setDispatchedConvoy((prev) => {
        if (!prev || !prev.active) return prev;
        const nextProgress = prev.progress + 0.05;
        if (nextProgress >= 1.0) {
          clearInterval(interval);
          if (convoyMarkerRef.current) {
            map.removeLayer(convoyMarkerRef.current);
            convoyMarkerRef.current = null;
          }
          return { ...prev, progress: 1.0, active: false };
        }

        const totalIdx = (coords.length - 1) * nextProgress;
        const idx = Math.floor(totalIdx);
        const frac = totalIdx - idx;
        const p1 = coords[idx];
        const p2 = coords[Math.min(coords.length - 1, idx + 1)];
        const lat = p1[0] + (p2[0] - p1[0]) * frac;
        const lon = p1[1] + (p2[1] - p1[1]) * frac;

        if (convoyMarkerRef.current) {
          convoyMarkerRef.current.setLatLng([lat, lon]);
        } else {
          const convoyIcon = L.divIcon({
            className: '',
            html: '<div class="rescue-convoy-marker">🚙</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          const m = L.marker([lat, lon], { icon: convoyIcon });
          m.bindTooltip('<b>🚙 NDRF RESCUE QRF CONVOY</b><br/>En Route via High Ridge Bypass', {
            className: 'operational-tooltip',
            direction: 'top',
          });
          m.addTo(map);
          convoyMarkerRef.current = m;
        }

        return { ...prev, progress: nextProgress };
      });
    }, 400);

    return () => clearInterval(interval);
  }, [dispatchedConvoy?.active, dispatchedConvoy?.settlementKey]);

  // Village Risk, Evacuation Routes & Safe Shelters Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (settlementsLayerRef.current) {
      map.removeLayer(settlementsLayerRef.current);
      settlementsLayerRef.current = null;
    }
    if (sheltersLayerRef.current) {
      map.removeLayer(sheltersLayerRef.current);
      sheltersLayerRef.current = null;
    }
    if (evacuationRoutesRef.current) {
      map.removeLayer(evacuationRoutesRef.current);
      evacuationRoutesRef.current = null;
    }

    if (!layers.settlements && !layers.roads) return;

    // 1. Evacuation Routes
    if (villageRiskData?.evacuation_routes && layers.roads) {
      const routesGroup = L.layerGroup();
      villageRiskData.evacuation_routes.forEach((r) => {
        const isPassable = r.is_passable_at_sim_time;
        const color = isPassable ? '#10B981' : '#EF4444';
        const line = L.polyline(
          r.path_coordinates.map(([lon, lat]) => [lat, lon]),
          {
            color,
            weight: isPassable ? 2.5 : 3.0,
            opacity: isPassable ? 0.75 : 0.9,
            dashArray: isPassable ? null : '6, 6',
          }
        );
        line.bindTooltip(
          `<div style="font-family:monospace; font-size:10px; padding:2px;">
            <b style="color:${color};">${isPassable ? '🟢 PASSABLE EVACUATION ROUTE' : '⛔ ROAD SUBMERGED &amp; CUT OFF'}</b><br/>
            ${r.settlement_name} &rarr; ${r.shelter_name} (${r.distance_km} km)
          </div>`,
          { className: 'operational-tooltip', direction: 'top' }
        );
        line.addTo(routesGroup);
      });
      routesGroup.addTo(map);
      evacuationRoutesRef.current = routesGroup;
    }

    // 2. Safe Shelters
    if (villageRiskData?.shelters && layers.settlements) {
      const shelterGroup = L.layerGroup();
      villageRiskData.shelters.forEach((sh) => {
        const occ = sh.occupancy_percent || 0;
        const isFull = sh.is_at_capacity;
        const color = isFull ? '#EF4444' : occ > 60 ? '#F59E0B' : '#10B981';

        const shelterIcon = L.divIcon({
          className: '',
          html: `<div style="
            width: 18px; height: 18px; border-radius: 4px;
            background: #0f172a; border: 2px solid ${color};
            display: flex; align-items: center; justify-content: center;
            font-size: 9px; font-weight: 800; color: ${color};
            box-shadow: 0 0 8px ${color}80;
          ">S</div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        const mk = L.marker([sh.latitude, sh.longitude], { icon: shelterIcon });
        mk.bindTooltip(
          `<div style="font-family:monospace; font-size:10px; padding:2px;">
            <div style="color:${color}; font-weight:bold;">🛡️ RELIEF SHELTER: ${sh.name}</div>
            <div style="color:#94a3b8;">Occupancy: ${sh.allocated_evacuees} / ${sh.capacity} (${occ.toFixed(0)}%)</div>
            <div style="color:#38bdf8;">Elevation Clearance: +${sh.safety_margin_m}m above flood</div>
          </div>`,
          { className: 'operational-tooltip', direction: 'top' }
        );
        mk.on('click', () => {
          setSelectedFeature({
            type: 'Emergency Relief Shelter',
            name: sh.name,
            status: isFull ? 'AT CAPACITY (FULL)' : 'OPEN & ACCEPTING EVACUEES',
            capacity: `${sh.allocated_evacuees} / ${sh.capacity} (${occ.toFixed(0)}% full)`,
            elevation: `${sh.elevation_m} m (+${sh.safety_margin_m}m clearance)`,
            provenance: sh.provenance,
          });
        });
        mk.addTo(shelterGroup);
      });
      shelterGroup.addTo(map);
      sheltersLayerRef.current = shelterGroup;
    }

    // 3. Settlements & Communities along the corridor
    if (layers.settlements && villageRiskData?.settlements) {
      const settlementGroup = L.layerGroup();
      villageRiskData.settlements.forEach((s) => {
        const isCritical = s.priority_tier === 'CRITICAL_IMMEDIATE';
        const isHigh = s.priority_tier === 'HIGH_PRIORITY';
        const isWatch = s.priority_tier === 'ELEVATED_WATCH';

        const markerColor = isCritical ? '#EF4444' : isHigh ? '#F59E0B' : isWatch ? '#3B82F6' : '#10B981';
        const fillColor = isCritical ? '#B91C1C' : isHigh ? '#B45309' : isWatch ? '#1D4ED8' : '#047857';

        const icon = L.divIcon({
          className: '',
          html: `<div style="position:relative; width:22px; height:22px; display:flex; align-items:center; justify-content:center;">
            ${isCritical ? `<div style="position:absolute; width:100%; height:100%; border-radius:50%; background:${markerColor}40; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
            <div style="width:14px; height:14px; border-radius:50%; background:${fillColor}; border:2px solid ${markerColor}; box-shadow:0 0 10px ${markerColor}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:8px; font-weight:bold;">
              ${isCritical ? '!' : isHigh ? '▲' : '●'}
            </div>
          </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([s.latitude, s.longitude], { icon });

        const countdownText =
          s.isolation_status === 'DIRECTLY_INUNDATED'
            ? '⚠️ DIRECTLY INUNDATED'
            : s.isolation_status === 'ISOLATED_BY_FLOOD'
            ? '⛔ ACCESS ROAD CUT OFF (ISOLATED)'
            : s.isolation_status === 'ROAD_CUTOFF_IMMINENT'
            ? `⏳ ROAD CUTOFF IN ${s.time_to_isolation_countdown_min?.toFixed(0)} min`
            : `✅ ACCESSIBLE (Cutoff in ${s.time_to_isolation_countdown_min?.toFixed(0)} min)`;

        marker.bindTooltip(
          `<div style="font-family:monospace; font-size:10px; padding:3px 5px; min-width:190px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:2px; margin-bottom:3px;">
              <b style="color:${markerColor}; font-size:11px;">${s.name}</b>
              <span style="background:${markerColor}33; color:${markerColor}; font-weight:bold; font-size:9px; padding:1px 4px; border-radius:3px;">RPI: ${s.response_priority_index}/100</span>
            </div>
            <div style="color:#f8fafc; font-weight:bold; font-size:10px; margin-bottom:2px;">${countdownText}</div>
            <div style="color:#94a3b8; font-size:9px;">Pop: <b style="color:#e2e8f0;">${s.population?.toLocaleString()}</b> · Elev: ${s.elevation_m}m · Chainage: ${s.distance_from_dam_km}km</div>
            <div style="color:#38bdf8; font-size:9px;">Wave Arrival: T+${s.flood_arrival_time_min?.toFixed(0)} min · Peak Depth: ${s.peak_depth_m?.toFixed(1)}m</div>
            ${s.assigned_shelter_name ? `<div style="color:#34d399; font-size:9px; margin-top:2px;">Shelter: ${s.assigned_shelter_name} (${s.nearest_shelter_distance_km} km)</div>` : ''}
          </div>`,
          { className: 'operational-tooltip', direction: 'top', offset: [0, -8] }
        );

        marker.on('click', () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([s.latitude, s.longitude], 17, {
              duration: 1.2,
              easeLinearity: 0.25,
            });
            const matchedPreset = UTTARAKHAND_FOCAL_PRESETS.find((p) => p.villageId === s.settlement_id);
            if (matchedPreset) setCurrentZoomPreset(matchedPreset.id);
          }
          setSelectedFeature({
            type: 'Settlement Flood Triage Profile',
            name: s.name,
            settlement_id: s.settlement_id,
            priority_tier: s.priority_tier,
            response_priority_index: s.response_priority_index,
            status: countdownText,
            population: s.population?.toLocaleString(),
            demographics: s.demographics,
            elevation: `${s.elevation_m} m`,
            chainage: `${s.distance_from_dam_km} km downstream of Tehri Dam`,
            arrivalMin: s.flood_arrival_time_min,
            roadCutoffMin: s.road_cutoff_time_min,
            countdownMin: s.time_to_isolation_countdown_min,
            peakDepthM: s.peak_depth_m,
            shelter: s.assigned_shelter_name,
            shelterDistKm: s.nearest_shelter_distance_km,
            routeStatus: s.route_status,
            modeLabel: s.mode_label,
          });
        });

        marker.addTo(settlementGroup);
      });
      settlementGroup.addTo(map);
      settlementsLayerRef.current = settlementGroup;
    }
  }, [villageRiskData, layers.settlements, layers.roads]);

  // House-Level Buildings Footprints Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (buildingsLayerRef.current) {
      map.removeLayer(buildingsLayerRef.current);
      buildingsLayerRef.current = null;
    }

    if (!layers.buildings || !villageRiskData?.settlements) return;

    const bldGroup = L.layerGroup();

    villageRiskData.settlements.forEach((s) => {
      const blds = allVillageBuildings.current[s.settlement_id] || [];
      const currentWaterDepthAtVillage = s.peak_depth_m || 0;
      const isVillageFlooded = s.isolation_status === 'DIRECTLY_INUNDATED';
      const isRoadCutoff = s.isolation_status === 'ISOLATED_BY_FLOOD' || s.isolation_status === 'ROAD_CUTOFF_IMMINENT';

      blds.forEach((bld) => {
        const isHouseSubmerged = isVillageFlooded && currentWaterDepthAtVillage >= bld.flood_submersion_depth_threshold_m;
        const waterHeightAboveFloor = Math.max(0, currentWaterDepthAtVillage - bld.flood_submersion_depth_threshold_m);

        const fillColor = isHouseSubmerged
          ? '#EF4444' // Crimson Red: Submerged
          : isRoadCutoff
          ? '#F59E0B' // Amber: Road cutoff, high alert
          : '#10B981'; // Emerald Green: Safe slope

        const strokeColor = isHouseSubmerged ? '#B91C1C' : isRoadCutoff ? '#D97706' : '#047857';

        const poly = L.polygon(bld.polygon, {
          color: strokeColor,
          weight: 1.5,
          fillColor: fillColor,
          fillOpacity: 0.85,
        });

        const statusLabel = isHouseSubmerged
          ? `⚠️ INUNDATED (+${waterHeightAboveFloor.toFixed(1)}m water above ground)`
          : isRoadCutoff
          ? '⛔ ACCESS CUT OFF (Shelter Evacuation Active)'
          : `✅ SAFE HIGH GROUND (+${(bld.elevation_m - s.elevation_m).toFixed(0)}m clearance)`;

        poly.bindTooltip(
          `<div style="font-family:monospace; font-size:10px; padding:3px 5px; min-width:180px;">
            <div style="font-weight:bold; color:#fff; border-bottom:1px solid #334155; padding-bottom:2px; margin-bottom:3px;">
              🏠 ${bld.name}
            </div>
            <div style="color:${isHouseSubmerged ? '#EF4444' : isRoadCutoff ? '#F59E0B' : '#10B981'}; font-weight:bold;">
              ${statusLabel}
            </div>
            <div style="color:#94A3B8; font-size:9px; margin-top:2px;">
              Occupants: <b style="color:#e2e8f0;">${bld.occupants_count} residents</b> &middot; Elev: ${bld.elevation_m}m MSL
            </div>
            <div style="color:#38BDF8; font-size:9px;">
              Distance from Bhagirathi bank: ${bld.distance_to_river_m}m
            </div>
            ${s.assigned_shelter_name ? `<div style="color:#34D399; font-size:9px; margin-top:2px;">Evac Route to: ${s.assigned_shelter_name}</div>` : ''}
          </div>`,
          { className: 'operational-tooltip', direction: 'top' }
        );

        poly.on('click', () => {
          setSelectedFeature({
            type: 'House & Building Footprint',
            name: bld.name,
            building_type: bld.building_type,
            village_name: s.name,
            status: statusLabel,
            elevation: `${bld.elevation_m} m MSL (${bld.distance_to_river_m}m from riverbed)`,
            occupants: `${bld.occupants_count} residents`,
            waterDepth: isHouseSubmerged ? `+${waterHeightAboveFloor.toFixed(1)} m above floor` : '0.0 m (Dry ground)',
            floodThreshold: `${bld.flood_submersion_depth_threshold_m} m flood stage`,
            shelter: s.assigned_shelter_name,
            shelterDistKm: s.nearest_shelter_distance_km,
            routeStatus: s.route_status,
          });
        });

        poly.addTo(bldGroup);
      });
    });

    bldGroup.addTo(map);
    buildingsLayerRef.current = bldGroup;
  }, [villageRiskData, layers.buildings, currentSec]);

  // Affected Critical Bridges Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (bridgesLayerRef.current) {
      map.removeLayer(bridgesLayerRef.current);
      bridgesLayerRef.current = null;
    }

    if (layers.bridges && v3.v3Context?.bridges) {
      const group = L.layerGroup();

      v3.v3Context.bridges.features?.forEach((feat) => {
        const [lon, lat] = feat.geometry.coordinates;
        const arrSec = feat.properties?.arrival_time_sec || 0;
        const isFlooded = currentSec > 0 && arrSec <= currentSec;
        const name = feat.properties?.name || 'Bridge';

        const marker = L.circleMarker([lat, lon], {
          radius: isFlooded ? 5.5 : 4,
          color: isFlooded ? '#F87171' : '#34D399',
          fillColor: isFlooded ? '#DC2626' : '#059669',
          fillOpacity: 0.95,
          weight: 1.5,
        });

        marker.bindTooltip(
          `<div style="font-family:monospace; font-size:10px; font-weight:bold; padding:2px 4px;">
            <div style="color:${isFlooded ? '#EF4444' : '#10B981'};">${isFlooded ? '⛔ SUBMERGED' : '🌉 OPEN'}: ${name}</div>
            <div style="color:#94A3B8; font-size:9px;">Arrival: T+${Math.round(arrSec)}s</div>
          </div>`,
          { className: 'operational-tooltip', direction: 'top', offset: [0, -5] }
        );

        marker.on('click', () => {
          setSelectedFeature({
            type: 'Critical River Crossing / Bridge',
            name: name,
            status: isFlooded ? 'SUBMERGED / STRUCTURAL WASHOUT RISK' : 'OPERATIONAL / OPEN',
            arrivalSec: Math.round(arrSec),
            structuralType: feat.properties?.structural_type || 'Suspension',
          });
        });

        marker.addTo(group);
      });

      group.addTo(map);
      bridgesLayerRef.current = group;
    }
  }, [layers.bridges, v3.v3Context?.bridges, currentSec]);

  // Dam Hydraulic Discharge Jet Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (floodJetRef.current) {
      map.removeLayer(floodJetRef.current);
      floodJetRef.current = null;
    }

    if (currentSec > 0) {
      const isBreached = cvAlert?.sync_state?.cv_breach_detected;
      const jetMarker = L.circleMarker([30.365, 78.484], {
        radius: isBreached ? 8 : 5,
        color: isBreached ? '#EF4444' : '#38BDF8',
        fillColor: isBreached ? '#DC2626' : '#0284C7',
        fillOpacity: 0.85,
        weight: 2,
      });

      jetMarker.bindTooltip(
        `<div style="font-family:monospace; font-size:10px; font-weight:bold; padding:2px 4px;">
          <span style="color:${isBreached ? '#EF4444' : '#38BDF8'}">${isBreached ? '💥 BREACH DISCHARGE' : '🌊 TAILRACE DISCHARGE'}</span>
          <div style="color:#CBD5E1;">${isBreached ? '723,705 m³/s (Froehlich)' : '2,113 m³/s (Regulated)'}</div>
        </div>`,
        { className: 'operational-tooltip', direction: 'top', offset: [0, -6] }
      );

      jetMarker.addTo(map);

      floodJetRef.current = jetMarker;
    }
  }, [currentSec, cvAlert]);

  // Dam & Confluence Reference Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const damMarker = L.circleMarker([30.378, 78.481], {
      radius: 6,
      color: '#EF4444',
      fillColor: '#B91C1C',
      fillOpacity: 0.95,
      weight: 2,
    });

    damMarker.bindTooltip(
      `<div style="font-family:monospace; font-size:10px; font-weight:bold; padding:2px 4px;">
        <span style="color:#FCA5A5;">📷 TEHRI DAM CREST (839.5m)</span>
        <div style="color:#94A3B8; font-size:9px;">Click to inspect CV Optical HUD</div>
      </div>`,
      { className: 'operational-tooltip', direction: 'top', offset: [0, -6] }
    );

    damMarker.addTo(map);

    damMarker.on('click', () => {
      setSubView('cv');
    });

    return () => {
      map.removeLayer(damMarker);
    };
  }, []);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = (1000 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentSec((prev) => {
        const next = prev + frameIntervalSec;
        if (next > durationSec) {
          setIsPlaying(false);
          return durationSec;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, frameIntervalSec, durationSec]);

  const timeLabel = `T+${String(Math.floor(currentSec / 3600)).padStart(2, '0')}:${String(
    Math.floor((currentSec % 3600) / 60)
  ).padStart(2, '0')}:${String(currentSec % 60).padStart(2, '0')}`;

  return (
    <div className="flex h-full w-full bg-[#0B0F19] text-slate-200 overflow-hidden font-mono text-xs">
      {/* Main Canvas Area (70% width) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 h-full overflow-hidden relative">
        {/* Sub-view Switcher Toolbar */}
        <div className="h-9 px-3 border-b border-slate-800 bg-[#111827] flex items-center justify-between shrink-0 text-xs select-none">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">SIMULATION ENGINE:</span>
            <button
              onClick={() => setSubView('lisflood')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                subView === 'lisflood'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              2D LISFLOOD-FP (30 km)
            </button>
            <button
              onClick={() => setSubView('cv')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                subView === 'cv'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Camera className="w-3 h-3 text-sky-400" />
              CV DAM BREACH VISION
              {cvAlert?.sync_state?.cv_breach_detected && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block ml-0.5" />
              )}
            </button>
            <button
              onClick={() => setSubView('sph')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                subView === 'sph'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3 h-3 text-emerald-400" />
              DUALSPHYSICS 5.4 SPH (0–2 km)
            </button>
            <button
              onClick={() => setSubView('coupling')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                subView === 'coupling'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Scale className="w-3 h-3 text-sky-400" />
              FROUDE COUPLING Q(t)
            </button>
            <button
              onClick={() => setSubView('breach')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                subView === 'breach'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Waves className="w-3 h-3 text-violet-400" />
              BREACH BENCHMARK
            </button>
            <button
              onClick={() => setSubView('audit')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                subView === 'audit'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCheck className="w-3 h-3 text-emerald-400" />
              61-FRAME AUDIT
            </button>
            <button
              onClick={() => {
                if (onNavigateToHadr) {
                  onNavigateToHadr();
                } else {
                  window.location.hash = 'hadr';
                }
              }}
              className="px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 bg-gradient-to-r from-emerald-950 to-sky-950 border border-emerald-700/80 text-emerald-300 hover:text-white hover:border-emerald-500 shadow-xs"
              title="Switch to Tactical Rescue & Rerouting Command Console"
            >
              <Navigation className="w-3 h-3 text-emerald-400" />
              RESCUE &amp; REROUTE
            </button>
          </div>

          <div className="text-[10px] text-slate-400 hidden lg:block">
            DISPLAY INTERPOLATION ONLY · ANALYTICAL GRID: 30 m
          </div>
        </div>

        {/* Sub-view Content Area */}
        <div className="flex-1 relative flex flex-col min-h-0 bg-[#070B14]">
          {subView === 'cv' && (
            <CVDamMonitorPanel
              onSyncToSimulation={(data) => {
                setCvAlert(data);
                if (data.sync_state?.cv_breach_detected) {
                  setCurrentSec(1800);
                }
                setSubView('lisflood');
              }}
            />
          )}
          {subView === 'sph' && <SphParticleCanvas />}
          {subView === 'coupling' && <FroudeCouplingPanel />}
          {subView === 'breach' && <BreachBenchmarkPanel />}
          {subView === 'audit' && <FrameAuditTable onSelectFrame={(t) => { setCurrentSec(t); setSubView('lisflood'); }} />}

          {/* LISFLOOD-FP 2D Map View */}
          {subView === 'lisflood' && (
            <>
              {/* CV Dam Breach Alert Banner on Map */}
              {cvAlert?.sync_state?.cv_breach_detected && (
                <div className="absolute top-3 left-4 right-4 z-[1000] bg-red-950/90 border border-red-500 text-red-200 px-3.5 py-2 rounded shadow-2xl flex items-center justify-between backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider mr-2">
                        CRITICAL: CV DAM BREACH CONFIRMED (124.5m NOTCH)
                      </span>
                      <span className="text-[10px] text-red-300">
                        Boundary inflow updated to Froehlich collapse peak (723,705 m³/s). 2D LISFLOOD-FP flood propagation active.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSubView('cv')}
                    className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white text-[10px] font-bold rounded flex items-center gap-1 transition shrink-0"
                  >
                    <Camera className="w-3 h-3" />
                    INSPECT OPTICAL HUD
                  </button>
                </div>
              )}

              {/* Real-time Village Flood Impact Alert Banner */}
              {(() => {
                const activeVillageAlerts = (villageRiskData?.alerts_queue || []).filter((a) => {
                  if (dismissedAlerts[a.alert_id]) return false;
                  const s = villageRiskData?.settlements?.find((x) => x.settlement_id === a.settlement_id);
                  if (!s) return false;
                  return (
                    s.isolation_status === 'DIRECTLY_INUNDATED' ||
                    s.isolation_status === 'ISOLATED_BY_FLOOD' ||
                    s.isolation_status === 'ROAD_CUTOFF_IMMINENT' ||
                    (s.time_to_isolation_countdown_min !== null && s.time_to_isolation_countdown_min <= 8)
                  );
                });

                if (activeVillageAlerts.length === 0) return null;
                const topAlert = activeVillageAlerts[0];
                const s = villageRiskData?.settlements?.find((x) => x.settlement_id === topAlert.settlement_id);
                const isDirect = s?.isolation_status === 'DIRECTLY_INUNDATED';
                const isCutoff = s?.isolation_status === 'ISOLATED_BY_FLOOD';

                return (
                  <div
                    className={`absolute ${
                      cvAlert?.sync_state?.cv_breach_detected ? 'top-16' : 'top-3'
                    } left-4 right-4 z-[999] bg-gradient-to-r from-red-950/95 via-amber-950/90 to-slate-950/95 border ${
                      isDirect ? 'border-red-500 shadow-red-950/80' : 'border-amber-500 shadow-amber-950/80'
                    } text-amber-200 px-3.5 py-2.5 rounded-lg shadow-2xl flex items-center justify-between backdrop-blur-md`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-full ${
                          isDirect ? 'bg-red-600/30 border border-red-500' : 'bg-amber-600/30 border border-amber-500'
                        }`}
                      >
                        <AlertTriangle className={`w-4 h-4 ${isDirect ? 'text-red-400' : 'text-amber-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {isDirect
                              ? '🚨 INUNDATION ACTIVE'
                              : isCutoff
                              ? '⛔ ROAD SEVERED / ISOLATED'
                              : '⚠️ FLOOD IMPACT IMMINENT'}
                            : {topAlert.settlement_name.toUpperCase()}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              isDirect ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-950'
                            }`}
                          >
                            {topAlert.priority_tier}
                          </span>
                          <span className="text-[10px] text-sky-300 font-mono">
                            Chainage: {s?.distance_from_dam_km} km
                          </span>
                          <span className="text-[10px] text-amber-300 font-mono">
                            (T+{Math.round(currentSec / 60)} min)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                          {topAlert.recommended_action} &middot; Safe Shelter:{' '}
                          <b className="text-emerald-300">{topAlert.recommended_shelter}</b>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setActiveSidebarTab('villages');
                          if (s) {
                            setSelectedFeature({
                              type: 'Settlement Flood Triage Profile',
                              name: s.name,
                              settlement_id: s.settlement_id,
                              priority_tier: s.priority_tier,
                              response_priority_index: s.response_priority_index,
                              status: isDirect
                                ? '⚠️ DIRECTLY INUNDATED'
                                : isCutoff
                                ? '⛔ ROAD CUT OFF (ISOLATED)'
                                : '⏳ ROAD CUTOFF IMMINENT',
                              population: s.population?.toLocaleString(),
                              demographics: s.demographics,
                              elevation: `${s.elevation_m} m`,
                              chainage: `${s.distance_from_dam_km} km downstream`,
                              arrivalMin: s.flood_arrival_time_min,
                              roadCutoffMin: s.road_cutoff_time_min,
                              countdownMin: s.time_to_isolation_countdown_min,
                              peakDepthM: s.peak_depth_m,
                              shelter: s.assigned_shelter_name,
                              shelterDistKm: s.nearest_shelter_distance_km,
                              routeStatus: s.route_status,
                              modeLabel: s.mode_label,
                            });
                          }
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-slate-950 text-[10px] font-bold rounded flex items-center gap-1 transition shadow-sm"
                      >
                        <Shield className="w-3 h-3" />
                        INSPECT TRIAGE
                      </button>
                      <button
                        onClick={() => {
                          if (onNavigateToHadr) {
                            onNavigateToHadr();
                          } else {
                            window.location.hash = 'hadr';
                          }
                        }}
                        className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white text-[10px] font-bold rounded flex items-center gap-1 transition shadow-sm"
                        title="Open interactive 3D tactical rerouting and rescue console"
                      >
                        <Navigation className="w-3 h-3 text-white" />
                        3D RESCUE ROUTE
                      </button>
                      <button
                        onClick={() => setDismissedAlerts((prev) => ({ ...prev, [topAlert.alert_id]: true }))}
                        className="p-1 text-slate-400 hover:text-white rounded transition"
                        title="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Uttarakhand & House-Level Zoom View Switcher Toolbar */}
              <div className="absolute top-3 right-4 z-[990] flex items-center gap-2 bg-[#0B0F19]/90 border border-slate-700/80 px-2.5 py-1.5 rounded-lg shadow-2xl backdrop-blur-md">
                {/* Base Layer Switcher */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-[10px]">
                  <button
                    onClick={() => setActiveBaseLayer('satellite')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      activeBaseLayer === 'satellite'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="High-resolution satellite photorealistic basemap"
                  >
                    🛰️ Satellite
                  </button>
                  <button
                    onClick={() => setActiveBaseLayer('streets')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      activeBaseLayer === 'streets'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="OpenStreetMap terrain, roads &amp; building outlines"
                  >
                    🗺️ Streets
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-800" />

                {/* Quick Camera Preset Selector: Regional vs Zoomed Village */}
                <select
                  value={currentZoomPreset}
                  onChange={(e) => {
                    const presetId = e.target.value;
                    setCurrentZoomPreset(presetId);
                    const preset = UTTARAKHAND_FOCAL_PRESETS.find((p) => p.id === presetId);
                    if (preset && mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo(preset.center, preset.zoom, {
                        duration: 1.4,
                        easeLinearity: 0.25,
                      });
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 text-sky-300 font-bold text-[10px] rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-sky-500"
                >
                  {UTTARAKHAND_FOCAL_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Quick Reset to Uttarakhand Overview Button */}
                {currentZoomPreset !== 'corridor' && (
                  <button
                    onClick={() => {
                      setCurrentZoomPreset('corridor');
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([30.25, 78.48], 11, { duration: 1.2 });
                      }
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 transition"
                    title="Reset to Uttarakhand Regional View"
                  >
                    Reset View
                  </button>
                )}

                <div className="h-4 w-px bg-slate-800" />

                {/* Live Rerouting HUD Toggle Button */}
                <button
                  onClick={() => setIsReroutingHudOpen(!isReroutingHudOpen)}
                  className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                    isReroutingHudOpen
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-600 shadow-xs'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                  title="Toggle Live Water-Road Collision & Rerouting HUD"
                >
                  <Navigation className="w-3 h-3 text-emerald-400" />
                  Rerouting HUD
                </button>
              </div>

              <div ref={mapContainerRef} className="flex-1 w-full h-full relative" />

              {/* Floating Live Water-Road Collision & Rerouting HUD */}
              {isReroutingHudOpen && (
                <div className="absolute top-14 left-4 z-[980] w-[340px] bg-[#0B0F19]/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md p-3 text-xs font-mono space-y-2 select-none">
                  {/* HUD Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold font-sans text-white text-[11px] uppercase tracking-wide">
                        ROAD COLLISION &amp; REROUTING
                      </span>
                    </div>
                    <button
                      onClick={() => setIsReroutingHudOpen(false)}
                      className="text-slate-500 hover:text-slate-300 text-xs p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Collision Status Banner */}
                  <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800/80 rounded px-2.5 py-1.5">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Water-Road Impact</span>
                      <span className={`text-xs font-bold ${activeCollisions.filter(c => c.isCollided).length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {activeCollisions.filter(c => c.isCollided).length > 0
                          ? `💥 ${activeCollisions.filter(c => c.isCollided).length} SECTORS COLLIDED & CUT OFF`
                          : '✅ ALL ROADS PASSABLE'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block uppercase">Sim Time</span>
                      <span className="text-xs font-bold text-sky-400">
                        T+{Math.round(currentSec / 60)} min ({currentSec}s)
                      </span>
                    </div>
                  </div>

                  {/* Target Settlement / Incident Sector Focus */}
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-between">
                      <span>Focus Incident Sector</span>
                      <span className="text-amber-400 font-normal">Auto-Syncs Map</span>
                    </div>
                    <select
                      value={selectedRerouteKey}
                      onChange={(e) => {
                        const k = e.target.value;
                        setSelectedRerouteKey(k);
                        const r = PROTOTYPE_TACTICAL_ROUTES[k];
                        if (r && mapInstanceRef.current) {
                          const pt = r.rejectedRoute?.hazardPointCoords || r.roadRoute?.routeCoords?.[0];
                          if (pt) {
                            mapInstanceRef.current.flyTo([pt[0], pt[1]], 14.5, { duration: 1.0 });
                          }
                        }
                      }}
                      className="w-full bg-[#111827] border border-slate-700 text-sky-300 rounded px-2 py-1 text-[11px] font-bold focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {Object.entries(PROTOTYPE_TACTICAL_ROUTES).map(([k, d]) => (
                        <option key={k} value={k}>
                          {d.settlementName} (Km {d.kmFromDam}) &middot; Flood: T+{d.rejectedRoute?.bridgeFloodMin || d.floodArrivalMin}m
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Multi-Modal Mode Selector */}
                  <div className="grid grid-cols-3 gap-1 text-[9px] font-bold">
                    <button
                      onClick={() => setRerouteMode('ROAD')}
                      className={`py-1 px-1.5 rounded border text-center transition ${
                        rerouteMode === 'ROAD'
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🟢 Ridge Bypass
                    </button>
                    <button
                      onClick={() => setRerouteMode('AIR_EVAC')}
                      className={`py-1 px-1.5 rounded border text-center transition ${
                        rerouteMode === 'AIR_EVAC'
                          ? 'bg-purple-950 border-purple-500 text-purple-300 font-bold shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🚁 Air Vector
                    </button>
                    <button
                      onClick={() => setRerouteMode('REJECTED')}
                      className={`py-1 px-1.5 rounded border text-center transition ${
                        rerouteMode === 'REJECTED'
                          ? 'bg-red-950 border-red-500 text-red-300 font-bold shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ⛔ Collided Road
                    </button>
                  </div>

                  {/* Telemetry Details */}
                  <div className="border-t border-slate-800/80 pt-1.5 text-[10px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">High-Ridge Safe Window:</span>
                      <span className="text-emerald-400 font-bold">+42 min Safe Buffer</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Detour Transit Route:</span>
                      <span className="text-white font-bold">
                        {(PROTOTYPE_TACTICAL_ROUTES[selectedRerouteKey] || PROTOTYPE_TACTICAL_ROUTES.sirain).roadRoute.distKm} km (Elev &gt; 1,400m)
                      </span>
                    </div>

                    {/* Dispatch Convoy Button */}
                    <button
                      onClick={() => {
                        setDispatchedConvoy({
                          settlementKey: selectedRerouteKey,
                          progress: 0,
                          active: true,
                        });
                      }}
                      className="w-full mt-1.5 py-1.5 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 active:from-emerald-700 active:to-sky-700 text-white font-bold text-[10px] rounded flex items-center justify-center gap-1.5 shadow-md transition font-sans"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      DISPATCH RESCUE CONVOY ON BYPASS
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Minimized HUD Button */}
              {!isReroutingHudOpen && (
                <button
                  onClick={() => setIsReroutingHudOpen(true)}
                  className="absolute top-14 left-4 z-[980] bg-[#0B0F19]/90 border border-slate-700 hover:border-emerald-500 px-2.5 py-1.5 rounded-lg text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-md transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  SHOW REROUTING &amp; COLLISION HUD
                </button>
              )}

              {/* Collapsible Timeline Charts Panel beneath Map */}
              {isTimelineOpen && (
                <div className="h-32 bg-[#0B0F19]/95 border-t border-slate-800 flex flex-col shrink-0 px-4 py-2 relative z-10 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-1 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 uppercase font-bold">TIMELINE TELEMETRY:</span>
                      <button
                        onClick={() => setTimelineMetric('wet_area')}
                        className={`px-1.5 py-0.5 rounded ${
                          timelineMetric === 'wet_area' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        WET AREA (km²)
                      </button>
                      <button
                        onClick={() => setTimelineMetric('max_depth')}
                        className={`px-1.5 py-0.5 rounded ${
                          timelineMetric === 'max_depth' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        STAGE DEPTH (m)
                      </button>
                      <button
                        onClick={() => setTimelineMetric('velocity')}
                        className={`px-1.5 py-0.5 rounded ${
                          timelineMetric === 'velocity' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        VELOCITY (m/s)
                      </button>
                      <button
                        onClick={() => setTimelineMetric('roads')}
                        className={`px-1.5 py-0.5 rounded ${
                          timelineMetric === 'roads' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        ROAD DISRUPTION
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sky-400 font-bold">
                        {timelineMetric === 'wet_area' && `Wetted Area: ${wetAreaKm2.toFixed(2)} km²`}
                        {timelineMetric === 'max_depth' && `Peak Reach Stage: ${(currentFrameInfo?.max_depth_m || 42.5).toFixed(1)} m`}
                        {timelineMetric === 'velocity' && `Peak Thalweg Velocity: ${(currentFrameInfo?.max_velocity_ms || 17.8).toFixed(1)} m/s`}
                        {timelineMetric === 'roads' && `Wetted Road Segments: ${wettedRoadCount} / 74`}
                      </span>
                      <button
                        onClick={() => setIsTimelineOpen(false)}
                        className="text-slate-500 hover:text-slate-300"
                        title="Collapse timeline"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* SVG Multi-Metric Timeline Plot */}
                  <div className="flex-1 w-full relative">
                    <svg viewBox="0 0 700 75" className="w-full h-full overflow-visible">
                      {/* Grid Lines */}
                      {[0, 25, 50, 75].map((yVal) => (
                        <line
                          key={yVal}
                          x1="30"
                          y1={yVal}
                          x2="690"
                          y2={yVal}
                          stroke="#1E293B"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                      ))}

                      {/* Line Plot depending on selected metric */}
                      {timelineMetric === 'wet_area' && (
                        <polyline
                          fill="none"
                          stroke="#38BDF8"
                          strokeWidth="2"
                          points={v4FramesMeta
                            .map((f) => {
                              const x = 30 + (f.time_sec / 3600) * 660;
                              const y = 70 - (f.wet_area_km2 / 22.0) * 60;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {timelineMetric === 'max_depth' && (
                        <polyline
                          fill="none"
                          stroke="#A78BFA"
                          strokeWidth="2"
                          points={v4FramesMeta
                            .map((f) => {
                              const x = 30 + (f.time_sec / 3600) * 660;
                              const y = 70 - (Math.min(45, f.max_depth_m) / 45) * 60;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {timelineMetric === 'velocity' && (
                        <polyline
                          fill="none"
                          stroke="#34D399"
                          strokeWidth="2"
                          points={v4FramesMeta
                            .map((f) => {
                              const x = 30 + (f.time_sec / 3600) * 660;
                              const y = 70 - (Math.min(20, f.max_velocity_ms || 0) / 20) * 60;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {timelineMetric === 'roads' && (
                        <polyline
                          fill="none"
                          stroke="#FB923C"
                          strokeWidth="2"
                          points={v4FramesMeta
                            .map((f) => {
                              const x = 30 + (f.time_sec / 3600) * 660;
                              const segs = f.time_sec <= 0 ? 0 : (f.time_sec <= 300 ? 22 : (f.time_sec <= 600 ? 45 : (f.time_sec <= 1200 ? 58 : 74)));
                              const y = 70 - (segs / 74) * 60;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {/* Active Time Scrubber Indicator */}
                      <line
                        x1={30 + (currentSec / 3600) * 660}
                        y1="5"
                        x2={30 + (currentSec / 3600) * 660}
                        y2="75"
                        stroke="#F59E0B"
                        strokeWidth="2"
                      />
                      <circle
                        cx={30 + (currentSec / 3600) * 660}
                        cy="10"
                        r="3.5"
                        fill="#F59E0B"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {!isTimelineOpen && (
                <button
                  onClick={() => setIsTimelineOpen(true)}
                  className="absolute bottom-14 left-4 z-20 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-300 flex items-center gap-1 hover:bg-slate-800"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show Timeline Telemetry
                </button>
              )}
            </>
          )}
        </div>

        {/* Bottom Playback & Scrubber Controls (Always visible in lisflood view) */}
        {subView === 'lisflood' && (
          <div className="h-12 border-t border-slate-800 bg-[#0B0F19] px-4 flex items-center justify-between gap-4 shrink-0 select-none z-20">
            {/* Playback Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentSec(0);
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                title="Reset to T+0s"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentSec((prev) => Math.max(0, prev - frameIntervalSec));
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                title="Step Backward (-1 Frame)"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={togglePlay}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold rounded flex items-center gap-1.5 transition shadow-sm"
                title={isPlaying ? 'Pause simulation' : 'Play simulation'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />}
                <span className="font-sans text-[11px]">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentSec((prev) => Math.min(durationSec, prev + frameIntervalSec));
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                title="Step Forward (+1 Frame)"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Time & Telemetry Labels */}
            <div className="flex items-center gap-3 shrink-0 bg-slate-900 border border-slate-800 px-3 py-1 rounded text-[11px]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-sky-400" />
                <span className="font-bold text-white text-xs">{timeLabel}</span>
              </div>
              <span className="text-slate-600">|</span>
              <div>
                <span className="text-slate-400 text-[10px]">WET AREA:</span>{' '}
                <strong className="text-sky-300">{wetAreaKm2.toFixed(2)} km&sup2;</strong>
              </div>
              <span className="text-slate-600">|</span>
              <div>
                <span className="text-slate-400 text-[10px]">WETTED ROADS:</span>{' '}
                <strong className="text-orange-400">{wettedRoadCount} segments</strong>
              </div>
            </div>

            {/* Time Scrubber Slider */}
            <div className="flex-1 flex items-center gap-2 min-w-[140px]">
              <input
                type="range"
                min={0}
                max={durationSec}
                step={frameIntervalSec}
                value={currentSec}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentSec(parseInt(e.target.value));
                }}
                className="control-slider w-full cursor-pointer accent-sky-400"
              />
            </div>

            {/* Playback Speed Multipliers */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 shrink-0 text-[10px]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    playbackSpeed === s ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}&times;
                </button>
              ))}
            </div>

            {/* Layer Quick Toggles */}
            <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-800 pl-3">
              <button
                onClick={() => toggleLayer('temporalDepth')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  layers.temporalDepth
                    ? 'bg-sky-950 text-sky-400 border-sky-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                DEPTH
              </button>
              <button
                onClick={() => toggleLayer('maxDepth')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  layers.maxDepth
                    ? 'bg-blue-950 text-blue-400 border-blue-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                MAX
              </button>
              <button
                onClick={() => toggleLayer('arrivalTime')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  layers.arrivalTime
                    ? 'bg-amber-950 text-amber-400 border-amber-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                ARRIVAL
              </button>
              <button
                onClick={() => toggleLayer('roads')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  layers.roads
                    ? 'bg-orange-950 text-orange-400 border-orange-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                ROADS
              </button>
              <button
                onClick={() => toggleLayer('settlements')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  layers.settlements
                    ? 'bg-rose-950 text-rose-400 border-rose-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                TOWNS
              </button>
              <button
                onClick={() => toggleLayer('buildings')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  layers.buildings
                    ? 'bg-purple-950 text-purple-400 border-purple-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
                title="Toggle house-level 3D settlement building footprints"
              >
                HOUSES
              </button>
              <button
                onClick={() => toggleLayer('bridges')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  layers.bridges
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                BRIDGES
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Simulation Inspector (30% width, 360px) */}
      <div className="w-[360px] bg-[#111827] flex flex-col h-full overflow-y-auto shrink-0 text-xs">
        {/* Header Tabs */}
        <div className="h-9 border-b border-slate-800 flex items-center shrink-0 bg-[#0F172A]">
          <button
            onClick={() => setActiveSidebarTab('telemetry')}
            className={`flex-1 h-full px-3 text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition ${
              activeSidebarTab === 'telemetry'
                ? 'bg-[#111827] text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            TELEMETRY
          </button>
          <button
            onClick={() => setActiveSidebarTab('villages')}
            className={`flex-1 h-full px-3 text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition ${
              activeSidebarTab === 'villages'
                ? 'bg-[#111827] text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            VILLAGE TRIAGE ({villageRiskData?.isolated_settlements_count || 0})
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* Selected Feature Card */}
          {selectedFeature && (
            <div
              className={`border rounded p-3 space-y-2 ${
                selectedFeature.type === 'Settlement Flood Triage Profile'
                  ? selectedFeature.priority_tier === 'CRITICAL_IMMEDIATE'
                    ? 'border-red-600 bg-red-950/40'
                    : 'border-amber-600 bg-amber-950/40'
                  : 'border-sky-800/80 bg-sky-950/40'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedFeature.type}
                </span>
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="text-slate-400 hover:text-white text-sm leading-none p-0.5"
                >
                  &times;
                </button>
              </div>

              <div className="font-bold text-white text-sm flex items-center justify-between">
                <span>{selectedFeature.name}</span>
                {selectedFeature.priority_tier && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      selectedFeature.priority_tier === 'CRITICAL_IMMEDIATE'
                        ? 'bg-red-600 text-white'
                        : selectedFeature.priority_tier === 'HIGH_PRIORITY'
                        ? 'bg-amber-600 text-slate-950'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {selectedFeature.priority_tier}
                  </span>
                )}
              </div>

              {selectedFeature.response_priority_index !== undefined && (
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Response Priority Index</span>
                    <span className="font-mono font-bold text-white">
                      {selectedFeature.response_priority_index} / 100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{
                        width: `${selectedFeature.response_priority_index}%`,
                        backgroundColor:
                          selectedFeature.response_priority_index >= 75
                            ? '#ef4444'
                            : selectedFeature.response_priority_index >= 50
                            ? '#f59e0b'
                            : '#3b82f6',
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="text-[11px] font-semibold text-slate-200">
                {selectedFeature.status}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800 text-[10px]">
                {selectedFeature.population && (
                  <div>
                    <span className="text-slate-400 block">Population</span>
                    <span className="font-mono text-white font-bold">{selectedFeature.population}</span>
                  </div>
                )}
                {selectedFeature.elevation && (
                  <div>
                    <span className="text-slate-400 block">Elevation</span>
                    <span className="font-mono text-white">{selectedFeature.elevation}</span>
                  </div>
                )}
                {selectedFeature.chainage && (
                  <div>
                    <span className="text-slate-400 block">Corridor Chainage</span>
                    <span className="font-mono text-white">{selectedFeature.chainage}</span>
                  </div>
                )}
                {selectedFeature.peakDepthM !== undefined && (
                  <div>
                    <span className="text-slate-400 block">Peak Water Depth</span>
                    <span className="font-mono text-sky-300 font-bold">{selectedFeature.peakDepthM} m</span>
                  </div>
                )}
                {selectedFeature.arrivalMin !== undefined && (
                  <div>
                    <span className="text-slate-400 block">Wave Arrival</span>
                    <span className="font-mono text-amber-300 font-bold">
                      T+{selectedFeature.arrivalMin?.toFixed(1)} min
                    </span>
                  </div>
                )}
                {selectedFeature.roadCutoffMin !== undefined && (
                  <div>
                    <span className="text-slate-400 block">Road Cutoff</span>
                    <span className="font-mono text-red-300 font-bold">
                      T+{selectedFeature.roadCutoffMin?.toFixed(1)} min
                    </span>
                  </div>
                )}
              </div>

              {selectedFeature.shelter && (
                <div className="pt-1 border-t border-slate-800 text-[10px]">
                  <span className="text-slate-400 block">Assigned Safe Shelter</span>
                  <div className="text-emerald-300 font-bold flex items-center justify-between">
                    <span>{selectedFeature.shelter}</span>
                    <span className="text-slate-400 font-mono font-normal">
                      {selectedFeature.shelterDistKm} km
                    </span>
                  </div>
                  {selectedFeature.routeStatus && (
                    <div className="mt-0.5 text-[9px] text-slate-400">
                      Evacuation Feasibility:{' '}
                      <b
                        className={
                          selectedFeature.routeStatus === 'FEASIBLE'
                            ? 'text-emerald-400'
                            : selectedFeature.routeStatus === 'TIGHT_MARGIN'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }
                      >
                        {selectedFeature.routeStatus}
                      </b>
                    </div>
                  )}
                </div>
              )}

              {selectedFeature.modeLabel && (
                <div className="text-[9px] font-mono text-amber-400/90 pt-1 border-t border-slate-800">
                  {selectedFeature.modeLabel}
                </div>
              )}

              {selectedFeature.type === 'Settlement Flood Triage Profile' && (
                <button
                  onClick={() => {
                    if (onNavigateToHadr) {
                      onNavigateToHadr();
                    } else {
                      window.location.hash = 'hadr';
                    }
                  }}
                  className="w-full mt-2 py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1.5 shadow-sm transition"
                  title="Open 3D Rerouting and Evacuation Rescue Console"
                >
                  <Navigation className="w-3.5 h-3.5 text-white" />
                  OPEN 3D TACTICAL RESCUE MISSION
                </button>
              )}
            </div>
          )}

          {/* TELEMETRY TAB CONTENT */}
          {activeSidebarTab === 'telemetry' && (
            <>
              {/* Current Step State */}
              <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Timestep State (T+{currentSec}s)</span>
                  <span className="text-sky-400 font-mono">T+{Math.round(currentSec / 60)} min</span>
                </div>
                <div className="space-y-1">
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Frame Identifier</span>
                    <span className="telemetry-row__value font-mono">
                      {isV4 ? `depth_${String(frameIndex).padStart(4, '0')}.tif` : `frame_${currentSec}s`}
                    </span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Wetted Cell Count</span>
                    <span className="telemetry-row__value text-sky-400">{wetCells.toLocaleString()} cells</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Wetted Flood Area</span>
                    <span className="telemetry-row__value text-sky-400">{wetAreaKm2.toFixed(3)} km&sup2;</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Wetted Road Segments</span>
                    <span className="telemetry-row__value text-orange-400">{wettedRoadCount} segments</span>
                  </div>
                  <div
                    onClick={() => setActiveSidebarTab('villages')}
                    className="telemetry-row cursor-pointer hover:bg-slate-800/40 p-0.5 rounded transition"
                  >
                    <span className="telemetry-row__label text-red-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      Settlements Inundated / Cut Off
                    </span>
                    <span className="telemetry-row__value text-red-400 font-bold">
                      {villageRiskData?.isolated_settlements_count || 0} / {villageRiskData?.total_settlements || 8}
                    </span>
                  </div>
                  <div
                    onClick={() => setActiveSidebarTab('villages')}
                    className="telemetry-row cursor-pointer hover:bg-slate-800/40 p-0.5 rounded transition"
                  >
                    <span className="telemetry-row__label text-amber-300 flex items-center gap-1">
                      <Users className="w-3 h-3 text-amber-400" />
                      Population at Risk
                    </span>
                    <span className="telemetry-row__value text-amber-400 font-bold">
                      {villageRiskData?.total_population_at_risk?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Downstream Reach Arrival Timeline Card */}
              <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Corridor Wave Arrival Status
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Chham (Chainage 5.8 km):</span>
                    <span className={currentSec >= 680 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                      {currentSec >= 680 ? 'WETTED (T+11.4m)' : 'Arrival in ~' + Math.max(0, Math.round((680 - currentSec)/60)) + 'm'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Kandi (Chainage 8.7 km):</span>
                    <span className={currentSec >= 1020 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                      {currentSec >= 1020 ? 'WETTED (T+17.1m)' : 'Arrival in ~' + Math.max(0, Math.round((1020 - currentSec)/60)) + 'm'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Koteshwar (Chainage 15.6 km):</span>
                    <span className={currentSec >= 1830 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                      {currentSec >= 1830 ? 'WETTED (T+30.6m)' : 'Arrival in ~' + Math.max(0, Math.round((1830 - currentSec)/60)) + 'm'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Maletha (Chainage 19.4 km):</span>
                    <span className={currentSec >= 2280 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                      {currentSec >= 2280 ? 'WETTED (T+38.0m)' : 'Arrival in ~' + Math.max(0, Math.round((2280 - currentSec)/60)) + 'm'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Devprayag (Chainage 30.5 km):</span>
                    <span className={currentSec >= 3590 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {currentSec >= 3590 ? 'REACHED (T+59.8m)' : 'Arrival in ~' + Math.max(0, Math.round((3590 - currentSec)/60)) + 'm'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Solver Configuration */}
              <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  LISFLOOD-FP 8.1 Setup
                </div>
                <div className="space-y-1">
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Numerical Max Depth</span>
                    <span className="telemetry-row__value text-sky-400">{currentRun.max_depth_m} m</span>
                  </div>
                  <div className="telemetry-row pt-1">
                    <span className="telemetry-row__label">Model Reach Domain</span>
                    <span className="telemetry-row__value">{currentRun.domain_km} km</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Manning Roughness</span>
                    <span className="telemetry-row__value">n = 0.06 (Assumed)</span>
                  </div>
                  <div className="telemetry-row">
                    <span className="telemetry-row__label">Mass Balance Error</span>
                    <span className="telemetry-row__value text-emerald-400">
                      {currentRun.mass_balance_error_pct !== null ? `${currentRun.mass_balance_error_pct}%` : '0.00%'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VILLAGE TRIAGE TAB CONTENT */}
          {activeSidebarTab === 'villages' && (
            <div className="space-y-3">
              {/* Crisis Quick Stat Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-red-950/40 border border-red-800/80 rounded p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-red-300 font-bold">Cut Off / Inundated</div>
                  <div className="text-base font-bold text-red-400 font-mono mt-0.5">
                    {villageRiskData?.isolated_settlements_count || 0}
                  </div>
                </div>
                <div className="bg-amber-950/40 border border-amber-800/80 rounded p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-amber-300 font-bold">Pop at Risk</div>
                  <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                    {(villageRiskData?.total_population_at_risk || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-800/80 rounded p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-300 font-bold">Allocated Evac</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {(villageRiskData?.evacuees_allocated || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Ranked Village Response Queue */}
              <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Village Response Queue (RPI Rank)</span>
                  <span className="text-[9px] text-amber-400">SYNTHETIC DEMO</span>
                </div>
                <div className="space-y-1.5">
                  {villageRiskData?.settlements?.map((s, idx) => {
                    const isDirect = s.isolation_status === 'DIRECTLY_INUNDATED';
                    const isCutoff = s.isolation_status === 'ISOLATED_BY_FLOOD';
                    const isImminent = s.isolation_status === 'ROAD_CUTOFF_IMMINENT';
                    const badgeBg = isDirect
                      ? 'bg-red-950/80 border-red-700 text-red-300'
                      : isCutoff
                      ? 'bg-orange-950/80 border-orange-700 text-orange-300'
                      : isImminent
                      ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                      : 'bg-emerald-950/80 border-emerald-700 text-emerald-300';

                    return (
                      <div
                        key={s.settlement_id}
                        onClick={() => {
                          setSelectedFeature({
                            type: 'Settlement Flood Triage Profile',
                            name: s.name,
                            settlement_id: s.settlement_id,
                            priority_tier: s.priority_tier,
                            response_priority_index: s.response_priority_index,
                            status: isDirect
                              ? '⚠️ DIRECTLY INUNDATED'
                              : isCutoff
                              ? '⛔ ROAD ACCESS CUT OFF (ISOLATED)'
                              : isImminent
                              ? `⏳ ROAD CUTOFF IN ${s.time_to_isolation_countdown_min?.toFixed(0)} min`
                              : `✅ ACCESSIBLE (Cutoff in ${s.time_to_isolation_countdown_min?.toFixed(0)} min)`,
                            population: s.population?.toLocaleString(),
                            demographics: s.demographics,
                            elevation: `${s.elevation_m} m`,
                            chainage: `${s.distance_from_dam_km} km downstream of Tehri Dam`,
                            arrivalMin: s.flood_arrival_time_min,
                            roadCutoffMin: s.road_cutoff_time_min,
                            countdownMin: s.time_to_isolation_countdown_min,
                            peakDepthM: s.peak_depth_m,
                            shelter: s.assigned_shelter_name,
                            shelterDistKm: s.nearest_shelter_distance_km,
                            routeStatus: s.route_status,
                            modeLabel: s.mode_label,
                          });
                        }}
                        className="rounded border border-slate-800 bg-slate-900/60 p-2 hover:border-sky-500 cursor-pointer transition space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] text-slate-500 font-bold">#{idx + 1}</span>
                            <span className="font-bold text-white text-[11px]">{s.name}</span>
                          </div>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${badgeBg}`}>
                            {isDirect
                              ? 'INUNDATED'
                              : isCutoff
                              ? 'ISOLATED'
                              : isImminent
                              ? 'CUTOFF SOON'
                              : 'SAFE'}
                          </span>
                        </div>

                        <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${s.response_priority_index}%`,
                              backgroundColor:
                                s.response_priority_index >= 75
                                  ? '#ef4444'
                                  : s.response_priority_index >= 50
                                  ? '#f59e0b'
                                  : '#3b82f6',
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                          <span>Pop: {s.population?.toLocaleString()}</span>
                          <span>Arrival: T+{s.flood_arrival_time_min?.toFixed(0)}m</span>
                          <span className="text-amber-300 font-bold">RPI: {s.response_priority_index}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Emergency Alert Drafts with Review Action */}
              <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Bell className="w-3.5 h-3.5" />
                    Emergency Advisories Queue
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {villageRiskData?.alerts_queue?.length || 0} Drafts
                  </span>
                </div>
                <div className="text-[9px] text-amber-400/90 bg-amber-950/40 border border-amber-800/80 rounded px-2 py-1 leading-tight">
                  HUMAN REVIEW REQUIRED &middot; Automated public dispatch disabled.
                </div>

                <div className="space-y-2 pt-1">
                  {villageRiskData?.alerts_queue?.slice(0, 3).map((a) => (
                    <div
                      key={a.alert_id}
                      className="border border-slate-800 bg-slate-900/80 rounded p-2 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-white">{a.settlement_name}</span>
                        <span
                          className={`text-[8px] font-bold px-1 rounded ${
                            a.review_status === 'APPROVED'
                              ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                              : a.review_status === 'UNDER_REVIEW'
                              ? 'bg-sky-950 border border-sky-700 text-sky-300'
                              : 'bg-amber-950 border border-amber-700 text-amber-300'
                          }`}
                        >
                          {a.review_status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">
                        {a.recommended_action}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-[9px] text-slate-500 font-mono">
                          Shelter: {a.recommended_shelter}
                        </span>
                        {a.review_status === 'DRAFT' && (
                          <button
                            onClick={async () => {
                              try {
                                await api.reviewAlert(a.alert_id, {
                                  review_status: 'UNDER_REVIEW',
                                  reviewed_by: 'COMMANDER',
                                });
                                setVillageRiskData((prev) => ({
                                  ...prev,
                                  alerts_queue: prev.alerts_queue.map((item) =>
                                    item.alert_id === a.alert_id
                                      ? { ...item, review_status: 'UNDER_REVIEW' }
                                      : item
                                  ),
                                }));
                              } catch (err) {
                                console.error('Alert review failed:', err);
                              }
                            }}
                            className="px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white text-[9px] font-bold rounded transition"
                          >
                            Mark Reviewed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shelter Capacities */}
              <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Corridor Shelter Capacities
                </div>
                <div className="space-y-2">
                  {villageRiskData?.shelters?.map((sh) => {
                    const occ = sh.occupancy_percent || 0;
                    const barColor = occ > 90 ? '#ef4444' : occ > 60 ? '#f59e0b' : '#10b981';
                    return (
                      <div key={sh.shelter_id} className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-300 font-medium truncate max-w-[190px]">
                            {sh.name}
                          </span>
                          <span className="font-mono text-slate-400">
                            {sh.allocated_evacuees} / {sh.capacity} ({occ.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
                          <div
                            className="h-full rounded transition-all duration-300"
                            style={{ width: `${Math.min(100, occ)}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
