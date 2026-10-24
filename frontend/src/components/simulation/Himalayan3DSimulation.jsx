import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  Building,
  MapPin,
  Eye,
  AlertTriangle,
  Info,
  Navigation,
  X,
} from 'lucide-react';
import { useRun } from '../../context/RunContext';

// Helper to generate an authentic high-resolution satellite GIS map texture
function createSatelliteTerrainTexture(canyonCurve) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 1. Base Himalayan mountain rock & alpine terrain gradient
  const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
  grad.addColorStop(0, '#1c2d1f'); // Deep alpine forest
  grad.addColorStop(0.3, '#2a3d28');
  grad.addColorStop(0.6, '#384b33'); // Terraced foothills
  grad.addColorStop(1, '#233221');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Mountain slope noise & rock strata patches
  for (let i = 0; i < 400; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const rad = 15 + Math.random() * 45;
    const alpha = 0.08 + Math.random() * 0.12;
    ctx.fillStyle = Math.random() > 0.4 ? `rgba(90, 82, 70, ${alpha})` : `rgba(28, 48, 25, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Sandy riverbed corridor following the winding canyon
  ctx.lineWidth = 42;
  ctx.strokeStyle = 'rgba(125, 116, 102, 0.85)'; // Riverbed silt/gravel
  ctx.beginPath();
  for (let py = 0; py <= 1024; py += 16) {
    const worldZ = (py / 1024) * 900 - 450;
    const worldX = canyonCurve(worldZ);
    const px = ((worldX + 450) / 900) * 1024;
    if (py === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Inner river channel silt line
  ctx.lineWidth = 20;
  ctx.strokeStyle = 'rgba(95, 87, 75, 0.9)';
  ctx.stroke();

  // 4. NH-34 Mountain Highway corridor texture
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#262a30'; // Dark tarmac
  ctx.beginPath();
  for (let py = 0; py <= 1024; py += 16) {
    const worldZ = (py / 1024) * 900 - 450;
    const worldX = canyonCurve(worldZ) + 28;
    const px = ((worldX + 450) / 900) * 1024;
    if (py === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Highway centerline dashes
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)'; // Yellow centerline
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 5. GIS Topographic Elevation Contour Lines
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  for (let c = 50; c < 1024; c += 48) {
    ctx.beginPath();
    ctx.arc(512, 512, c, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 6. Agricultural terrace step strips near settlements
  ctx.fillStyle = 'rgba(65, 82, 52, 0.35)';
  for (let t = 0; t < 12; t++) {
    const ty = 200 + t * 50;
    ctx.fillRect(480, ty, 120, 12);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export default function Himalayan3DSimulation({ cvAlert, onSwitchToCv, onSwitchTo2D }) {
  const { currentRun, selectedRunId, setSimTimeSec } = useRun();
  const mountRef = useRef(null);

  // Simulation playback state
  const [currentSec, setCurrentSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cameraPreset, setCameraPreset] = useState('canyon');
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [activeLayers, setActiveLayers] = useState({
    buildings: true,
    infrastructure: true,
    roads: true,
    waterLabels: true,
  });

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
  const interactiveObjectsRef = useRef([]);

  // Mouse interaction state for orbital camera
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({
    radius: 440,
    theta: Math.PI / 4,
    phi: Math.PI / 3.2,
    target: new THREE.Vector3(0, 15, 40),
  });

  const durationSec = currentRun?.simulation_window_s || 3600;
  const isBreached = cvAlert?.sync_state?.cv_breach_detected || false;

  // Sync simTimeSec to global context & animation ref
  const currentSecRef = useRef(currentSec);
  useEffect(() => {
    currentSecRef.current = currentSec;
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
    scene.fog = new THREE.FogExp2(0x0e1726, 0.0011);
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

    // Himalayan Sunlight
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    sunLight.position.set(280, 450, 180);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 50;
    sunLight.shadow.camera.far = 1200;
    const d = 380;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // 5. Build 3D Himalayan Terrain Mesh with Satellite Map Texture
    const terrainGeo = new THREE.PlaneGeometry(900, 900, 160, 160);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const canyonCurve = (z) => Math.sin(z * 0.012) * 45 + Math.cos(z * 0.005) * 20;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      const canyonCenterX = canyonCurve(z);
      const distFromRiver = Math.abs(x - canyonCenterX);

      let elevation = 0;
      if (distFromRiver < 35) {
        elevation = Math.pow(distFromRiver / 35, 2.2) * 35;
      } else {
        const ridgeFactor = Math.sin(x * 0.04) * Math.cos(z * 0.03) * 25;
        elevation = 35 + Math.pow((distFromRiver - 35) / 50, 1.3) * 65 + ridgeFactor;
      }

      const downstreamSlope = (z + 450) * -0.06;
      elevation += downstreamSlope;
      elevation += Math.sin(x * 0.12) * Math.cos(z * 0.12) * 3.5;
      pos.setY(i, elevation);
    }
    terrainGeo.computeVertexNormals();

    const satelliteTexture = createSatelliteTerrainTexture(canyonCurve);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: satelliteTexture,
      roughness: 0.85,
      metalness: 0.08,
      flatShading: false,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 6. 3D Tehri Dam Embankment Model
    const damGroup = new THREE.Group();
    damGroup.userData = {
      name: 'Tehri Dam Embankment (839.5m)',
      type: 'Earth & Rockfill Dam Structure',
      elevation: 839.5,
      population: 450,
      clearance: 'Crest Height: 260.5 m',
      status: 'OPERATIONAL',
    };

    const damGeo = new THREE.BoxGeometry(110, 68, 48);
    const damMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.92 });
    const damMesh = new THREE.Mesh(damGeo, damMat);
    damMesh.position.set(0, 36, -180);
    damMesh.castShadow = true;
    damMesh.receiveShadow = true;
    damGroup.add(damMesh);

    // Dam Crest Road
    const crestRoadGeo = new THREE.BoxGeometry(116, 2.5, 9);
    const crestRoadMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const crestRoad = new THREE.Mesh(crestRoadGeo, crestRoadMat);
    crestRoad.position.set(0, 71, -180);
    damGroup.add(crestRoad);

    // Spillway Chute
    const spillGeo = new THREE.BoxGeometry(32, 45, 60);
    const spillMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    const spillMesh = new THREE.Mesh(spillGeo, spillMat);
    spillMesh.position.set(42, 25, -165);
    spillMesh.rotation.x = Math.PI / 10;
    damGroup.add(spillMesh);

    // Dynamic Breach Notch
    const notchGeo = new THREE.BoxGeometry(28, 38, 52);
    const notchMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d, wireframe: true });
    const breachNotch = new THREE.Mesh(notchGeo, notchMat);
    breachNotch.position.set(-12, 52, -180);
    breachNotch.visible = false;
    breachNotchRef.current = breachNotch;
    damGroup.add(breachNotch);

    scene.add(damGroup);
    damMeshRef.current = damGroup;

    // 7. Reservoir Upstream Water Pool (Behind Dam)
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

    // 8. Downstream Smooth Fluid Water Mesh
    const riverSegments = 160;
    const riverCols = 16;
    const riverGeo = new THREE.PlaneGeometry(1, 1, riverCols, riverSegments);
    riverGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.15,
      metalness: 0.75,
      transparent: true,
      opacity: 0.82,
    });
    const waterMesh = new THREE.Mesh(riverGeo, waterMat);
    waterMesh.position.set(0, 0, 0);
    waterMesh.castShadow = true;
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // 9. Foam & Turbulence Particle Stream
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

    // 10. Hydraulic Outflow Jet Plume
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

    // ==========================================
    // 11. INFRASTRUCTURE & BRIDGES (3D Models)
    // ==========================================
    const infraGroup = new THREE.Group();
    const clickables = [];

    // Helper: Create 3D Bridge spanning the canyon
    const buildBridge = ({ name, zPos, width = 8, length = 50, elevation = 22, type = 'Truss' }) => {
      const bGroup = new THREE.Group();
      const centerX = canyonCurve(zPos);
      bGroup.position.set(centerX, elevation, zPos);

      // Road deck
      const deckGeo = new THREE.BoxGeometry(length, 2.2, width);
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
      const deck = new THREE.Mesh(deckGeo, deckMat);
      deck.castShadow = true;
      bGroup.add(deck);

      // Asphalt tarmac surface
      const tarmacGeo = new THREE.PlaneGeometry(length, width - 0.6);
      tarmacGeo.rotateX(-Math.PI / 2);
      const tarmacMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
      const tarmac = new THREE.Mesh(tarmacGeo, tarmacMat);
      tarmac.position.y = 1.15;
      bGroup.add(tarmac);

      // Concrete foundation abutments
      const pierGeo = new THREE.BoxGeometry(6, 28, width + 2);
      const pierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
      const leftPier = new THREE.Mesh(pierGeo, pierMat);
      leftPier.position.set(-length / 2 + 3, -12, 0);
      bGroup.add(leftPier);

      const rightPier = new THREE.Mesh(pierGeo, pierMat);
      rightPier.position.set(length / 2 - 3, -12, 0);
      bGroup.add(rightPier);

      // Suspension Towers & Cables (if suspension bridge)
      if (type === 'Suspension') {
        const towerGeo = new THREE.BoxGeometry(2.5, 34, 2.5);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.8 });
        const t1 = new THREE.Mesh(towerGeo, towerMat);
        t1.position.set(-length / 2 + 5, 14, 0);
        bGroup.add(t1);

        const t2 = new THREE.Mesh(towerGeo, towerMat);
        t2.position.set(length / 2 - 5, 14, 0);
        bGroup.add(t2);

        // Catenary Cables
        const cableGeo = new THREE.CylinderGeometry(0.35, 0.35, length - 10, 8);
        cableGeo.rotateZ(Math.PI / 2);
        const cableMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9 });
        const c1 = new THREE.Mesh(cableGeo, cableMat);
        c1.position.set(0, 16, width / 2 - 0.5);
        bGroup.add(c1);

        const c2 = new THREE.Mesh(cableGeo, cableMat);
        c2.position.set(0, 16, -width / 2 + 0.5);
        bGroup.add(c2);
      } else {
        // Truss Guardrails
        const railGeo = new THREE.BoxGeometry(length, 2.5, 0.4);
        const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 });
        const r1 = new THREE.Mesh(railGeo, railMat);
        r1.position.set(0, 2.4, width / 2 - 0.2);
        bGroup.add(r1);

        const r2 = new THREE.Mesh(railGeo, railMat);
        r2.position.set(0, 2.4, -width / 2 + 0.2);
        bGroup.add(r2);
      }

      bGroup.userData = {
        name,
        type: `Critical River Crossing (${type} Bridge)`,
        elevation: 360 + elevation * 10,
        chainageKm: Math.abs(Math.round(((zPos + 180) / 400) * 30)),
        clearanceM: elevation - 18,
        status: 'OPERATIONAL (OPEN)',
      };

      infraGroup.add(bGroup);
      clickables.push(bGroup);
      return bGroup;
    };

    // 1. Zero Bridge (Bhagirathi Tailrace, 2 km)
    const zeroBridge = buildBridge({
      name: 'Zero Bridge (Bhagirathi Tailrace)',
      zPos: -120,
      width: 7.5,
      length: 44,
      elevation: 24,
      type: 'Truss',
    });

    // 2. Koteshwar Dam Bridge (8 km)
    const koteshwarBridge = buildBridge({
      name: 'Koteshwar Dam Crossing Bridge',
      zPos: -20,
      width: 8.5,
      length: 52,
      elevation: 21,
      type: 'Arch',
    });

    // 3. Maletha Suspension Bridge (14 km)
    const malethaBridge = buildBridge({
      name: 'Maletha Suspension Bridge',
      zPos: 110,
      width: 8.0,
      length: 58,
      elevation: 17,
      type: 'Suspension',
    });

    // THDC Hydroelectric Powerhouse Complex at Dam Toe
    const powerhouse = new THREE.Group();
    powerhouse.position.set(38, 22, -145);

    const phBodyGeo = new THREE.BoxGeometry(42, 22, 26);
    const phBodyMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    const phBody = new THREE.Mesh(phBodyGeo, phBodyMat);
    phBody.castShadow = true;
    powerhouse.add(phBody);

    // Blue Industrial Turbine Hall Roof
    const phRoofGeo = new THREE.BoxGeometry(44, 3, 28);
    const phRoofMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });
    const phRoof = new THREE.Mesh(phRoofGeo, phRoofMat);
    phRoof.position.y = 12.5;
    powerhouse.add(phRoof);

    // 4 High-Pressure Penstocks running from Dam Crest
    for (let p = 0; p < 4; p++) {
      const penGeo = new THREE.CylinderGeometry(2.2, 2.2, 42, 12);
      penGeo.rotateX(Math.PI / 4);
      const penMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 });
      const pen = new THREE.Mesh(penGeo, penMat);
      pen.position.set(-15 + p * 10, 16, -18);
      powerhouse.add(pen);
    }

    // High Voltage Transformer Yard & Pylon Towers
    for (let t = 0; t < 2; t++) {
      const pylonGeo = new THREE.BoxGeometry(2, 32, 2);
      const pylonMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(-14 + t * 28, 22, 22);
      powerhouse.add(pylon);
    }

    powerhouse.userData = {
      name: 'THDC Hydroelectric Powerhouse (1,000 MW)',
      type: 'Critical Energy Generation Facility',
      elevation: 640.0,
      turbines: '4 x 250 MW Francis Turbines',
      status: 'ONLINE (FULL GENERATION)',
    };
    infraGroup.add(powerhouse);
    clickables.push(powerhouse);

    scene.add(infraGroup);

    // ==========================================
    // 12. 3D SETTLEMENTS & BUILDINGS ARCHITECTURE
    // ==========================================
    const buildingsGroup = new THREE.Group();

    // Helper: Create a single 3D building with roof & windows
    const createBuilding = ({ x, y, z, w = 6, h = 8, d = 6, roofType = 'pitched', wallColor = 0xd4d4d8, roofColor = 0xb91c1c, name = 'Building' }) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(x, y + h / 2, z);

      // Building Body
      const bodyGeo = new THREE.BoxGeometry(w, h, d);
      const bodyMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      body.receiveShadow = true;
      bGroup.add(body);

      // Roof Structure
      if (roofType === 'pitched') {
        const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, h * 0.45, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.5 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = h / 2 + (h * 0.45) / 2;
        bGroup.add(roof);
      } else {
        // Flat terrace with water tank
        const tankGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.8, 12);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.set(0, h / 2 + 1, 0);
        bGroup.add(tank);
      }

      bGroup.userData = {
        name,
        type: 'Residential / Civic Building',
        elevation: 360 + y * 10,
        baseY: y,
        isSubmerged: false,
      };

      buildingsGroup.add(bGroup);
      clickables.push(bGroup);
      return bGroup;
    };

    // Cluster 1: Tehri Dam Operations Township (Near Left Abutment, Elev 845m)
    for (let i = 0; i < 7; i++) {
      createBuilding({
        x: 42 + (i % 3) * 12,
        y: 65 + Math.floor(i / 3) * 6,
        z: -195 - Math.floor(i / 3) * 14,
        w: 9,
        h: 9 + (i % 2) * 4,
        d: 9,
        roofType: i === 0 ? 'flat' : 'pitched',
        wallColor: 0xe2e8f0,
        roofColor: 0x1d4ed8,
        name: i === 0 ? 'Tehri Dam Control Center & Telecom' : `THDC Operations Barrack ${i + 1}`,
      });
    }

    // Cluster 2: Koti Colony (Reservoir Hillside, Elev 860m)
    for (let i = 0; i < 10; i++) {
      createBuilding({
        x: -52 - (i % 4) * 9,
        y: 68 + Math.floor(i / 4) * 5,
        z: -260 - Math.floor(i / 4) * 12,
        w: 6.5,
        h: 6.5,
        d: 6.5,
        roofType: 'pitched',
        wallColor: 0xfef08a,
        roofColor: 0xb91c1c,
        name: `Koti Colony Residence #${101 + i}`,
      });
    }

    // Cluster 3: Chham Village (Valley Floor Terrace, Elev 580m - HIGH RISK)
    for (let i = 0; i < 12; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const bY = 20 + row * 4.5; // Lower houses near river elevation 20m
      createBuilding({
        x: 28 + col * 8,
        y: bY,
        z: -80 + row * 8,
        w: 6,
        h: 5.5,
        d: 6,
        roofType: i === 0 ? 'pitched' : (i % 2 === 0 ? 'pitched' : 'flat'),
        wallColor: 0xfde047,
        roofColor: i === 0 ? 0xd97706 : 0x0284c7, // Orange temple roof
        name: i === 0 ? 'Chham Village Mandir (Temple)' : `Chham Village House #${i + 1}`,
      });
    }

    // Cluster 4: Maletha Riverside Township (Elev 460m)
    for (let i = 0; i < 14; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const bY = 16 + row * 4;
      createBuilding({
        x: 36 + col * 9,
        y: bY,
        z: 95 + row * 11,
        w: 7.5,
        h: 7 + (i === 1 ? 5 : 0),
        d: 7.5,
        roofType: i === 1 ? 'flat' : 'pitched',
        wallColor: i === 1 ? 0xf8fafc : 0xf1f5f9,
        roofColor: 0xdc2626,
        name: i === 1 ? 'Maletha Community Primary Health Clinic' : `Maletha Riverside Sector #${i + 1}`,
      });
    }

    scene.add(buildingsGroup);
    interactiveObjectsRef.current = clickables;

    // 13. Interactive Raycaster for Hover & Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (e) => {
      // Orbit drag handling
      if (isDraggingRef.current) {
        const dx = e.clientX - prevMouseRef.current.x;
        const dy = e.clientY - prevMouseRef.current.y;
        prevMouseRef.current = { x: e.clientX, y: e.clientY };

        sphericalRef.current.theta -= dx * 0.005;
        sphericalRef.current.phi = Math.max(0.12, Math.min(Math.PI / 2.1, sphericalRef.current.phi - dy * 0.005));
        updateCameraPosition();
        return;
      }

      // Raycast hover test
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);

      if (intersects.length > 0) {
        let rootObj = intersects[0].object;
        while (rootObj.parent && !rootObj.userData?.name) {
          rootObj = rootObj.parent;
        }
        if (rootObj.userData?.name) {
          setHoveredFeature(rootObj.userData);
          container.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredFeature(null);
      container.style.cursor = 'grab';
    };

    const handleClick = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);

      if (intersects.length > 0) {
        let rootObj = intersects[0].object;
        while (rootObj.parent && !rootObj.userData?.name) {
          rootObj = rootObj.parent;
        }
        if (rootObj.userData?.name) {
          setSelectedFeature(rootObj.userData);
        }
      }
    };

    const handleMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      sphericalRef.current.radius = Math.max(80, Math.min(850, sphericalRef.current.radius + e.deltaY * 0.35));
      updateCameraPosition();
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('click', handleClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // 14. Main Animation & Wave Dynamics Loop
    let clock = new THREE.Clock();

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Dynamic Hydrodynamic Water Surface Propagation from Dam Toe downstream
      if (waterMeshRef.current) {
        const geom = waterMeshRef.current.geometry;
        const wPos = geom.attributes.position;
        const simSec = currentSecRef.current;
        const reachFraction = Math.max(0.04, Math.min(1.0, 0.04 + (simSec / durationSec) * 0.96));
        const activeLength = 480 * reachFraction;
        const frontZ = -180 + activeLength;

        const waveSpeed = isBreached ? 4.5 : 2.0;
        const waveHeight = isBreached ? 3.0 : 1.4;

        let vIdx = 0;
        for (let seg = 0; seg <= 160; seg++) {
          const segFrac = seg / 160;
          const worldZ = -180 + segFrac * activeLength;
          const cX = canyonCurve(worldZ);
          const riverBedY = 16 - (worldZ + 180) * 0.045;

          let surgeTaper = 1.0;
          const distToFront = frontZ - worldZ;
          if (distToFront < 24) {
            surgeTaper = Math.sin(Math.max(0, distToFront / 24) * (Math.PI / 2));
          }
          const waterDepth = (isBreached ? 6.5 : 3.5) * surgeTaper;
          const waveOffset = Math.sin(worldZ * 0.08 - elapsedTime * waveSpeed) * waveHeight * surgeTaper;

          for (let col = 0; col <= 16; col++) {
            const colFrac = col / 16 - 0.5;
            const widthAtZ = 28 + segFrac * 16;
            const worldX = cX + colFrac * widthAtZ;
            const worldY = riverBedY + waterDepth + waveOffset;

            wPos.setXYZ(vIdx, worldX, worldY, worldZ);
            vIdx++;
          }
        }
        wPos.needsUpdate = true;
        geom.computeVertexNormals();
      }

      // Foam particles splashing at the surging wave front and dam toe
      if (foamParticlesRef.current) {
        const { mesh, velocities } = foamParticlesRef.current;
        const pPos = mesh.geometry.attributes.position;
        const simSec = currentSecRef.current;
        const reachFraction = Math.max(0.04, Math.min(1.0, 0.04 + (simSec / durationSec) * 0.96));
        const frontZ = -180 + 480 * reachFraction;

        for (let i = 0; i < pCount; i++) {
          pPos.setZ(i, pPos.getZ(i) + velocities[i * 3 + 2]);
          pPos.setX(i, pPos.getX(i) + velocities[i * 3 + 0]);

          if (pPos.getZ(i) > frontZ || pPos.getZ(i) < -180) {
            const spawnAtFront = Math.random() > 0.35;
            const spawnZ = spawnAtFront ? frontZ - Math.random() * 22 : -170 + Math.random() * 20;
            const spawnX = canyonCurve(spawnZ) + (Math.random() - 0.5) * 18;
            pPos.setZ(i, spawnZ);
            pPos.setX(i, spawnX);
            pPos.setY(i, 16 - (spawnZ + 180) * 0.045 + 4.0);
          }
        }
        pPos.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

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
      container.removeEventListener('click', handleClick);
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

  // Update Camera Position from Spherical Coordinates
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
      sphericalRef.current = {
        radius: 170,
        theta: Math.PI / 3.5,
        phi: Math.PI / 4,
        target: new THREE.Vector3(0, 45, -170),
      };
    } else if (preset === 'zeroBridge') {
      sphericalRef.current = {
        radius: 130,
        theta: Math.PI / 2.8,
        phi: Math.PI / 3.6,
        target: new THREE.Vector3(0, 22, -120),
      };
    } else if (preset === 'chham') {
      sphericalRef.current = {
        radius: 140,
        theta: Math.PI / 2.4,
        phi: Math.PI / 3.5,
        target: new THREE.Vector3(32, 24, -80),
      };
    } else if (preset === 'maletha') {
      sphericalRef.current = {
        radius: 160,
        theta: Math.PI / 2.2,
        phi: Math.PI / 3.4,
        target: new THREE.Vector3(42, 20, 110),
      };
    } else if (preset === 'wave') {
      const waveZ = -160 + (currentSec / 3600) * 380;
      sphericalRef.current = {
        radius: 200,
        theta: Math.PI / 2.2,
        phi: Math.PI / 3.8,
        target: new THREE.Vector3(0, 20, waveZ),
      };
    } else if (preset === 'top') {
      sphericalRef.current = {
        radius: 540,
        theta: 0,
        phi: 0.1,
        target: new THREE.Vector3(0, 10, 0),
      };
    } else {
      // Canyon Overview
      sphericalRef.current = {
        radius: 440,
        theta: Math.PI / 4,
        phi: Math.PI / 3.2,
        target: new THREE.Vector3(0, 15, 40),
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
        const scale = isBreached ? 2.4 : 1.0;
        jetMeshRef.current.scale.set(scale, scale, scale);
      }
    }

    // Dynamic wave reach expansion as time progresses
    if (waterMeshRef.current) {
      const mat = waterMeshRef.current.material;
      if (isBreached) {
        mat.color.setHex(0x1d4ed8);
        mat.opacity = 0.92;
      } else {
        mat.color.setHex(0x0ea5e9);
        mat.opacity = 0.85;
      }
    }

    // Dynamic Structure Submersion Logic
    const reachFraction = Math.max(0.04, Math.min(1.0, 0.04 + (currentSec / durationSec) * 0.96));
    const waveFrontZ = -180 + 480 * reachFraction;
    interactiveObjectsRef.current.forEach((obj) => {
      const z = obj.position.z;
      const y = obj.userData?.baseY ?? obj.position.y;
      if (z <= waveFrontZ && y <= 24 && currentSec > 100) {
        obj.userData.status = 'CRITICAL: INUNDATED';
      } else if (obj.userData.status?.includes('INUNDATED')) {
        obj.userData.status = 'SAFE / RESTORED';
      }
    });
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
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Tactical 3D HUD Header */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2 pointer-events-auto bg-[#0F172A]/90 border border-slate-700/80 px-3 py-1.5 rounded backdrop-blur-md shadow-xl">
          <Waves className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            3D HIMALAYAN DIGITAL TWIN · MAPS & INFRA
          </span>
          <span className="text-[10px] text-slate-400">|</span>
          <span className="text-[10px] text-sky-300 font-bold">
            TEHRI CANYON CORRIDOR (30 km)
          </span>
        </div>

        {/* Header Actions & Breach Status Pill */}
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
          <div className="text-[9px] text-slate-400 uppercase font-bold px-1.5 py-0.5">3D SECTOR CAMERAS</div>
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
            📷 Tehri Dam Crest
          </button>
          <button
            onClick={() => applyCameraPreset('zeroBridge')}
            className={`px-2 py-1 rounded text-[10px] font-bold text-left transition ${
              cameraPreset === 'zeroBridge' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🌉 Zero Bridge (2 km)
          </button>
          <button
            onClick={() => applyCameraPreset('chham')}
            className={`px-2 py-1 rounded text-[10px] font-bold text-left transition ${
              cameraPreset === 'chham' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🏘️ Chham Village (3.5 km)
          </button>
          <button
            onClick={() => applyCameraPreset('maletha')}
            className={`px-2 py-1 rounded text-[10px] font-bold text-left transition ${
              cameraPreset === 'maletha' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🌉 Maletha Suspension (14 km)
          </button>
          <button
            onClick={() => applyCameraPreset('wave')}
            className={`px-2 py-1 rounded text-[10px] font-bold text-left transition ${
              cameraPreset === 'wave' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🌊 Follow Wave Head
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
          💡 Click any building or bridge to inspect
        </div>
      </div>

      {/* Floating Tactical 3D Minimap HUD (Top-Right) */}
      <div className="absolute top-14 right-4 bg-[#0F172A]/90 border border-slate-800 rounded p-2.5 backdrop-blur-md shadow-xl z-20 pointer-events-auto w-52 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 border-b border-slate-800 pb-1">
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            GIS SATELLITE RADAR
          </span>
          <span className="text-[9px] text-emerald-400">30 km DOMAIN</span>
        </div>

        {/* 2D Schematic Canyon Reach Radar */}
        <div className="h-28 w-full bg-[#070B14] rounded border border-slate-800 relative overflow-hidden flex flex-col justify-between p-1.5 text-[8px]">
          {/* Valley River Corridor representation */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
            <path
              d="M 50,5 Q 60,25 45,45 T 55,75 T 48,95"
              fill="none"
              stroke="#0284C7"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Surge Wave progress line */}
            <path
              d="M 50,5 Q 60,25 45,45 T 55,75 T 48,95"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="7"
              strokeDasharray={`${(currentSec / durationSec) * 90}, 200`}
              strokeLinecap="round"
            />
          </svg>

          {/* Radar Sector Buttons */}
          <div
            onClick={() => applyCameraPreset('dam')}
            className="cursor-pointer z-10 flex items-center justify-between text-slate-300 hover:text-white"
          >
            <span>0km: Tehri Dam</span>
            <span className="text-amber-400 font-bold">839m</span>
          </div>
          <div
            onClick={() => applyCameraPreset('zeroBridge')}
            className="cursor-pointer z-10 flex items-center justify-between text-slate-300 hover:text-white"
          >
            <span>2km: Zero Bridge</span>
            <span className={currentSec > 150 ? 'text-red-400 font-bold' : 'text-slate-400'}>
              {currentSec > 150 ? 'FLOODED' : 'OPEN'}
            </span>
          </div>
          <div
            onClick={() => applyCameraPreset('chham')}
            className="cursor-pointer z-10 flex items-center justify-between text-slate-300 hover:text-white"
          >
            <span>3.5km: Chham Village</span>
            <span className={currentSec > 600 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
              {currentSec > 600 ? '⚠️ SEVERED' : 'SAFE'}
            </span>
          </div>
          <div
            onClick={() => applyCameraPreset('maletha')}
            className="cursor-pointer z-10 flex items-center justify-between text-slate-300 hover:text-white"
          >
            <span>14km: Maletha Bridge</span>
            <span className="text-slate-400 font-bold">460m</span>
          </div>
        </div>

        {/* GPS Coordinates readout */}
        <div className="text-[8px] text-slate-400 font-mono">
          <div>LAT: 30°22'41"N · LON: 78°28'50"E</div>
          <div>DATUM: WGS84 / UTM 44N</div>
        </div>
      </div>

      {/* Selected 3D Feature Dossier Card (Pop-up upon clicking buildings / bridges) */}
      {selectedFeature && (
        <div className="absolute top-14 left-44 bg-[#0F172A]/95 border border-sky-500/60 rounded p-3 backdrop-blur-md shadow-2xl z-30 pointer-events-auto min-w-[260px] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-bold text-white uppercase">{selectedFeature.name}</span>
            </div>
            <button
              onClick={() => setSelectedFeature(null)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Asset Type:</span>
              <span className="text-slate-200 font-bold">{selectedFeature.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Elevation (MSL):</span>
              <span className="text-sky-300 font-bold">{selectedFeature.elevation} m</span>
            </div>
            {selectedFeature.chainageKm !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-400">Downstream Chainage:</span>
                <span className="text-white font-bold">{selectedFeature.chainageKm} km</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Current Status:</span>
              <span
                className={`font-bold ${
                  selectedFeature.status?.includes('INUNDATED') || selectedFeature.status?.includes('SEVERED')
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}
              >
                {selectedFeature.status || 'SAFE / PASSABLE'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip in 3D View */}
      {hoveredFeature && !selectedFeature && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/85 border border-slate-700 px-3 py-1 rounded text-[10px] text-white z-20 pointer-events-none backdrop-blur-sm flex items-center gap-2">
          <MapPin className="w-3 h-3 text-sky-400" />
          <span>{hoveredFeature.name}</span>
          <span className="text-slate-400">|</span>
          <span className="text-sky-300">Click to inspect</span>
        </div>
      )}

      {/* Floating 3D Telemetry Stats Overlay */}
      <div className="absolute bottom-20 left-4 bg-[#0F172A]/90 border border-slate-800 rounded p-3 backdrop-blur-md shadow-xl flex flex-col gap-2 z-20 pointer-events-auto min-w-[220px]">
        <div className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800 pb-1 flex justify-between">
          <span>FLUID & INFRA TELEMETRY</span>
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
            <div className="text-[8px] text-slate-500 uppercase">INFRASTRUCTURE STATUS</div>
            <div className="text-xs font-bold text-emerald-400">
              {currentSec > 150 ? 'WARNING: 3 BRIDGES AT RISK' : 'NORMAL'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Timeline Playback Controls Bar */}
      <div className="absolute bottom-3 left-4 right-4 bg-[#0F172A]/95 border border-slate-700/80 px-4 py-2.5 rounded backdrop-blur-md shadow-2xl flex items-center justify-between gap-4 z-20 pointer-events-auto">
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
