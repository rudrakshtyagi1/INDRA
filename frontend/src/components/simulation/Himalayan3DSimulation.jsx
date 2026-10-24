import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Camera as CameraIcon,
  Maximize2,
  Compass,
  Waves,
  ShieldAlert,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { useRun } from '../../context/RunContext';

export default function Himalayan3DSimulation({ cvAlert, onSwitchToCv, onSwitchTo2D }) {
  const { currentRun, selectedRunId, setSimTimeSec } = useRun();
  const mountRef = useRef(null);

  // Simulation playback state
  const [currentSec, setCurrentSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cameraPreset, setCameraPreset] = useState('canyon'); // 'canyon', 'dam', 'wave', 'top'
  const [waterResolution, setWaterResolution] = useState('ultra');

  // Animation frame and Three.js object references
  const reqIdRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const waterMeshRef = useRef(null);
  const foamParticlesRef = useRef(null);
  const damMeshRef = useRef(null);
  const breachNotchRef = useRef(null);
  const jetMeshRef = useRef(null);

  // Mouse interaction state for orbital camera
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({
    radius: 420,
    theta: Math.PI / 4,
    phi: Math.PI / 3.2,
    target: new THREE.Vector3(0, 15, 60),
  });

  const durationSec = currentRun?.simulation_window_s || 3600;
  const isBreached = cvAlert?.sync_state?.cv_breach_detected || false;

  // Sync simTimeSec to global context
  useEffect(() => {
    setSimTimeSec(currentSec);
  }, [currentSec, setSimTimeSec]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene with atmospheric Himalayan haze
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101d);
    scene.fog = new THREE.FogExp2(0x0e1726, 0.0012);
    sceneRef.current = scene;

    // 2. Perspective Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting System
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.55);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.45);
    scene.add(hemiLight);

    // Himalayan Sun
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    sunLight.position.set(280, 450, 180);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 50;
    sunLight.shadow.camera.far = 1200;
    const d = 350;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // 5. Build 3D Himalayan Terrain Mesh (Deep canyon gorge)
    const terrainGeo = new THREE.PlaneGeometry(900, 900, 160, 160);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const canyonCurve = (z) => Math.sin(z * 0.012) * 45 + Math.cos(z * 0.005) * 20;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Distance from canyon centerline
      const canyonCenterX = canyonCurve(z);
      const distFromRiver = Math.abs(x - canyonCenterX);

      // Deep V-shaped Himalayan gorge
      let elevation = 0;
      if (distFromRiver < 35) {
        // Valley floor
        elevation = Math.pow(distFromRiver / 35, 2.2) * 35;
      } else {
        // Towering canyon walls and mountain ridges
        const ridgeFactor = Math.sin(x * 0.04) * Math.cos(z * 0.03) * 25;
        elevation = 35 + Math.pow((distFromRiver - 35) / 50, 1.3) * 65 + ridgeFactor;
      }

      // Elevation diminishes downstream toward Rishikesh
      const downstreamSlope = (z + 450) * -0.06;
      elevation += downstreamSlope;

      // Add high-frequency mountain crags
      elevation += Math.sin(x * 0.12) * Math.cos(z * 0.12) * 3.5;
      pos.setY(i, elevation);
    }
    terrainGeo.computeVertexNormals();

    // Terrain Material with rock and alpine coloration
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x223528,
      roughness: 0.88,
      metalness: 0.1,
      flatShading: true,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 6. 3D Tehri Dam Embankment Model
    const damGroup = new THREE.Group();
    // Rockfill embankment trapezoid
    const damGeo = new THREE.BoxGeometry(110, 68, 48);
    const damMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      roughness: 0.92,
      metalness: 0.08,
    });
    const damMesh = new THREE.Mesh(damGeo, damMat);
    damMesh.position.set(0, 36, -180);
    damMesh.castShadow = true;
    damMesh.receiveShadow = true;
    damGroup.add(damMesh);

    // Dam Crest Road (Elevation 839.5m marker)
    const crestRoadGeo = new THREE.BoxGeometry(116, 2.5, 9);
    const crestRoadMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const crestRoad = new THREE.Mesh(crestRoadGeo, crestRoadMat);
    crestRoad.position.set(0, 71, -180);
    damGroup.add(crestRoad);

    // Spillway Chute structure
    const spillGeo = new THREE.BoxGeometry(32, 45, 60);
    const spillMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    const spillMesh = new THREE.Mesh(spillGeo, spillMat);
    spillMesh.position.set(42, 25, -165);
    spillMesh.rotation.x = Math.PI / 10;
    damGroup.add(spillMesh);

    // Breach notch cut (dynamic visibility)
    const notchGeo = new THREE.BoxGeometry(28, 38, 52);
    const notchMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d, wireframe: true });
    const breachNotch = new THREE.Mesh(notchGeo, notchMat);
    breachNotch.position.set(-12, 52, -180);
    breachNotch.visible = false;
    breachNotchRef.current = breachNotch;
    damGroup.add(breachNotch);

    scene.add(damGroup);
    damMeshRef.current = damGroup;

    // 7. Reservoir Upstream Water Pool (Behind Tehri Dam)
    const resGeo = new THREE.PlaneGeometry(160, 240, 32, 32);
    resGeo.rotateX(-Math.PI / 2);
    const resMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
    });
    const resMesh = new THREE.Mesh(resGeo, resMat);
    resMesh.position.set(0, 64, -300);
    scene.add(resMesh);

    // 8. Downstream Smooth Fluid Water River & Flood Wave Mesh
    const riverSegments = 180;
    const riverWidth = 36;
    const riverGeo = new THREE.PlaneGeometry(riverWidth, 700, 24, riverSegments);
    riverGeo.rotateX(-Math.PI / 2);

    // Distort river geometry along the canyon curves smoothly
    const riverPos = riverGeo.attributes.position;
    for (let i = 0; i < riverPos.count; i++) {
      const x = riverPos.getX(i);
      const z = riverPos.getZ(i);
      const cX = canyonCurve(z - 180);
      riverPos.setX(i, x + cX);
      // Slope down along the river bed
      const riverElevation = 18 - (z + 180) * 0.055;
      riverPos.setY(i, riverElevation);
    }
    riverGeo.computeVertexNormals();

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.15,
      metalness: 0.75,
      transparent: true,
      opacity: 0.82,
    });
    const waterMesh = new THREE.Mesh(riverGeo, waterMat);
    waterMesh.position.set(0, 2, 170);
    waterMesh.castShadow = true;
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // 9. Spray & Foam Particle Stream
    const pCount = 1200;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    const pVelocities = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3 + 0] = (Math.random() - 0.5) * 24;
      pPositions[i * 3 + 1] = 12 + Math.random() * 8;
      pPositions[i * 3 + 2] = -160 + Math.random() * 40;

      pVelocities[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
      pVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      pVelocities[i * 3 + 2] = 2.0 + Math.random() * 3.5;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 2.2,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const foamParticles = new THREE.Points(pGeo, pMat);
    scene.add(foamParticles);
    foamParticlesRef.current = { mesh: foamParticles, velocities: pVelocities };

    // 10. Hydraulic Outflow Jet Plume (when breach occurs)
    const jetGeo = new THREE.ConeGeometry(14, 55, 24);
    jetGeo.rotateX(Math.PI / 2);
    const jetMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.88,
    });
    const jetMesh = new THREE.Mesh(jetGeo, jetMat);
    jetMesh.position.set(0, 28, -135);
    jetMesh.visible = false;
    scene.add(jetMesh);
    jetMeshRef.current = jetMesh;

    // 11. Mouse Drag & Wheel Event Listeners for smooth Orbit Control
    const handleMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      sphericalRef.current.theta -= dx * 0.005;
      sphericalRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2.1, sphericalRef.current.phi - dy * 0.005));
      updateCameraPosition();
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      sphericalRef.current.radius = Math.max(80, Math.min(800, sphericalRef.current.radius + e.deltaY * 0.35));
      updateCameraPosition();
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // 12. Main Animation & Fluid Undulation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Fluid Wave Undulation on Water Mesh vertices
      if (waterMeshRef.current) {
        const wPos = waterMeshRef.current.geometry.attributes.position;
        const waveSpeed = isBreached ? 4.5 : 2.0;
        const waveHeight = isBreached ? 3.2 : 1.4;

        for (let i = 0; i < wPos.count; i++) {
          const uX = wPos.getX(i);
          const uZ = wPos.getZ(i);
          // Sinusoidal Gerstner fluid wave surface
          const waveDisplacement =
            Math.sin(uZ * 0.08 - elapsedTime * waveSpeed) * waveHeight +
            Math.cos(uX * 0.15 + elapsedTime * 1.5) * (waveHeight * 0.4);
          
          const baseElevation = 18 - (uZ + 180) * 0.055;
          wPos.setY(i, baseElevation + waveDisplacement);
        }
        waterMeshRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Foam particle stream update
      if (foamParticlesRef.current) {
        const { mesh, velocities } = foamParticlesRef.current;
        const pPos = mesh.geometry.attributes.position;
        for (let i = 0; i < pCount; i++) {
          pPos.setZ(i, pPos.getZ(i) + velocities[i * 3 + 2]);
          pPos.setX(i, pPos.getX(i) + velocities[i * 3 + 0]);

          // Loop particles when they flow downstream
          if (pPos.getZ(i) > 220) {
            pPos.setZ(i, -160 + Math.random() * 20);
            pPos.setX(i, (Math.random() - 0.5) * 20);
            pPos.setY(i, 12 + Math.random() * 8);
          }
        }
        pPos.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Camera Position based on Spherical Coordinates
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { radius, theta, phi, target } = sphericalRef.current;
    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);
  };

  // Switch Camera Viewpoint Presets
  const applyCameraPreset = (preset) => {
    setCameraPreset(preset);
    if (preset === 'dam') {
      // Close up at Tehri Dam Crest & Breach Notch
      sphericalRef.current = {
        radius: 170,
        theta: Math.PI / 3.5,
        phi: Math.PI / 4,
        target: new THREE.Vector3(0, 45, -170),
      };
    } else if (preset === 'wave') {
      // Follow the surging flood wave head downstream
      const waveZ = -160 + (currentSec / 3600) * 380;
      sphericalRef.current = {
        radius: 220,
        theta: Math.PI / 2.2,
        phi: Math.PI / 3.8,
        target: new THREE.Vector3(0, 20, waveZ),
      };
    } else if (preset === 'top') {
      // Top down tactical view
      sphericalRef.current = {
        radius: 520,
        theta: 0,
        phi: 0.1,
        target: new THREE.Vector3(0, 10, 0),
      };
    } else {
      // Wide cinematic Himalayan canyon overview
      sphericalRef.current = {
        radius: 440,
        theta: Math.PI / 4,
        phi: Math.PI / 3.2,
        target: new THREE.Vector3(0, 15, 60),
      };
    }
    updateCameraPosition();
  };

  // Synchronize Simulation Time, Wave Scale & Visual Breach Mechanics
  useEffect(() => {
    if (breachNotchRef.current) {
      breachNotchRef.current.visible = isBreached;
    }
    if (jetMeshRef.current) {
      jetMeshRef.current.visible = isBreached || currentSec > 180;
      if (jetMeshRef.current.visible) {
        // Scale jet volume according to discharge
        const scale = isBreached ? 2.4 : 1.0;
        jetMeshRef.current.scale.set(scale, scale, scale);
      }
    }

    // Dynamic wave reach expansion as time progresses
    if (waterMeshRef.current) {
      // Stretch water reach along the canyon
      const reachProgress = Math.min(1.0, 0.12 + (currentSec / durationSec) * 0.88);
      waterMeshRef.current.scale.set(1.0 + (isBreached ? 0.35 : 0), 1.0, reachProgress);

      // Deepen color if breach flux is active
      const mat = waterMeshRef.current.material;
      if (isBreached) {
        mat.color.setHex(0x1d4ed8);
        mat.opacity = 0.92;
      } else {
        mat.color.setHex(0x0ea5e9);
        mat.opacity = 0.82;
      }
    }
  }, [currentSec, isBreached, durationSec]);

  // Playback Timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 1000 / playbackSpeed;
    const timer = setInterval(() => {
      setCurrentSec((prev) => {
        const next = prev + 60;
        if (next > durationSec) {
          setIsPlaying(false);
          return durationSec;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, durationSec]);

  const hrs = Math.floor(currentSec / 3600);
  const mins = Math.floor((currentSec % 3600) / 60);
  const secs = currentSec % 60;
  const timeLabel = `T+${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const waveReachKm = ((currentSec / durationSec) * 48.0).toFixed(1);

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#070B14] select-none font-mono">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Tactical 3D HUD Header (Minimalist & Sleek) */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2 pointer-events-auto bg-[#0F172A]/90 border border-slate-700/80 px-3 py-1.5 rounded backdrop-blur-md shadow-xl">
          <Waves className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            3D HIMALAYAN FLUID FLOOD ENGINE
          </span>
          <span className="text-[10px] text-slate-400">|</span>
          <span className="text-[10px] text-sky-300 font-bold">
            TEHRI CANYON CORRIDOR (30 km)
          </span>
        </div>

        {/* Actions & Breach Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2">
          {onSwitchTo2D && (
            <button
              onClick={onSwitchTo2D}
              className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 shadow-md"
            >
              <span>🗺️ 2D MAP</span>
            </button>
          )}
          {isBreached ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/90 border border-red-500 text-red-200 text-xs font-bold backdrop-blur-md shadow-2xl animate-pulse">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>BREACH SURGE ACTIVE: 723,705 m³/s</span>
            </div>
          ) : (
            <button
              onClick={onSwitchToCv}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/80 text-emerald-300 text-xs font-bold backdrop-blur-md transition cursor-pointer"
              title="Inspect Optical Dam Breach Camera"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>RESERVOIR REGULATED: 2,113 m³/s (OPTICAL HUD)</span>
            </button>
          )}
        </div>
      </div>

      {/* Camera Viewpoint Selector Toolbar */}
      <div className="absolute top-14 left-4 flex flex-col gap-1.5 z-20 pointer-events-auto">
        <div className="bg-[#0F172A]/90 border border-slate-800 rounded p-1.5 backdrop-blur-md flex flex-col gap-1 shadow-lg">
          <div className="text-[9px] text-slate-400 uppercase font-bold px-1.5 py-0.5">3D VIEWPOINTS</div>
          <button
            onClick={() => applyCameraPreset('canyon')}
            className={`px-2 py-1 rounded text-[10px] font-bold text-left transition ${
              cameraPreset === 'canyon' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🏔️ Canyon Overview
          </button>
          <button
            onClick={() => applyCameraPreset('dam')}
            className={`px-2 py-1 rounded text-[10px] font-bold text-left transition ${
              cameraPreset === 'dam' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            📷 Dam Crest & Breach
          </button>
          <button
            onClick={() => applyCameraPreset('wave')}
            className={`px-2 py-1 rounded text-[10px] font-bold text-left transition ${
              cameraPreset === 'wave' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🌊 Front Surge Wave
          </button>
          <button
            onClick={() => applyCameraPreset('top')}
            className={`px-2 py-1 rounded text-[10px] font-bold text-left transition ${
              cameraPreset === 'top' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🧭 Tactical Top-Down
          </button>
        </div>

        <div className="text-[8px] text-slate-400 bg-black/60 px-2 py-1 rounded backdrop-blur-xs">
          💡 Drag mouse to rotate · Scroll wheel to zoom
        </div>
      </div>

      {/* Floating 3D Telemetry Stats Overlay */}
      <div className="absolute bottom-20 left-4 bg-[#0F172A]/90 border border-slate-800 rounded p-3 backdrop-blur-md shadow-xl flex flex-col gap-2 z-20 pointer-events-auto min-w-[220px]">
        <div className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800 pb-1 flex justify-between">
          <span>FLUID TELEMETRY</span>
          <span className="text-sky-400 font-bold">{timeLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <div className="text-[8px] text-slate-500 uppercase">WAVE FRONT REACH</div>
            <div className="text-xs font-bold text-white">{waveReachKm} km</div>
          </div>
          <div>
            <div className="text-[8px] text-slate-500 uppercase">PEAK WAVE SPEED</div>
            <div className="text-xs font-bold text-sky-400">{isBreached ? '14.8 m/s' : '8.5 m/s'}</div>
          </div>
          <div>
            <div className="text-[8px] text-slate-500 uppercase">DOWNSTREAM FLOW</div>
            <div className="text-xs font-bold text-violet-300">
              {isBreached ? '723,705 m³/s' : '2,113 m³/s'}
            </div>
          </div>
          <div>
            <div className="text-[8px] text-slate-500 uppercase">SURFACE PROFILE</div>
            <div className="text-xs font-bold text-emerald-400">SMOOTH FLUID</div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Timeline Playback Controls Bar */}
      <div className="absolute bottom-3 left-4 right-4 bg-[#0F172A]/95 border border-slate-700/80 px-4 py-2.5 rounded backdrop-blur-md shadow-2xl flex items-center justify-between gap-4 z-20 pointer-events-auto">
        {/* Play / Pause / Step Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setCurrentSec(0)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            title="Reset to T+0s"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentSec((prev) => Math.max(0, prev - 60));
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            title="Step Backward (-1 min)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3.5 py-1.5 font-bold rounded flex items-center gap-1.5 transition shadow-sm ${
              isPlaying ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />}
            <span className="font-sans text-[11px]">{isPlaying ? 'PAUSE' : 'PLAY 3D'}</span>
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentSec((prev) => Math.min(durationSec, prev + 60));
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            title="Step Forward (+1 min)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs font-bold text-white shrink-0 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            {timeLabel}
          </span>
          <input
            type="range"
            min={0}
            max={durationSec}
            step={60}
            value={currentSec}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentSec(parseInt(e.target.value, 10));
            }}
            className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <span className="text-[10px] text-slate-400 shrink-0">T+01:00:00</span>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                playbackSpeed === s ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
