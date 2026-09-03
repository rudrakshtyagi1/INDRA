import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import L from 'leaflet';
import { useRun } from '../context/RunContext';
import { useV3Data } from '../hooks/useV3Data';
import ExportMenu from '../components/ExportMenu';

export default function Exposure() {
  const { currentRun, selectedRunId } = useRun();
  const v3 = useV3Data();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedAsset, setSelectedAsset] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({});
  const domainLayerRef = useRef(null);

  // Init Map
  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      maxBounds: [
        [29.5, 77.8],
        [31.0, 79.2],
      ],
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '&copy; Esri, Maxar', maxZoom: 18 }
    ).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    if (currentRun.domain_bounds) {
      map.fitBounds(currentRun.domain_bounds, { padding: [30, 30] });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Camera and Domain on run change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentRun.domain_bounds) {
      map.fitBounds(currentRun.domain_bounds, { padding: [30, 30] });
    }

    if (domainLayerRef.current) {
      map.removeLayer(domainLayerRef.current);
      domainLayerRef.current = null;
    }
    if (currentRun.domain_bounds) {
      const b = currentRun.domain_bounds;
      domainLayerRef.current = L.polygon(
        [
          [b[0][0], b[0][1]],
          [b[0][0], b[1][1]],
          [b[1][0], b[1][1]],
          [b[1][0], b[0][1]],
        ],
        { color: '#38bdf8', weight: 1.5, fill: false, dashArray: '6, 6' }
      ).addTo(map);
    }
  }, [selectedRunId]);

  // Sync Vector Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    ['roads', 'settlements', 'healthcare', 'bridges', 'power'].forEach((k) => {
      if (layersRef.current[k]) {
        map.removeLayer(layersRef.current[k]);
        layersRef.current[k] = null;
      }
    });

    const isVisible = (k) => activeFilter === 'ALL' || activeFilter === k;

    // Roads
    if (isVisible('roads') && v3.v3Roads) {
      layersRef.current.roads = L.geoJSON(v3.v3Roads, {
        style: { color: '#f97316', weight: 2.5, opacity: 0.9 },
        onEachFeature: (f, layer) => {
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedAsset({
              type: 'Road Infrastructure',
              name: f.properties?.name || 'Road Segment',
              status: 'WETTED BY HAZARD EXTENT',
              details: `${f.properties?.highway || 'primary'} &middot; Length: ${(f.properties?.length_m || 250).toFixed(0)}m`,
            });
          });
        },
      }).addTo(map);
    }

    // Settlements
    if (isVisible('settlements') && v3.v3Context?.settlements) {
      layersRef.current.settlements = L.geoJSON(v3.v3Context.settlements, {
        pointToLayer: (f, latlng) =>
          L.circleMarker(latlng, { radius: 3.5, fillColor: '#94a3b8', fillOpacity: 0.6, color: '#fff', weight: 1 }),
        onEachFeature: (f, layer) => {
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedAsset({
              type: 'Settlement Node',
              name: f.properties?.name || 'Settlement',
              status: 'NO INTERSECTION WITH CURRENT MODELLED HAZARD EXTENT',
              details: 'Outside wetted corridor &middot; Not classified as safe beyond model reach',
            });
          });
        },
      }).addTo(map);
    }

    // Healthcare
    if (isVisible('healthcare') && v3.v3Context?.healthcare) {
      layersRef.current.healthcare = L.geoJSON(v3.v3Context.healthcare, {
        pointToLayer: (f, latlng) =>
          L.circleMarker(latlng, { radius: 4, fillColor: '#ef4444', fillOpacity: 0.7, color: '#fff', weight: 1 }),
        onEachFeature: (f, layer) => {
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedAsset({
              type: 'Healthcare Lifeline',
              name: f.properties?.name || 'Medical Facility',
              status: 'NO INTERSECTION WITH CURRENT MODELLED HAZARD EXTENT',
              details: 'Facility active &middot; Regional access contingent on road network',
            });
          });
        },
      }).addTo(map);
    }

    // Bridges
    if (isVisible('bridges') && v3.v3Context?.bridges) {
      layersRef.current.bridges = L.geoJSON(v3.v3Context.bridges, {
        pointToLayer: (f, latlng) =>
          L.circleMarker(latlng, { radius: 4, fillColor: '#eab308', fillOpacity: 0.7, color: '#fff', weight: 1 }),
        onEachFeature: (f, layer) => {
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedAsset({
              type: 'Bridge Crossing',
              name: f.properties?.name || 'River Bridge',
              status: 'NO DIRECT OVERTOPPING IN MODELLED REACH',
              details: 'Hydraulic head clearance subject to localized gorge backwater',
            });
          });
        },
      }).addTo(map);
    }

    // Power
    if (isVisible('power') && v3.v3Context?.power) {
      layersRef.current.power = L.geoJSON(v3.v3Context.power, {
        pointToLayer: (f, latlng) =>
          L.circleMarker(latlng, { radius: 4, fillColor: '#a855f7', fillOpacity: 0.7, color: '#fff', weight: 1 }),
        onEachFeature: (f, layer) => {
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedAsset({
              type: 'Power Infrastructure',
              name: f.properties?.name || 'Substation / Line',
              status: 'OUTSIDE ACTIVE INUNDATION REACH',
              details: 'Grid transmission line &middot; No ground substation flooded',
            });
          });
        },
      }).addTo(map);
    }
  }, [v3, activeFilter, selectedRunId]);

  return (
    <div className="h-full w-full flex bg-[#0B0F19] text-slate-100 overflow-hidden select-none">
      {/* Center Operational Exposure Map (70% width) */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative border-r border-slate-800">
        {/* Subheader */}
        <div className="h-9 bg-[#111827] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-sky-400 font-bold font-sans flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              CRITICAL INFRASTRUCTURE EXPOSURE MAP
            </span>
            <span className="text-slate-600">{'//'}</span>
            <span className="text-slate-300">
              LAYER FILTER: <strong className="text-white">{activeFilter}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'roads', 'settlements', 'healthcare', 'bridges', 'power'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                  activeFilter === cat
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Map Canvas */}
        <div className="flex-1 relative" ref={mapContainerRef}>
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded p-2.5 text-[10px] font-mono space-y-1 shadow-xl">
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Asset Symbology</div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-3 h-1 bg-orange-500 rounded-xs" />
              <span>Wetted Roads ({currentRun.road_exposed_km} km)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Settlements (0 wetted in reach)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Healthcare (0 wetted in reach)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Bridges (0 wetted in reach)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Power Assets (0 wetted in reach)</span>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="h-10 bg-[#0F172A] border-t border-slate-800 px-4 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] text-amber-400">
              NO INTERSECTION WITH CURRENT MODELLED HAZARD EXTENT &middot; NOT CLASSIFIED AS SAFE BEYOND DOMAIN
            </span>
          </div>
          <ExportMenu
            products={[
              'exposed_roads',
              'exposed_settlements',
              'exposed_healthcare',
              'exposed_bridges',
              'exposed_power',
              'exposure_summary',
            ]}
          />
        </div>
      </div>

      {/* Right Exposure Inspector (30% width, 360px) */}
      <div className="w-[360px] bg-[#111827] flex flex-col h-full overflow-y-auto shrink-0 text-xs">
        <div className="h-9 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0F172A]">
          <span className="font-bold text-slate-200 tracking-wider uppercase text-[11px] flex items-center gap-1.5 font-sans">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Asset Telemetry Inspector
          </span>
          <span className="status-tag status-tag--data">{currentRun.shortName}</span>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* Selected Asset Details */}
          {selectedAsset && (
            <div className="border border-sky-800/80 rounded bg-sky-950/40 p-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-sky-400 uppercase">
                <span>{selectedAsset.type}</span>
                <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-white">
                  &times;
                </button>
              </div>
              <div className="font-bold text-white text-xs">{selectedAsset.name}</div>
              <div className="text-[11px] font-mono text-slate-300">Status: {selectedAsset.status}</div>
              <div className="text-[10px] text-slate-400 leading-snug">{selectedAsset.details}</div>
            </div>
          )}

          {/* Road Exposure Card */}
          <div className="border border-orange-900/60 rounded bg-orange-950/20 p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
              Road Network Exposure
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">Exposed Road Length</span>
                <span className="telemetry-row__value text-orange-400 font-bold">
                  {currentRun.road_exposed_km} km
                </span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Wetted Segments</span>
                <span className="telemetry-row__value text-orange-300">
                  {currentRun.road_segments_intersected} segments
                </span>
              </div>
              {currentRun.earliest_road_exposure_s && (
                <div className="telemetry-row">
                  <span className="telemetry-row__label">Earliest Wetted Time</span>
                  <span className="telemetry-row__value text-amber-400">
                    T+{currentRun.earliest_road_exposure_s}s
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Other Lifelines */}
          <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Critical Facility Intersections
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">Settlements Wetted</span>
                <span className="telemetry-row__value text-emerald-400">0 in reach</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Healthcare Lifelines</span>
                <span className="telemetry-row__value text-emerald-400">0 in reach</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">River Bridges</span>
                <span className="telemetry-row__value text-emerald-400">0 in reach</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-row__label">Power Sub-stations</span>
                <span className="telemetry-row__value text-emerald-400">0 in reach</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1 leading-snug">
              Derived from spatial overlay of OSM vector layers against LISFLOOD-FP maximum flood footprint.
            </p>
          </div>

          {/* Depth Classification */}
          <div className="border border-slate-800 rounded bg-[#0B0F19] p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Road Depth Breakdown
            </div>
            <div className="space-y-1">
              <div className="telemetry-row">
                <span className="telemetry-row__label">&gt; 5.0 m (High Hazard)</span>
                <span className="telemetry-row__value text-red-400">
                  {selectedRunId === 'v4_extended' ? '73 segments' : '52 segments'}
                </span>
              </div>
              {selectedRunId === 'v4_extended' && (
                <div className="telemetry-row">
                  <span className="telemetry-row__label">0.5 – 1.5 m (Moderate)</span>
                  <span className="telemetry-row__value text-amber-400">1 segment</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
