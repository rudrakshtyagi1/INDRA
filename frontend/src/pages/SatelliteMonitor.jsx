import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Database,
  ExternalLink,
  Layers,
  MapPin,
  RefreshCw,
  Satellite,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_BBOX = [78.30, 30.25, 78.85, 30.70];

function bboxToLeafletBounds(bbox) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return [[minLat, minLon], [maxLat, maxLon]];
}

export default function SatelliteMonitor() {
  const [status, setStatus] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('tehri_upstream');
  const [bboxInput, setBboxInput] = useState(DEFAULT_BBOX.join(', '));
  const [preDate, setPreDate] = useState('2024-07-15');
  const [postDate, setPostDate] = useState('2024-08-15');
  const [windowDays, setWindowDays] = useState(12);
  const [polarization, setPolarization] = useState('VV');
  const [orbitPass, setOrbitPass] = useState('');
  const [excludePermanent, setExcludePermanent] = useState(true);
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [modelProducts, setModelProducts] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('TEHRI_V3_BENCHMARK');
  const [comparisonPurpose, setComparisonPurpose] = useState('context');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeLayer, setActiveLayer] = useState('change');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayersRef = useRef({});
  const vectorLayerRef = useRef(null);
  const bboxLayerRef = useRef(null);

  const parsedBbox = useMemo(() => {
    const parts = bboxInput.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      return parts;
    }
    return DEFAULT_BBOX;
  }, [bboxInput]);

  const loadStatus = async () => {
    try {
      const data = await api.getSatelliteStatus();
      setStatus(data);
    } catch {
      setStatus({
        google_earth_engine: {
          configured: false,
          authenticated: false,
          auth_method: 'UNREACHABLE',
          error: 'Backend unreachable',
        },
      });
    }
  };

  const loadZones = async () => {
    try {
      const data = await api.getGEEZones();
      setZones(data.zones || []);
    } catch {
      setZones([]);
    }
  };

  const loadAnalyses = async () => {
    try {
      const data = await api.listSatelliteAnalyses(20);
      setAnalyses(data.analyses || []);
    } catch {
      setAnalyses([]);
    }
  };

  const loadModelProducts = async () => {
    try {
      const data = await api.listSatelliteModelProducts();
      setModelProducts(data.products || []);
    } catch {
      setModelProducts([]);
    }
  };

  useEffect(() => {
    loadStatus();
    loadZones();
    loadAnalyses();
    loadModelProducts();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [30.4, 78.5],
      zoom: 9,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (bboxLayerRef.current) {
      map.removeLayer(bboxLayerRef.current);
    }
    const bounds = bboxToLeafletBounds(parsedBbox);
    bboxLayerRef.current = L.rectangle(bounds, {
      color: '#2563eb',
      weight: 2,
      fill: false,
      dashArray: '4, 4',
    }).addTo(map);
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [parsedBbox]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(tileLayersRef.current).forEach((layer) => map.removeLayer(layer));
    tileLayersRef.current = {};
    if (vectorLayerRef.current) {
      map.removeLayer(vectorLayerRef.current);
      vectorLayerRef.current = null;
    }

    if (!selectedAnalysis) return;

    const vis = selectedAnalysis.visualization || {};
    if (vis.pre_tile_url) {
      tileLayersRef.current.pre = L.tileLayer(vis.pre_tile_url, { opacity: 0.85 });
    }
    if (vis.post_tile_url) {
      tileLayersRef.current.post = L.tileLayer(vis.post_tile_url, { opacity: 0.85 });
    }
    if (vis.change_tile_url) {
      tileLayersRef.current.change = L.tileLayer(vis.change_tile_url, { opacity: 0.9 });
    }

    const currentLayer = tileLayersRef.current[activeLayer];
    if (currentLayer) currentLayer.addTo(map);

    if (selectedAnalysis.flood_extent_geojson) {
      vectorLayerRef.current = L.geoJSON(selectedAnalysis.flood_extent_geojson, {
        style: {
          color: '#00b8ff',
          weight: 1.5,
          fillColor: '#00b8ff',
          fillOpacity: 0.45,
        },
      }).addTo(map);
    }
  }, [selectedAnalysis, activeLayer]);

  const handleSelectZone = (zoneId) => {
    setSelectedZone(zoneId);
    const z = zones.find((item) => item.id === zoneId);
    if (z && z.bbox) {
      setBboxInput(z.bbox.join(', '));
    }
  };

  const handleSelectAnalysis = async (analysisId) => {
    setErrorMsg(null);
    try {
      const full = await api.getSatelliteAnalysis(analysisId);
      setSelectedAnalysis(full);
      setComparisonResult(null);
      if (full.aoi && full.aoi.bbox) {
        setBboxInput(full.aoi.bbox.join(', '));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load analysis record');
    }
  };

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setComparisonResult(null);
    try {
      const payload = {
        bbox: parsedBbox,
        pre_date: preDate,
        post_date: postDate,
        window_days: Number(windowDays),
        polarization,
        orbit_pass: orbitPass || undefined,
        exclude_permanent_water: excludePermanent,
      };
      const result = await api.runSARAnalysis(payload);
      setSelectedAnalysis(result);
      await loadAnalyses();
    } catch (err) {
      setErrorMsg(err.message || 'Satellite analysis request failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedAnalysis) return;
    setIsComparing(true);
    setErrorMsg(null);
    try {
      const res = await api.compareSatelliteWithModel(
        selectedAnalysis.analysis_id,
        selectedRunId,
        comparisonPurpose
      );
      setComparisonResult(res);
    } catch (err) {
      setErrorMsg(err.message || 'Model comparison failed');
    } finally {
      setIsComparing(false);
    }
  };

  const geeInfo = status?.google_earth_engine || {};
  const isReady = Boolean(geeInfo.configured && geeInfo.authenticated);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden text-slate-800">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Sentinel-1 Observation Lab
            </h1>
            <p className="text-xs text-slate-500">
              Google Earth Engine Bitemporal SAR Surface-Water Change Detection
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border bg-slate-50 border-slate-200">
            <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="font-semibold text-slate-700">GEE Provider:</span>
            <span className="text-slate-600">
              {isReady
                ? `AUTHENTICATED (${geeInfo.project_id || 'active'})`
                : geeInfo.configured
                ? 'STANDBY / AUTH UNAVAILABLE'
                : 'STANDBY / PROJECT NOT CONFIGURED'}
            </span>
          </div>
          <button
            onClick={loadStatus}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded border border-slate-200 hover:bg-slate-100 transition"
            title="Refresh Provider Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-start gap-3 text-xs text-amber-900 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Observation engine is in Standby mode: </span>
            {geeInfo.configured
              ? 'GEE_PROJECT_ID is set, but host credentials could not complete the handshake. Live SAR compute is gated behind credentials.'
              : 'GEE_PROJECT_ID is not configured in backend/.env. No synthetic SAR observations or fake lake detections are presented.'}
            <span className="text-amber-700 ml-1">
              Historical/saved analyses remain readable below.
            </span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center justify-between text-xs text-red-700 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold px-2 text-red-600 hover:text-red-900">
            &times;
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="w-96 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Analysis Configuration
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Preset Surveillance Zone</label>
                <select
                  value={selectedZone}
                  onChange={(e) => handleSelectZone(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">AOI Bounding Box [W, S, E, N]</label>
                <input
                  type="text"
                  value={bboxInput}
                  onChange={(e) => setBboxInput(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 font-mono text-[11px] bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Pre-Event Date</label>
                  <input
                    type="date"
                    value={preDate}
                    onChange={(e) => setPreDate(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:bg-white text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Post-Event Date</label>
                  <input
                    type="date"
                    value={postDate}
                    onChange={(e) => setPostDate(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:bg-white text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Window</label>
                  <select
                    value={windowDays}
                    onChange={(e) => setWindowDays(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 bg-slate-50 text-[11px]"
                  >
                    <option value={6}>&plusmn;6 days</option>
                    <option value={12}>&plusmn;12 days</option>
                    <option value={24}>&plusmn;24 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Polarization</label>
                  <select
                    value={polarization}
                    onChange={(e) => setPolarization(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 bg-slate-50 text-[11px]"
                  >
                    <option value="VV">VV</option>
                    <option value="VH">VH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Orbit Pass</label>
                  <select
                    value={orbitPass}
                    onChange={(e) => setOrbitPass(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 bg-slate-50 text-[11px]"
                  >
                    <option value="">Auto / Same</option>
                    <option value="ASCENDING">Ascending</option>
                    <option value="DESCENDING">Descending</option>
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={excludePermanent}
                    onChange={(e) => setExcludePermanent(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Exclude permanent water (JRC GSW &ge;90%)</span>
                </label>
              </div>

              <button
                onClick={handleRunAnalysis}
                disabled={!isReady || isRunning}
                className={`w-full py-2 px-3 rounded font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm ${
                  !isReady
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : isRunning
                    ? 'bg-blue-400 text-white cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Running Earth Engine Job...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Execute Bitemporal SAR Analysis
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Analysis History
              </h2>
              <button
                onClick={loadAnalyses}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            {analyses.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center border border-dashed rounded-lg">
                No analyses persisted yet in storage/satellite.
              </div>
            ) : (
              <div className="space-y-2">
                {analyses.map((a) => {
                  const isSelected = selectedAnalysis?.analysis_id === a.analysis_id;
                  const m = a.metrics || {};
                  return (
                    <button
                      key={a.analysis_id}
                      onClick={() => handleSelectAnalysis(a.analysis_id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-[11px] text-slate-800">
                          {a.analysis_id}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {a.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>Water change:</span>
                        <span className="font-semibold text-slate-900">
                          {m.new_surface_water_area_ha !== undefined
                            ? `${m.new_surface_water_area_ha} ha`
                            : '—'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {a.dataset} &middot; Orbit {a.acquisition?.relative_orbit || '—'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-slate-100">
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-700">Map Inspection Layer:</span>
              <div className="inline-flex rounded border border-slate-200 p-0.5 bg-slate-50">
                {['change', 'post', 'pre'].map((layerKey) => (
                  <button
                    key={layerKey}
                    onClick={() => setActiveLayer(layerKey)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      activeLayer === layerKey
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {layerKey.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              {selectedAnalysis
                ? `Displaying ${selectedAnalysis.analysis_id} (${selectedAnalysis.metrics?.polygon_count || 0} vectors)`
                : 'Draws active AOI and selected Earth Engine tiles'}
            </div>
          </div>
          <div className="flex-1 relative" ref={mapContainerRef} />
        </div>

        <div className="w-96 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Analysis Results & Provenance
            </h2>
            {selectedAnalysis ? (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-500 font-medium">New Water Area</span>
                    <span className="font-mono font-bold text-sm text-blue-600">
                      {selectedAnalysis.metrics?.new_surface_water_area_ha} ha
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Approx Area (km&sup2;)</span>
                    <span className="font-mono">
                      {selectedAnalysis.metrics?.new_surface_water_area_km2} km&sup2;
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Otsu Drop Threshold</span>
                    <span className="font-mono">
                      {selectedAnalysis.method?.otsu_threshold_db_drop} dB
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Vector Patches (&ge;900 m&sup2;)</span>
                    <span className="font-mono">
                      {selectedAnalysis.metrics?.polygon_count}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Acquisition Provenance
                  </h3>
                  <div className="border border-slate-200 rounded p-2 text-[11px] space-y-1 bg-white">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sensor:</span>
                      <span className="font-medium text-slate-800">{selectedAnalysis.sensor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Relative Orbit:</span>
                      <span className="font-medium text-slate-800">
                        {selectedAnalysis.acquisition?.relative_orbit || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pre Scenes:</span>
                      <span className="font-medium text-slate-800">
                        {selectedAnalysis.acquisition?.pre_scene_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Post Scenes:</span>
                      <span className="font-medium text-slate-800">
                        {selectedAnalysis.acquisition?.post_scene_count}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-blue-50/60 border border-blue-100 text-[11px] text-slate-700 space-y-1">
                  <div className="font-semibold text-blue-900">Provenance Rule</div>
                  <div>{selectedAnalysis.provenance?.observation}</div>
                  <div className="text-[10px] text-slate-500">
                    Validation: {selectedAnalysis.provenance?.validation}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center border border-dashed rounded-lg">
                Select an analysis from history or execute a new query to inspect results.
              </div>
            )}
          </div>

          <div className="p-4 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Model Comparison
            </h2>
            <p className="text-[11px] text-slate-500 mb-3">
              Intersect satellite-derived surface water with precomputed hydrodynamic model extents.
            </p>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Model Extent Product</label>
                <select
                  value={selectedRunId}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 bg-slate-50 focus:bg-white text-[11px]"
                >
                  {modelProducts.map((p) => (
                    <option key={p.run_id} value={p.run_id}>
                      {p.run_id} {p.available ? '✓' : '(Not mounted)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Comparison Purpose</label>
                <select
                  value={comparisonPurpose}
                  onChange={(e) => setComparisonPurpose(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 bg-slate-50 focus:bg-white text-[11px]"
                >
                  <option value="context">Spatial Context Only (Hypothetical / Benchmark)</option>
                  <option value="historical_validation">
                    Historical Event Validation (Real Disasters Only)
                  </option>
                </select>
              </div>

              <button
                onClick={handleCompare}
                disabled={!selectedAnalysis || isComparing}
                className={`w-full py-1.5 px-3 rounded font-semibold text-xs flex items-center justify-center gap-1.5 border transition ${
                  !selectedAnalysis
                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {isComparing ? 'Computing Spatial Intersect...' : 'Compute Extent Comparison'}
              </button>

              {comparisonResult && (
                <div className="mt-3 p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Classification:</span>
                    <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                      {comparisonResult.validation_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Intersection:</span>
                    <span className="font-mono font-semibold">
                      {comparisonResult.metrics?.intersection_km2} km&sup2;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Union:</span>
                    <span className="font-mono">
                      {comparisonResult.metrics?.union_km2} km&sup2;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Intersection over Union (IoU):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {(comparisonResult.metrics?.iou * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Satellite Coverage of Model:</span>
                    <span className="font-mono">
                      {(comparisonResult.metrics?.satellite_coverage_of_model * 100).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 italic">
                    {comparisonResult.interpretation}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Platform Guidance
            </div>
            <p>
              Tehri dam break is a research what-if benchmark. SAR overlap measures environmental
              reservoir bounds, not validation of a breach event.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
