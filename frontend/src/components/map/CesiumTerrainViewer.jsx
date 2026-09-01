import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  AlertTriangle,
  RotateCcw,
  Layers,
  MapPin,
  Mountain,
  Eye,
  Loader2,
  X,
} from 'lucide-react';
import { getCesiumIonToken, isCesiumConfigured } from '../../utils/cesiumConfig';

const TEHRI_COORDS = {
  lat: 30.378,
  lon: 78.481,
  heightM: 260.5,
};

const KEY_3D_MARKERS = [
  { name: 'Tehri Dam (260.5m)', lat: 30.378, lon: 78.481, elev: 830, color: '#38bdf8' },
  { name: 'NDRF Base (Chamba Ridge)', lat: 30.345, lon: 78.395, elev: 1450, color: '#22c55e' },
  { name: 'Sirain Village', lat: 30.362, lon: 78.490, elev: 780, color: '#ef4444' },
  { name: 'Tipri Riverside', lat: 30.335, lon: 78.498, elev: 745, color: '#f59e0b' },
  { name: 'Koteshwar Dam', lat: 30.278, lon: 78.512, elev: 615, color: '#38bdf8' },
];

export default function CesiumTerrainViewer({ onReturnTo2D }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = getCesiumIonToken();

  useEffect(() => {
    if (!token) {
      setError('MISSING_TOKEN');
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Dynamically load Cesium script & CSS if not present
    const loadCesiumScript = () => {
      return new Promise((resolve, reject) => {
        if (window.Cesium) {
          resolve(window.Cesium);
          return;
        }

        // Add Cesium CSS
        const existingLink = document.getElementById('cesium-css');
        if (!existingLink) {
          const link = document.createElement('link');
          link.id = 'cesium-css';
          link.rel = 'stylesheet';
          link.href = 'https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Widgets/widgets.css';
          document.head.appendChild(link);
        }

        // Add Cesium JS
        const existingScript = document.getElementById('cesium-script');
        if (existingScript) {
          existingScript.onload = () => resolve(window.Cesium);
          existingScript.onerror = reject;
          return;
        }

        const script = document.createElement('script');
        script.id = 'cesium-script';
        script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Cesium.js';
        script.async = true;
        script.onload = () => resolve(window.Cesium);
        script.onerror = () => reject(new Error('Failed to load CesiumJS from CDN'));
        document.head.appendChild(script);
      });
    };

    loadCesiumScript()
      .then((Cesium) => {
        if (!isMounted || !containerRef.current) return;

        try {
          Cesium.Ion.defaultAccessToken = token;

          const viewer = new Cesium.Viewer(containerRef.current, {
            terrainProvider: Cesium.createWorldTerrain
              ? Cesium.createWorldTerrain({ requestWaterMask: false })
              : undefined,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            animation: false,
            navigationHelpButton: false,
            fullscreenButton: false,
          });

          viewerRef.current = viewer;

          // Focus camera on Tehri Dam looking down Bhagirathi Gorge
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(78.470, 30.340, 4800.0),
            orientation: {
              heading: Cesium.Math.toRadians(25.0),
              pitch: Cesium.Math.toRadians(-35.0),
              roll: 0.0,
            },
            duration: 1.5,
          });

          // Add key 3D pin entities
          KEY_3D_MARKERS.forEach((m) => {
            viewer.entities.add({
              name: m.name,
              position: Cesium.Cartesian3.fromDegrees(m.lon, m.lat, m.elev + 50),
              point: {
                pixelSize: 10,
                color: Cesium.Color.fromCssColorString(m.color),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
              },
              label: {
                text: m.name,
                font: '10pt monospace',
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                outlineWidth: 2,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -12),
                fillColor: Cesium.Color.fromCssColorString('#f1f5f9'),
                outlineColor: Cesium.Color.BLACK,
              },
            });
          });

          setLoading(false);
        } catch (err) {
          console.warn('Cesium initialization error:', err);
          setError('INIT_FAILED');
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Cesium script load error:', err);
        setError('SCRIPT_LOAD_FAILED');
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [token]);

  const handleResetCamera = () => {
    if (window.Cesium && viewerRef.current) {
      viewerRef.current.camera.flyTo({
        destination: window.Cesium.Cartesian3.fromDegrees(78.470, 30.340, 4800.0),
        orientation: {
          heading: window.Cesium.Math.toRadians(25.0),
          pitch: window.Cesium.Math.toRadians(-35.0),
          roll: 0.0,
        },
        duration: 1.0,
      });
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--surface-1)] p-6 text-center">
        <div className="max-w-md p-6 rounded-2xl bg-[var(--surface-2)] border border-[var(--surface-border)] flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Mountain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              3D Terrain Unavailable
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              {error === 'MISSING_TOKEN'
                ? 'Cesium Ion access token is not configured in frontend/.env.local.'
                : 'Unable to establish 3D terrain stream. 2D operational map remains fully functional.'}
            </p>
          </div>
          <button
            onClick={onReturnTo2D}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
          >
            Return to 2D Operational Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#070b12]">
      {/* 3D Canvas container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[#070b12]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <p className="text-xs font-mono text-cyan-200">Streaming Himalayan 3D Terrain Mesh...</p>
        </div>
      )}

      {/* Top Floating Badge */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="status-pill status-pill--prototype text-[9px] pointer-events-auto">
          Cesium Ion · 3D Terrain Preview · Himalayan Elevation Model
        </div>
        <div className="floating-control px-2.5 py-1 text-[9px] font-mono text-[var(--text-secondary)] pointer-events-auto">
          Tehri Dam (30.378°N, 78.481°E) · Bhagirathi Canyon
        </div>
      </div>

      {/* Floating 3D Controls */}
      <div className="absolute bottom-4 left-3 z-10 flex items-center gap-2">
        <button
          onClick={onReturnTo2D}
          className="floating-control flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
        >
          <span>← Switch to 2D Map</span>
        </button>

        <button
          onClick={handleResetCamera}
          className="floating-control flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          title="Reset Camera to Tehri Gorge"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Camera</span>
        </button>
      </div>
    </div>
  );
}
