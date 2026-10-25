import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * High-performance 3D Tactical Rerouting Canvas using Three.js.
 * Renders the Himalayan canyon terrain, dynamic floodwater level,
 * 3D multi-modal evacuation trajectories, and tactical rescue beacons.
 */
export default function HADR3DRouteCanvas({
  selectedSettlement,
  activeMode, // 'ROAD', 'FALLBACK_GROUND', 'AIR_EVAC', 'REJECTED'
  simTimeSec = 900,
  cameraPreset = 'tactical', // 'tactical', 'chokepoint', 'ridge', 'topdown'
  onSelectChokepoint,
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameRef = useRef(null);

  // Dynamic 3D object references
  const waterMeshRef = useRef(null);
  const roadTubeRef = useRef(null);
  const rejectedTubeRef = useRef(null);
  const airTubeRef = useRef(null);
  const markersGroupRef = useRef(null);
  const particleGroupRef = useRef(null);

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 360, theta: Math.PI / 4, phi: Math.PI / 3.2 });
  const targetLookAtRef = useRef(new THREE.Vector3(0, 20, 0));

  // 1. Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070B14');
    scene.fog = new THREE.FogExp2('#070B14', 0.0016);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    cameraRef.current = camera;
    updateCameraPosition();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Ambient & Directional Tactical Lighting
    const ambientLight = new THREE.AmbientLight('#2a374a', 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#e0f2fe', 2.8);
    sunLight.position.set(200, 450, 150);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.2);
    rimLight.position.set(-250, 200, -200);
    scene.add(rimLight);

    // ─── Procedural Himalayan Canyon Terrain Mesh ────────────────────────
    const terrainSize = 650;
    const terrainSegments = 140;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colors = [];
    const colorRock = new THREE.Color('#1E293B');
    const colorSlope = new THREE.Color('#2C3E2D');
    const colorRidge = new THREE.Color('#475569');
    const colorRiverbed = new THREE.Color('#334155');

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      // Canyon corridor meandering curve: x_canyon = 65 * sin(z * 0.012)
      const canyonCenterX = 65 * Math.sin(z * 0.012);
      const distFromCanyon = Math.abs(x - canyonCenterX);

      // Deep V-shaped gorge floor elevation
      const gorgeDepth = Math.max(0, 1 - Math.min(1, distFromCanyon / 110));
      const valleyFloorY = 12 + Math.cos(z * 0.008) * 6;

      // Ridge heights rising up to 120m
      const mountainNoise =
        Math.sin(x * 0.02) * Math.cos(z * 0.02) * 22 +
        Math.sin(x * 0.05 + 1.2) * Math.cos(z * 0.05) * 12 +
        Math.sin(x * 0.1) * 4;

      const ridgeWall = Math.pow(Math.min(1, distFromCanyon / 180), 1.8) * 115;
      const y = Math.max(valleyFloorY, ridgeWall + mountainNoise);
      posAttr.setY(i, y);

      // Vertex color gradient based on altitude and canyon proximity
      if (y < 24) {
        colors.push(colorRiverbed.r, colorRiverbed.g, colorRiverbed.b);
      } else if (y < 55) {
        colors.push(colorSlope.r, colorSlope.g, colorSlope.b);
      } else if (y < 85) {
        colors.push(colorRock.r, colorRock.g, colorRock.b);
      } else {
        colors.push(colorRidge.r, colorRidge.g, colorRidge.b);
      }
    }
    terrainGeo.computeVertexNormals();
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.12,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // ─── Tactical Grid Overlay across Terrain ────────────────────────────
    const gridHelper = new THREE.GridHelper(terrainSize, 40, '#0284c7', '#1e293b');
    gridHelper.position.y = 12.5;
    gridHelper.material.opacity = 0.22;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // ─── Dynamic 3D Flood Wave Surface ───────────────────────────────────
    const waterGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 60, 60);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      transparent: true,
      opacity: 0.72,
      roughness: 0.1,
      metalness: 0.65,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 15; // default base water level
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // Groups for markers and particles
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    const particleGroup = new THREE.Group();
    scene.add(particleGroup);
    particleGroupRef.current = particleGroup;

    // ─── Render Loop ─────────────────────────────────────────────────────
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle wave pulsation
      if (waterMeshRef.current) {
        waterMeshRef.current.position.y += Math.sin(elapsedTime * 2.5) * 0.04;
      }

      // Animate tactical particle pulse along route
      if (particleGroupRef.current && particleGroupRef.current.children.length > 0) {
        particleGroupRef.current.children.forEach((p, idx) => {
          p.position.y += Math.sin(elapsedTime * 4 + idx) * 0.08;
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // ─── Resize Handler ──────────────────────────────────────────────────
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      waterGeo.dispose();
      waterMat.dispose();
    };
  }, []);

  // Helper to calculate camera from spherical coords
  function updateCameraPosition() {
    if (!cameraRef.current) return;
    const s = sphericalRef.current;
    const x = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
    const y = s.radius * Math.cos(s.phi);
    const z = s.radius * Math.sin(s.phi) * Math.cos(s.theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(targetLookAtRef.current);
  }

  // 2. Mouse Drag & Zoom Controls
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    const s = sphericalRef.current;
    s.theta -= dx * 0.007;
    s.phi = Math.max(0.18, Math.min(Math.PI / 2.05, s.phi - dy * 0.007));
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const s = sphericalRef.current;
    s.radius = Math.max(90, Math.min(650, s.radius + e.deltaY * 0.45));
    updateCameraPosition();
  };

  // 3. Camera Presets Handler
  useEffect(() => {
    if (!cameraRef.current) return;
    const s = sphericalRef.current;
    if (cameraPreset === 'tactical') {
      s.radius = 350;
      s.theta = Math.PI / 4.2;
      s.phi = Math.PI / 3.3;
      targetLookAtRef.current.set(0, 25, 0);
    } else if (cameraPreset === 'chokepoint') {
      s.radius = 160;
      s.theta = Math.PI / 2.8;
      s.phi = Math.PI / 4.5;
      targetLookAtRef.current.set(30, 24, 40);
    } else if (cameraPreset === 'ridge') {
      s.radius = 210;
      s.theta = Math.PI / 5.5;
      s.phi = Math.PI / 3.8;
      targetLookAtRef.current.set(-50, 65, -30);
    } else if (cameraPreset === 'topdown') {
      s.radius = 420;
      s.theta = 0.01;
      s.phi = 0.15;
      targetLookAtRef.current.set(0, 15, 0);
    }
    updateCameraPosition();
  }, [cameraPreset]);

  // 4. Update Dynamic Flood Wave Level with SimTimeSec
  useEffect(() => {
    if (!waterMeshRef.current) return;
    // Base riverbed is at y=14. Flood wave stage rises dynamically to +42m
    const progress = Math.min(1.0, simTimeSec / 2400);
    const waveStage = simTimeSec <= 120 ? 0 : Math.sin(progress * Math.PI * 0.5) * 26.5;
    waterMeshRef.current.position.y = 14 + waveStage;
  }, [simTimeSec]);

  // 5. Render 3D Multi-Modal Routes & Tactical Markers
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean previous tubes and markers
    if (roadTubeRef.current) scene.remove(roadTubeRef.current);
    if (rejectedTubeRef.current) scene.remove(rejectedTubeRef.current);
    if (airTubeRef.current) scene.remove(airTubeRef.current);
    if (markersGroupRef.current) {
      while (markersGroupRef.current.children.length > 0) {
        markersGroupRef.current.remove(markersGroupRef.current.children[0]);
      }
    }
    if (particleGroupRef.current) {
      while (particleGroupRef.current.children.length > 0) {
        particleGroupRef.current.remove(particleGroupRef.current.children[0]);
      }
    }

    if (!selectedSettlement) return;

    // ─── 3D ROUTE A: Recommended High-Ridge Bypass (Emerald Green) ────────
    const roadPoints = [
      new THREE.Vector3(-140, 72, 110), // Chamba NDRF Tactical Base (Ridge 1,450m MSL)
      new THREE.Vector3(-95, 78, 80),
      new THREE.Vector3(-65, 82, 40),
      new THREE.Vector3(-45, 85, -10),
      new THREE.Vector3(-25, 76, -55),
      new THREE.Vector3(10, 68, -100),
      new THREE.Vector3(45, 62, -145), // Assembly area safe ridge
    ];
    const roadCurve = new THREE.CatmullRomCurve3(roadPoints);
    const roadGeo = new THREE.TubeGeometry(roadCurve, 64, 2.2, 8, false);
    const roadMat = new THREE.MeshStandardMaterial({
      color: activeMode === 'ROAD' ? '#10B981' : '#059669',
      emissive: '#047857',
      emissiveIntensity: activeMode === 'ROAD' ? 0.7 : 0.25,
      roughness: 0.3,
      metalness: 0.8,
    });
    const roadTube = new THREE.Mesh(roadGeo, roadMat);
    scene.add(roadTube);
    roadTubeRef.current = roadTube;

    // ─── 3D ROUTE B: Rejected Low Valley Road (Crimson Red with Submerged Chokepoint)
    const rejectedPoints = [
      new THREE.Vector3(-140, 72, 110),
      new THREE.Vector3(-85, 45, 95),
      new THREE.Vector3(-30, 22, 75),
      new THREE.Vector3(25, 17, 45), // CHOKEPOINT: Submerged at T+6 min
      new THREE.Vector3(55, 16, -10),
      new THREE.Vector3(50, 18, -75),
      new THREE.Vector3(45, 30, -145),
    ];
    const rejectedCurve = new THREE.CatmullRomCurve3(rejectedPoints);
    const rejectedGeo = new THREE.TubeGeometry(rejectedCurve, 64, 1.8, 8, false);
    const rejectedMat = new THREE.MeshStandardMaterial({
      color: '#EF4444',
      emissive: '#B91C1C',
      emissiveIntensity: activeMode === 'REJECTED' ? 0.8 : 0.35,
      roughness: 0.4,
      metalness: 0.5,
    });
    const rejectedTube = new THREE.Mesh(rejectedGeo, rejectedMat);
    scene.add(rejectedTube);
    rejectedTubeRef.current = rejectedTube;

    // ─── 3D ROUTE C: Helicopter Aerial Extraction Arc (Neon Purple) ───────
    const airPoints = [
      new THREE.Vector3(-140, 75, 110), // Base Helipad
      new THREE.Vector3(-50, 165, -15), // Apex flight corridor (Elev 1,800m MSL)
      new THREE.Vector3(45, 65, -145), // Target Village Upper Terrace LZ
    ];
    const airCurve = new THREE.QuadraticBezierCurve3(airPoints[0], airPoints[1], airPoints[2]);
    const airCurvePoints = airCurve.getPoints(50);
    const airGeo = new THREE.BufferGeometry().setFromPoints(airCurvePoints);
    const airMat = new THREE.LineDashedMaterial({
      color: '#C084FC',
      dashSize: 6,
      gapSize: 3,
      linewidth: 3,
    });
    const airLine = new THREE.Line(airGeo, airMat);
    airLine.computeLineDistances();
    scene.add(airLine);
    airTubeRef.current = airLine;

    // ─── 3D TACTICAL BEACONS ─────────────────────────────────────────────
    const markers = markersGroupRef.current;

    // 1. Mission Origin Beacon (Chamba Base)
    const originPin = createTacticalPin('#0284C7', 'BASE', new THREE.Vector3(-140, 75, 110));
    markers.add(originPin);

    // 2. Target Settlement Beacon
    const destPin = createTacticalPin('#F59E0B', selectedSettlement.settlementName || 'TARGET', new THREE.Vector3(45, 65, -145));
    markers.add(destPin);

    // 3. Submerged Canyon Chokepoint (Flashing Hazard Sphere)
    const chokepointPos = new THREE.Vector3(25, 19, 45);
    const hazardGeo = new THREE.SphereGeometry(4.5, 16, 16);
    const hazardMat = new THREE.MeshStandardMaterial({
      color: '#EF4444',
      emissive: '#EF4444',
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const hazardMesh = new THREE.Mesh(hazardGeo, hazardMat);
    hazardMesh.position.copy(chokepointPos);
    markers.add(hazardMesh);

    // 4. Safe Ridge Shelter Beacon
    const shelterPin = createTacticalPin('#10B981', 'SHELTER', new THREE.Vector3(-25, 78, -55));
    markers.add(shelterPin);

    // Add pulse particles along the active route
    const numParticles = 8;
    const curveForParticles = activeMode === 'ROAD' ? roadCurve : (activeMode === 'REJECTED' ? rejectedCurve : null);
    if (curveForParticles && particleGroupRef.current) {
      for (let i = 0; i < numParticles; i++) {
        const tVal = i / numParticles;
        const pt = curveForParticles.getPoint(tVal);
        const pGeo = new THREE.SphereGeometry(1.4, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({
          color: activeMode === 'ROAD' ? '#34D399' : '#FCA5A5',
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.copy(pt);
        particleGroupRef.current.add(pMesh);
      }
    }
  }, [selectedSettlement, activeMode]);

  // Helper to construct a glowing 3D tactical pin
  function createTacticalPin(colorHex, labelText, position) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.6, 0.6, 18, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: '#64748B', metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 9;
    group.add(pole);

    // Top Glowing Diamond / Head
    const headGeo = new THREE.OctahedronGeometry(3.5, 0);
    const headMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 20;
    group.add(head);

    // Ground Ring
    const ringGeo = new THREE.RingGeometry(2.5, 4.5, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.5;
    group.add(ring);

    return group;
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    />
  );
}
