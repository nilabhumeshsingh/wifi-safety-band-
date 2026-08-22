// =========================================================================
// NIGHTGUARD 3D VECTOR FLOOR PLAN ENGINE (Three.js)
// =========================================================================

// --- 1. ROOM LAYOUT DATASET (Light Blue Theme Aesthetic) ---
const roomsData = [
  // Outer Main Corridors (Building Frame)
  { id: 'corridor-top',    name: 'MAIN CORRIDOR', x: 0,    z: -8.5, w: 32,   d: 2.5, color: 0x1E293B, isCorridor: true },
  { id: 'corridor-left',   name: 'MAIN CORRIDOR', x: -12.5, z: 0,    w: 2.5,  d: 19.5, color: 0x1E293B, isCorridor: true },
  { id: 'corridor-right',  name: 'MAIN CORRIDOR', x: 12.5,  z: 0,    w: 2.5,  d: 19.5, color: 0x1E293B, isCorridor: true },
  { id: 'corridor-bottom', name: 'MAIN CORRIDOR', x: 0,    z: 8.5,  w: 32,   d: 2.5, color: 0x1E293B, isCorridor: true },

  // Central Open Courtyard
  { id: 'courtyard', name: 'CENTRAL OPEN COURTYARD', x: 0, z: 0, w: 22.5, d: 14.5, color: 0xE6F0FF, isCourtyard: true },

  // Top Section
  { id: '401', name: '401\nStairs', x: -20,   z: -12.5, w: 6.5, d: 6.5, color: 0x334155, isUtility: true },
  { id: '402', name: '402',        x: -11,   z: -12.5, w: 8,   d: 4.5, color: 0x0F172A },
  { id: '403', name: '403',        x: 11,    z: -12.5, w: 8,   d: 4.5, color: 0x0F172A },
  { id: '404', name: '404',        x: 19.5,  z: -12.5, w: 6.5, d: 6.5, color: 0x0F172A },

  // West Wing (Left Vertical Column)
  { id: '430', name: '430',            x: -17.5, z: -6.5, w: 6.5, d: 3.2, color: 0x0F172A },
  { id: '429', name: '429',            x: -17.5, z: -3.0, w: 6.5, d: 3.2, color: 0x0F172A },
  { id: '428', name: '428',            x: -17.5, z: 0.5,  w: 6.5, d: 3.2, color: 0x0F172A },
  { id: '427', name: '427',            x: -17.5, z: 4.5,  w: 6.5, d: 4.2, color: 0x0F172A },
  { id: 'gw',  name: 'Girls Washroom', x: -17.5, z: 9.2,  w: 6.5, d: 4.2, color: 0x334155, isUtility: true },

  // East Wing (Right Vertical Column)
  { id: 'faculty-e', name: 'Faculty',     x: 17.5, z: -6.5, w: 6.5, d: 3.2, color: 0x334155, isUtility: true },
  { id: '408',       name: '408',         x: 17.5, z: -3.0, w: 6.5, d: 3.2, color: 0x0F172A },
  { id: '409',       name: '409',         x: 17.5, z: 0.5,  w: 6.5, d: 3.2, color: 0x0F172A },
  { id: '410',       name: '410\nFaculty', x: 17.5, z: 4.5,  w: 6.5, d: 4.2, color: 0x334155, isUtility: true },
  { id: 'mw',        name: "Men's Washroom", x: 24.5, z: 4.5, w: 6.5, d: 4.2, color: 0x334155, isUtility: true },

  // South Row (Above Bottom Corridor, Facing Courtyard)
  { id: '420', name: '420', x: -8.5, z: 4.5, w: 5.2, d: 4.2, color: 0x0F172A },
  { id: '419', name: '419', x: -2.8, z: 4.5, w: 5.2, d: 4.2, color: 0x0F172A },
  { id: '418', name: '418', x: 2.8,  z: 4.5, w: 5.2, d: 4.2, color: 0x0F172A },
  { id: '417', name: '417', x: 8.5,  z: 4.5, w: 5.2, d: 4.2, color: 0x0F172A },

  // Bottom-Left Wing (SW)
  { id: 'st-w', name: 'Stairs', x: -20.5, z: 15, w: 4.5, d: 4.2, color: 0x334155, isUtility: true },
  { id: '423',  name: '423',    x: -15.5, z: 15, w: 4.8, d: 4.2, color: 0x0F172A },
  { id: '422',  name: '422',    x: -10.2, z: 15, w: 4.8, d: 4.2, color: 0x0F172A },
  { id: '421',  name: '421',    x: -5.0,  z: 15, w: 4.8, d: 4.2, color: 0x0F172A },

  // Bottom-Right Wing (SE)
  { id: '416', name: '416', x: 11.5, z: 15.0, w: 6.2, d: 4.2, color: 0x0F172A },
  { id: '415', name: '415', x: 18.2, z: 15.0, w: 6.2, d: 4.2, color: 0x0F172A },
  { id: '414', name: '414', x: 24.9, z: 15.0, w: 6.2, d: 4.2, color: 0x0F172A }
];

// --- 2. GLOBAL STATE ---
let scene, camera, renderer, controls;
let roomMeshes = {};
let roomBeacons = {};
let roomCircles = {};
let roomLabels = [];
let wallHeightScale = 1.0;
let isWireframe = false;

let alerts = [];
let guardsData = [];
let alertSeq = 1;
let currentActiveView = '3d';
let showFullHistory = false;

// 3D Guard markers & connection lines
let guardMarkers3D = {};
let guardConnectionLines = [];

// Sound effect generator for SOS alert
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

// --- 3. THREE.JS INITIALIZATION ---
function init3D() {
  const container = document.getElementById('canvas-container-3d');
  if (!container) return;

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xEBF3FE);
  scene.fog = new THREE.FogExp2(0xEBF3FE, 0.012);

  // Camera setup
  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  camera.position.set(4, 38, 38);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Orbit Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2.1; // Don't flip below floor
  controls.target.set(4, 0, 1);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.85);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.7);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xE0EDFF, 0.3);
  fillLight.position.set(-20, 20, -20);
  scene.add(fillLight);

  // Grid Base Floor (Light Blue Grid)
  const gridHelper = new THREE.GridHelper(80, 40, 0xC2DCFF, 0xD8E8FF);
  gridHelper.position.y = -0.05;
  scene.add(gridHelper);

  const floorGeo = new THREE.PlaneGeometry(90, 70);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xF0F6FF, roughness: 0.9 });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -0.1;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Build Room Meshes
  build3DFloorPlan();

  // Handle Resize
  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  animate();
}

// --- 4. BUILD 3D ROOM MESHES ---
function build3DFloorPlan() {
  const wallHeight = 2.5;

  roomsData.forEach(room => {
    const group = new THREE.Group();
    group.position.set(room.x, 0, room.z);

    // Room Floor Base (Light Blue Floor Base)
    const floorGeo = new THREE.BoxGeometry(room.w - 0.2, 0.1, room.d - 0.2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: room.isCourtyard ? 0xE6F0FF : (room.isUtility ? 0xD8E8FF : 0xE0EDFF),
      roughness: 0.6
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = 0.05;
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // Extruded Walls
    if (!room.isCourtyard) {
      const wallMat = new THREE.MeshStandardMaterial({
        color: room.color,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
        wireframe: isWireframe
      });

      const wallGeo = new THREE.BoxGeometry(room.w, wallHeight, room.d);
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.y = wallHeight / 2;
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      wallMesh.name = 'wallMesh';
      group.add(wallMesh);

      // Top Border Rim
      const edges = new THREE.EdgesGeometry(wallGeo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x0F172A, linewidth: 1.5 });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.position.y = wallHeight / 2;
      wireframe.name = 'wireframe';
      group.add(wireframe);

      // Red Emergency PointLight Beacon (hidden initially)
      const beaconLight = new THREE.PointLight(0xFF3B30, 0, 12);
      beaconLight.position.set(0, wallHeight + 1, 0);
      group.add(beaconLight);
      roomBeacons[room.id] = beaconLight;

      // Circular Radar Glow Disc (Smooth floor circle)
      const radius = Math.min(room.w, room.d) * 0.45;
      const circleGeo = new THREE.CircleGeometry(radius, 32);
      const circleMat = new THREE.MeshBasicMaterial({
        color: 0xFF3B30,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const discMesh = new THREE.Mesh(circleGeo, circleMat);
      discMesh.rotation.x = -Math.PI / 2;
      discMesh.position.y = 0.12;
      group.add(discMesh);

      // Expanding Circular Radar Wave Ring
      const ringGeo = new THREE.RingGeometry(radius * 0.7, radius * 0.95, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xFF3B30,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.14;
      group.add(ringMesh);

      roomCircles[room.id] = { disc: discMesh, ring: ringMesh, baseRadius: radius };

      // Click interaction raycasting data
      wallMesh.userData = { roomId: room.id, name: room.name };
    }

    // Floating 3D Text Label / Canvas Badge
    create3DRoomLabel(room, group);

    scene.add(group);
    roomMeshes[room.id] = group;
  });
}

// --- 5. FLOATING ROOM LABELS ---
function create3DRoomLabel(room, parentGroup) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = room.isCourtyard ? 'rgba(0,0,0,0)' : 'rgba(240, 246, 255, 0.95)';
  if (!room.isCourtyard) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(12, 24, 296, 112, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(194, 220, 255, 0.8)';
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      ctx.fillRect(12, 24, 296, 112);
    }
  }

  ctx.font = '700 48px "SF Pro Display", "Inter", -apple-system, sans-serif';
  ctx.fillStyle = room.isCourtyard ? '#475569' : '#0F172A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(room.id.toUpperCase(), 160, 80);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  
  sprite.scale.set(room.isCourtyard ? 8 : 4, room.isCourtyard ? 4 : 2, 1);
  sprite.position.set(0, room.isCourtyard ? 0.3 : 3.6, 0);
  parentGroup.add(sprite);

  roomLabels.push({ sprite, canvas, texture, ctx, room });
}

// --- 5b. 3D GUARD MARKERS ---
function createGuardMarker3D(guard) {
  const room = roomsData.find(r => r.id === guard.assignedRoom);
  if (!room) return;

  // Create shield-shaped canvas sprite
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Draw shield icon
  const colors = {
    available: { bg: '#34C759', border: '#1F9C46', glow: 'rgba(52, 199, 89, 0.4)' },
    responding: { bg: '#FF9F0A', border: '#CC7F08', glow: 'rgba(255, 159, 10, 0.4)' },
    'off-duty': { bg: '#8E8E93', border: '#636366', glow: 'rgba(142, 142, 147, 0.2)' }
  };

  const c = colors[guard.status] || colors.available;

  // Glow circle
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fillStyle = c.glow;
  ctx.fill();

  // Main circle
  ctx.beginPath();
  ctx.arc(64, 64, 36, 0, Math.PI * 2);
  ctx.fillStyle = c.bg;
  ctx.fill();
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Shield icon (🛡)
  ctx.font = '700 28px "SF Pro Display", "Inter", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🛡', 64, 60);

  // Guard ID label
  ctx.font = '700 18px "SF Pro Display", "Inter", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(guard.id, 64, 90);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);

  sprite.scale.set(3, 3, 1);
  sprite.position.set(room.x, 5.5, room.z);
  sprite.renderOrder = 10;

  scene.add(sprite);
  guardMarkers3D[guard.id] = { sprite, canvas, texture, ctx, guard };
}

function updateGuardMarkers3D() {
  // Remove old markers
  Object.values(guardMarkers3D).forEach(m => {
    scene.remove(m.sprite);
    m.texture.dispose();
    m.sprite.material.dispose();
  });
  guardMarkers3D = {};

  // Create new markers
  guardsData.forEach(g => createGuardMarker3D(g));
}

// --- 5c. GUARD-TO-ALERT CONNECTION LINES ---
function updateConnectionLines() {
  // Remove old lines
  guardConnectionLines.forEach(line => scene.remove(line));
  guardConnectionLines = [];

  // Draw dashed line from nearest guard to each active alert
  alerts.forEach(a => {
    if (a.status !== 'ACTIVE' || !a.nearestGuard) return;

    const alertRoom = roomsData.find(r => r.id === a.roomId);
    const guard = guardsData.find(g => g.id === a.nearestGuard.id);
    if (!alertRoom || !guard) return;

    const guardRoom = roomsData.find(r => r.id === guard.assignedRoom);
    if (!guardRoom) return;

    const points = [
      new THREE.Vector3(guardRoom.x, 4.5, guardRoom.z),
      new THREE.Vector3(alertRoom.x, 4.5, alertRoom.z)
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xFF9F0A,
      dashSize: 1.2,
      gapSize: 0.6,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    scene.add(line);
    guardConnectionLines.push(line);
  });
}

// Helper to resolve room ID variants (e.g. "414b" -> "414") to actual 3D room mesh keys
function resolveRoomMeshKey(roomIdStr) {
  if (!roomIdStr) return null;
  const cleanId = String(roomIdStr).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (roomMeshes[cleanId]) return cleanId;

  // Strip sub-room letter e.g. "414b" -> "414"
  const digitsOnly = cleanId.replace(/[^0-9]/g, '');
  if (digitsOnly && roomMeshes[digitsOnly]) return digitsOnly;

  // Substring / prefix match
  const key = Object.keys(roomMeshes).find(k => cleanId.startsWith(k) || k.startsWith(cleanId));
  return key || null;
}

// --- 6. ANIMATION & RENDER LOOP ---
function animate() {
  requestAnimationFrame(animate);

  controls.update();

  const time = Date.now() * 0.005;

  // Reset all circular discs & rings before calculating active alerts
  Object.values(roomCircles).forEach(c => {
    if (c.disc) c.disc.material.opacity = 0;
    if (c.ring) {
      c.ring.material.opacity = 0;
      c.ring.scale.set(1, 1, 1);
    }
  });

  // Pulsing Circular 3-Color Radar Lights for active scan predictions
  alerts.forEach(a => {
    if (a.status === 'ACTIVE') {
      const preds = a.predictions;
      
      // Tier 1: Most Probable (CIRCULAR RED RADAR 🔴)
      const rawP1 = a.primaryRoomId || (preds && preds.most_probable ? preds.most_probable.room : a.roomId);
      const p1Key = resolveRoomMeshKey(rawP1);
      if (p1Key && roomMeshes[p1Key]) {
        const cData = roomCircles[p1Key];
        const beaconLight = roomBeacons[p1Key];
        const pulse = (Math.sin(time * 5) + 1) / 2;
        const ringProgress = (time * 1.6) % 1.0;
        const ringScale = 1.0 + ringProgress * 1.1;
        const ringFade = Math.max(0, 1.0 - ringProgress);

        if (cData) {
          // Circular Disc Pulsing Glow
          cData.disc.material.color.setHex(0xFF3B30); // RED
          cData.disc.material.opacity = 0.55 + pulse * 0.35;

          // Expanding Circular Radar Wave Ring
          cData.ring.material.color.setHex(0xFF3B30);
          cData.ring.scale.set(ringScale, ringScale, 1);
          cData.ring.material.opacity = ringFade * 0.85;
        }

        if (beaconLight) {
          beaconLight.color.setHex(0xFF3B30);
          beaconLight.intensity = 6 + pulse * 4;
        }
      }

      // Tier 2: Medium Probable (CIRCULAR ORANGE RADAR 🟠)
      if (preds && preds.medium_probable) {
        const p2Key = resolveRoomMeshKey(preds.medium_probable.room);
        if (p2Key && p2Key !== p1Key && roomMeshes[p2Key]) {
          const cData = roomCircles[p2Key];
          const beaconLight = roomBeacons[p2Key];
          const pulse = (Math.sin(time * 3.5 + 1) + 1) / 2;
          const ringProgress = (time * 1.3 + 0.3) % 1.0;
          const ringScale = 1.0 + ringProgress * 1.0;
          const ringFade = Math.max(0, 1.0 - ringProgress);

          if (cData) {
            cData.disc.material.color.setHex(0xFF9F0A); // ORANGE
            cData.disc.material.opacity = 0.45 + pulse * 0.3;

            cData.ring.material.color.setHex(0xFF9F0A);
            cData.ring.scale.set(ringScale, ringScale, 1);
            cData.ring.material.opacity = ringFade * 0.75;
          }

          if (beaconLight) {
            beaconLight.color.setHex(0xFF9F0A);
            beaconLight.intensity = 4 + pulse * 2.5;
          }
        }
      }

      // Tier 3: Less Probable (CIRCULAR YELLOW RADAR 🟡)
      if (preds && preds.less_probable) {
        const p3Key = resolveRoomMeshKey(preds.less_probable.room);
        if (p3Key && p3Key !== p1Key && roomMeshes[p3Key]) {
          const cData = roomCircles[p3Key];
          const beaconLight = roomBeacons[p3Key];
          const pulse = (Math.sin(time * 2.5 + 2) + 1) / 2;
          const ringProgress = (time * 1.0 + 0.6) % 1.0;
          const ringScale = 1.0 + ringProgress * 0.9;
          const ringFade = Math.max(0, 1.0 - ringProgress);

          if (cData) {
            cData.disc.material.color.setHex(0xFFCC00); // YELLOW
            cData.disc.material.opacity = 0.35 + pulse * 0.25;

            cData.ring.material.color.setHex(0xFFCC00);
            cData.ring.scale.set(ringScale, ringScale, 1);
            cData.ring.material.opacity = ringFade * 0.65;
          }

          if (beaconLight) {
            beaconLight.color.setHex(0xFFCC00);
            beaconLight.intensity = 2.5 + pulse * 1.5;
          }
        }
      }
    }
  });

  // Floating animation for guard markers
  Object.values(guardMarkers3D).forEach(m => {
    if (m.guard.status === 'responding') {
      m.sprite.position.y = 5.5 + Math.sin(time * 2) * 0.5;
    }
  });

  renderer.render(scene, camera);
}

function onWindowResize() {
  const container = document.getElementById('canvas-container-3d');
  if (!container || !renderer || !camera) return;

  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// --- 7. 3D CONTROLS & CAMERA HELPERS ---
function reset3DCamera() {
  if (!controls) return;
  controls.target.set(4, 0, 1);
  camera.position.set(4, 38, 38);
}

function toggleWallHeight() {
  wallHeightScale = wallHeightScale === 1.0 ? 0.3 : (wallHeightScale === 0.3 ? 0.0 : 1.0);
  const label = wallHeightScale === 1.0 ? 'Full' : (wallHeightScale === 0.3 ? 'Low' : 'Flat');
  document.getElementById('wall-height-label').textContent = label;

  Object.values(roomMeshes).forEach(group => {
    const wallMesh = group.getObjectByName('wallMesh');
    const wireframe = group.getObjectByName('wireframe');
    if (wallMesh) {
      wallMesh.scale.y = wallHeightScale;
      wallMesh.position.y = (2.5 * wallHeightScale) / 2;
    }
    if (wireframe) {
      wireframe.scale.y = wallHeightScale;
      wireframe.position.y = (2.5 * wallHeightScale) / 2;
    }
  });
}

function toggleWireframe() {
  isWireframe = !isWireframe;
  Object.values(roomMeshes).forEach(group => {
    const wallMesh = group.getObjectByName('wallMesh');
    if (wallMesh) wallMesh.material.wireframe = isWireframe;
  });
}

function focusActiveAlert() {
  const activeAlert = alerts.find(a => a.status === 'ACTIVE');
  if (activeAlert && roomMeshes[activeAlert.roomId]) {
    const targetGroup = roomMeshes[activeAlert.roomId];
    const pos = targetGroup.position;

    // Smoothly focus camera
    controls.target.set(pos.x, 0, pos.z);
    camera.position.set(pos.x, 18, pos.z + 18);
  }
}

// --- 8. DASHBOARD LOGIC (2D / 3D Sync & WebSocket) ---
function switchView(view) {
  currentActiveView = view;
  document.getElementById('tab-3d').classList.toggle('active', view === '3d');
  document.getElementById('tab-2d').classList.toggle('active', view === '2d');

  document.getElementById('view-3d-container').style.display = view === '3d' ? 'block' : 'none';
  document.getElementById('view-2d-container').style.display = view === '2d' ? 'block' : 'none';
  document.getElementById('3d-toolbar').style.display = view === '3d' ? 'flex' : 'none';

  if (view === '3d' && renderer) {
    onWindowResize();
  }
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function simulateSOS() {
  // Pick a random room from dataset
  const targetRoom = roomsData[Math.floor(Math.random() * (roomsData.length - 2))]; // Exclude corridors/courtyard
  
  const payload = {
    student_id: 'STU_' + Math.floor(1000 + Math.random() * 9000),
    student_name: 'Student Emergency',
    room: targetRoom.id
  };

  fetch('/api/sos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {
    // Local fallback if offline
    addLocalAlert({
      id: 'A' + String(alertSeq++).padStart(3, '0'),
      roomId: targetRoom.id,
      roomName: `Room ${targetRoom.id}`,
      studentName: 'Student in Distress',
      nearestGuard: null,
      status: 'ACTIVE',
      createdAt: Date.now()
    });
  });
}

function resolve(alertId) {
  fetch(`/api/alerts/${alertId}/resolve`, { method: 'PATCH' }).catch(() => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'RESOLVED';
      alert.resolvedAt = Date.now();
      renderAll();
    }
  });
}

// Resolve all active alerts (UI + Backend POST call)
async function resolveAllAlerts() {
  try {
    const now = Date.now();
    alerts.forEach(a => {
      a.status = 'RESOLVED';
      if (!a.resolvedAt) a.resolvedAt = now;
    });
    guardsData.forEach(g => {
      if (g.status === 'responding') g.status = 'available';
    });
    renderAll();

    await fetch('/api/alerts/resolve-all', { method: 'POST' });
  } catch (err) {
    console.error('Error resolving all alerts:', err);
  }
}

function toggleGuardStatus(guardId) {
  const guard = guardsData.find(g => g.id === guardId);
  if (!guard) return;

  // Cycle: available -> off-duty -> available
  const newStatus = guard.status === 'available' ? 'off-duty' : 'available';

  fetch(`/api/guards/${guardId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  }).catch(() => {
    // Local fallback
    guard.status = newStatus;
    renderAll();
  });
}

function addLocalAlert(alert) {
  const existing = alerts.find(a => a.id === alert.id);
  if (!existing) {
    alerts.unshift(alert);
    if (alert.status === 'ACTIVE') playAlertSound();
    renderAll();
  }
}

function renderMap3DAnd2D() {
  // Clear 2D highlights and guard badges
  document.querySelectorAll('.room').forEach(el => {
    el.classList.remove('flagged');
    const pulse = el.querySelector('.pulse-dot');
    if (pulse) pulse.remove();
    const gBadge = el.querySelector('.guard-badge-2d');
    if (gBadge) gBadge.remove();
  });

  // Reset 3D Room Colors
  roomsData.forEach(r => {
    if (roomMeshes[r.id]) {
      const wallMesh = roomMeshes[r.id].getObjectByName('wallMesh');
      const beaconLight = roomBeacons[r.id];
      if (wallMesh) {
        wallMesh.material.color.setHex(r.color);
        wallMesh.material.emissive.setHex(0x000000);
        wallMesh.material.opacity = 0.88;
      }
      if (beaconLight) beaconLight.intensity = 0;
    }
  });

  // Apply Active Alerts
  alerts.forEach(a => {
    if (a.status === 'ACTIVE') {
      // 2D Grid Highlight
      const rKey = resolveRoomMeshKey(a.primaryRoomId || (a.predictions && a.predictions.most_probable ? a.predictions.most_probable.room : a.roomId)) || a.roomId;
      const el = document.querySelector(`.room[data-room-id="${rKey}"]`);
      if (el) {
        el.classList.add('flagged');
        if (!el.querySelector('.pulse-dot')) {
          const dot = document.createElement('div');
          dot.className = 'pulse-dot';
          el.appendChild(dot);
        }
      }
    }
  });

  // Add Guard Badges to 2D Grid
  guardsData.forEach(g => {
    const roomEl = document.querySelector(`.room[data-room-id="${g.assignedRoom}"]`);
    if (roomEl && !roomEl.querySelector('.guard-badge-2d')) {
      const badge = document.createElement('div');
      badge.className = `guard-badge-2d ${g.status}`;
      badge.textContent = '🛡';
      badge.title = `${g.name} (${g.status})`;
      roomEl.appendChild(badge);
    }
  });

  // Update 3D guard markers and connection lines
  updateGuardMarkers3D();
  updateConnectionLines();
}

function toggleAlertHistoryMode(showAll) {
  showFullHistory = showAll;
  const recentBtn = document.getElementById('alert-tab-recent');
  const historyBtn = document.getElementById('alert-tab-history');

  if (recentBtn && historyBtn) {
    if (showAll) {
      recentBtn.classList.remove('active');
      historyBtn.classList.add('active');
    } else {
      recentBtn.classList.add('active');
      historyBtn.classList.remove('active');
    }
  }
  renderAlertFeed();
}

function renderAlertFeed() {
  const el = document.getElementById('alert-feed');
  const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;
  document.getElementById('active-count').textContent = `${activeCount} active`;

  const totalEl = document.getElementById('history-total-count');
  if (totalEl) totalEl.textContent = alerts.length;

  if (alerts.length === 0) {
    el.innerHTML = `<div class="empty-state">No active alerts. Click "Simulate SOS" to test.</div>`;
    return;
  }

  // Limit feed to last 5 entries by default unless Full History is enabled
  const displayedAlerts = showFullHistory ? alerts : alerts.slice(0, 5);

  let html = displayedAlerts.map(a => {
    const isResolved = a.status === 'RESOLVED';
    const guardInfo = a.nearestGuard
      ? `<div class="alert-guard-info">
           <span class="guard-icon">🛡</span>
           Nearest: <strong>${a.nearestGuard.name}</strong> — Room ${a.nearestGuard.assignedRoom} — ${a.nearestGuard.distance} units away
         </div>`
      : `<div class="alert-guard-info" style="color: #8E8E93;">
           <span class="guard-icon" style="border-color: #8E8E93; background: #F0F0F4;">—</span>
           No available guards
         </div>`;

    return `
      <div class="alert-row ${isResolved ? 'resolved' : ''}">
        <div class="alert-left">
          <div class="alert-dot"></div>
          <div>
            <div class="alert-room">${a.primaryRoomName || a.roomName || (a.predictions && a.predictions.most_probable ? 'Room ' + a.predictions.most_probable.room : 'Location Resolved')} ${a.confidence ? `<small style="color:var(--blue);">(${a.confidence}% match)</small>` : ''}</div>
            <div class="alert-meta">${a.id} · ${a.studentName || 'Student'} · Reported ${fmtTime(a.createdAt)}${isResolved ? ' · Resolved ' + fmtTime(a.resolvedAt) : ''}</div>
            ${!isResolved ? guardInfo : ''}
          </div>
        </div>
        ${isResolved
          ? `<span class="status-pill resolved">Resolved</span>`
          : `<div style="display:flex; align-items:center; gap:10px;">
               <span class="status-pill active">Active</span>
               <button class="resolve-btn" onclick="resolve('${a.id}')">Resolve</button>
             </div>`
        }
      </div>
    `;
  }).join('');

  // Append "View Full History" button if there are more than 5 items and history is collapsed
  if (!showFullHistory && alerts.length > 5) {
    html += `
      <div style="text-align: center; padding: 12px 0 4px 0;">
        <button class="tool-btn" onclick="toggleAlertHistoryMode(true)" style="background: #F0F6FF; border: 1px solid #C2DCFF; color: #007AFF; font-weight: 500;">
          📜 View All ${alerts.length} Historical Alerts (${alerts.length - 5} hidden)
        </button>
      </div>
    `;
  }

  el.innerHTML = html;
}

function renderGuardsPanel() {
  const el = document.getElementById('guards-panel');
  const summaryEl = document.getElementById('guards-summary');

  const availableCount = guardsData.filter(g => g.status === 'available').length;
  const respondingCount = guardsData.filter(g => g.status === 'responding').length;

  summaryEl.textContent = `${availableCount} available${respondingCount > 0 ? ` · ${respondingCount} responding` : ''}`;

  // Update pill color based on available count
  if (availableCount === 0) {
    summaryEl.style.color = 'var(--red)';
    summaryEl.style.background = 'var(--red-soft)';
    summaryEl.style.borderColor = 'rgba(255, 59, 48, 0.2)';
  } else {
    summaryEl.style.color = 'var(--green)';
    summaryEl.style.background = 'var(--green-soft)';
    summaryEl.style.borderColor = 'rgba(52, 199, 89, 0.2)';
  }

  if (guardsData.length === 0) {
    el.innerHTML = `<div class="empty-state">No guards registered.</div>`;
    return;
  }

  el.innerHTML = `<div class="guards-grid">${guardsData.map(g => {
    const initials = g.name.split(' ').map(w => w[0]).join('');
    const toggleLabel = g.status === 'available' ? 'Set Off-Duty' : (g.status === 'off-duty' ? 'Set Available' : 'Responding...');
    const toggleDisabled = g.status === 'responding' ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';

    return `
      <div class="guard-card">
        <div class="guard-left">
          <div class="guard-avatar ${g.status}">${initials}</div>
          <div>
            <div class="guard-name">${g.name}</div>
            <div class="guard-room">Room ${g.assignedRoom}</div>
          </div>
        </div>
        <div class="guard-right">
          <span class="guard-status-pill ${g.status}">${g.status.replace('-', ' ')}</span>
          <button class="guard-toggle-btn" onclick="toggleGuardStatus('${g.id}')" ${toggleDisabled}>${toggleLabel}</button>
        </div>
      </div>
    `;
  }).join('')}</div>`;
}

function renderAll() {
  renderMap3DAnd2D();
  renderAlertFeed();
  renderGuardsPanel();
}

// Connect to WebSockets for live ESP32 updates
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'INIT') {
      alerts = msg.alerts || [];
      guardsData = msg.guards || [];
      renderAll();
    } else if (msg.type === 'NEW_ALERT' || msg.type === 'PROBABILITY_ALERT_3TIER') {
      addLocalAlert(msg.alert);
      playAlertSound();
    } else if (msg.type === 'ALERT_RESOLVED') {
      const alert = alerts.find(a => a.id === msg.alert.id);
      if (alert) {
        alert.status = 'RESOLVED';
        alert.resolvedAt = msg.alert.resolvedAt;
        renderAll();
      }
    } else if (msg.type === 'ALL_ALERTS_RESOLVED') {
      if (msg.alerts) alerts = msg.alerts;
      else {
        alerts.forEach(a => { a.status = 'RESOLVED'; });
      }
      if (msg.guards) guardsData = msg.guards;
      renderAll();
    } else if (msg.type === 'GUARD_UPDATE') {
      guardsData = msg.guards || [];
      renderAll();
    }
  };
}

// --- INIT APP ---
window.addEventListener('DOMContentLoaded', () => {
  init3D();
  initWebSocket();
  renderAll();
});
