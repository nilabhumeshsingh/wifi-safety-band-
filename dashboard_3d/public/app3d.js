// =========================================================================
// NIGHTGUARD 3D VECTOR FLOOR PLAN ENGINE (Three.js)
// =========================================================================

// --- 1. ROOM LAYOUT DATASET (Exact Match with Floor Plan Blueprint Diagram) ---
const roomsData = [
  // Outer Main Corridors (Building Frame)
  { id: 'corridor-top',    name: 'MAIN CORRIDOR', x: 0,    z: -8.5, w: 32,   d: 2.5, color: 0x222634, isCorridor: true },
  { id: 'corridor-left',   name: 'MAIN CORRIDOR', x: -12.5, z: 0,    w: 2.5,  d: 19.5, color: 0x222634, isCorridor: true },
  { id: 'corridor-right',  name: 'MAIN CORRIDOR', x: 12.5,  z: 0,    w: 2.5,  d: 19.5, color: 0x222634, isCorridor: true },
  { id: 'corridor-bottom', name: 'MAIN CORRIDOR', x: 0,    z: 8.5,  w: 32,   d: 2.5, color: 0x222634, isCorridor: true },

  // Central Open Courtyard
  { id: 'courtyard', name: 'CENTRAL OPEN COURTYARD', x: 0, z: 0, w: 22.5, d: 14.5, color: 0x141722, isCourtyard: true },

  // Top Section
  { id: '401', name: '401\nStairs', x: -20,   z: -12.5, w: 6.5, d: 6.5, color: 0x2C303E, isUtility: true },
  { id: '402', name: '402',        x: -11,   z: -12.5, w: 8,   d: 4.5, color: 0x3A3F53 },
  { id: '403', name: '403',        x: 11,    z: -12.5, w: 8,   d: 4.5, color: 0x3A3F53 },
  { id: '404', name: '404',        x: 19.5,  z: -12.5, w: 6.5, d: 6.5, color: 0x3A3F53 },

  // West Wing (Left Vertical Column)
  { id: '430', name: '430',            x: -17.5, z: -6.5, w: 6.5, d: 3.2, color: 0x3A3F53 },
  { id: '429', name: '429',            x: -17.5, z: -3.0, w: 6.5, d: 3.2, color: 0x3A3F53 },
  { id: '428', name: '428',            x: -17.5, z: 0.5,  w: 6.5, d: 3.2, color: 0x3A3F53 },
  { id: '427', name: '427',            x: -17.5, z: 4.5,  w: 6.5, d: 4.2, color: 0x3A3F53 },
  { id: 'gw',  name: 'Girls Washroom', x: -17.5, z: 9.2,  w: 6.5, d: 4.2, color: 0x2C303E, isUtility: true },

  // East Wing (Right Vertical Column)
  { id: 'faculty-e', name: 'Faculty',     x: 17.5, z: -6.5, w: 6.5, d: 3.2, color: 0x2C303E, isUtility: true },
  { id: '408',       name: '408',         x: 17.5, z: -3.0, w: 6.5, d: 3.2, color: 0x3A3F53 },
  { id: '409',       name: '409',         x: 17.5, z: 0.5,  w: 6.5, d: 3.2, color: 0x3A3F53 },
  { id: '410',       name: '410\nFaculty', x: 17.5, z: 4.5,  w: 6.5, d: 4.2, color: 0x2C303E, isUtility: true },
  { id: 'mw',        name: "Men's Washroom", x: 24.5, z: 4.5, w: 6.5, d: 4.2, color: 0x2C303E, isUtility: true },

  // South Row (Above Bottom Corridor, Facing Courtyard)
  { id: '420', name: '420', x: -8.5, z: 4.5, w: 5.2, d: 4.2, color: 0x3A3F53 },
  { id: '419', name: '419', x: -2.8, z: 4.5, w: 5.2, d: 4.2, color: 0x3A3F53 },
  { id: '418', name: '418', x: 2.8,  z: 4.5, w: 5.2, d: 4.2, color: 0x3A3F53 },
  { id: '417', name: '417', x: 8.5,  z: 4.5, w: 5.2, d: 4.2, color: 0x3A3F53 },

  // Bottom-Left Wing (SW)
  { id: 'st-w', name: 'Stairs', x: -20.5, z: 15, w: 4.5, d: 4.2, color: 0x2C303E, isUtility: true },
  { id: '423',  name: '423',    x: -15.5, z: 15, w: 4.8, d: 4.2, color: 0x3A3F53 },
  { id: '422',  name: '422',    x: -10.2, z: 15, w: 4.8, d: 4.2, color: 0x3A3F53 },
  { id: '421',  name: '421',    x: -5.0,  z: 15, w: 4.8, d: 4.2, color: 0x3A3F53 },

  // Bottom-Right Wing (SE)
  { id: '416', name: '416', x: 11.5, z: 15.0, w: 6.2, d: 4.2, color: 0x3A3F53 },
  { id: '415', name: '415', x: 18.2, z: 15.0, w: 6.2, d: 4.2, color: 0x3A3F53 },
  { id: '414', name: '414', x: 24.9, z: 15.0, w: 6.2, d: 4.2, color: 0x3A3F53 }
];

// --- 2. GLOBAL STATE ---
let scene, camera, renderer, controls;
let roomMeshes = {};
let roomBeacons = {};
let roomLabels = [];
let wallHeightScale = 1.0;
let isWireframe = false;

let alerts = [];
let alertSeq = 1;
let currentActiveView = '3d';

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
  scene.background = new THREE.Color(0x11151F);
  scene.fog = new THREE.FogExp2(0x11151F, 0.015);

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
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x0071E3, 0.3);
  fillLight.position.set(-20, 20, -20);
  scene.add(fillLight);

  // Grid Base Floor
  const gridHelper = new THREE.GridHelper(80, 40, 0x0071E3, 0x222938);
  gridHelper.position.y = -0.05;
  scene.add(gridHelper);

  const floorGeo = new THREE.PlaneGeometry(90, 70);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0C0F17, roughness: 0.8 });
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

    // Room Floor Base
    const floorGeo = new THREE.BoxGeometry(room.w - 0.2, 0.1, room.d - 0.2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: room.isCourtyard ? 0x141722 : (room.isUtility ? 0x222634 : 0x2A3042),
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
        opacity: 0.88,
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
      const lineMat = new THREE.LineBasicMaterial({ color: 0x4A536B, linewidth: 1.5 });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.position.y = wallHeight / 2;
      wireframe.name = 'wireframe';
      group.add(wireframe);

      // Red Emergency PointLight Beacon (hidden initially)
      const beaconLight = new THREE.PointLight(0xFF3B30, 0, 12);
      beaconLight.position.set(0, wallHeight + 1, 0);
      group.add(beaconLight);
      roomBeacons[room.id] = beaconLight;

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
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = room.isCourtyard ? 'rgba(0,0,0,0)' : 'rgba(29,29,31,0.85)';
  if (!room.isCourtyard) {
    ctx.roundRect(10, 20, 236, 88, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.font = 'bold 36px -apple-system, sans-serif';
  ctx.fillStyle = room.isCourtyard ? '#6E6E73' : '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(room.id.toUpperCase(), 128, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  
  sprite.scale.set(room.isCourtyard ? 8 : 4, room.isCourtyard ? 4 : 2, 1);
  sprite.position.set(0, room.isCourtyard ? 0.3 : 3.6, 0);
  parentGroup.add(sprite);

  roomLabels.push({ sprite, canvas, texture, ctx, room });
}

// --- 6. ANIMATION & RENDER LOOP ---
function animate() {
  requestAnimationFrame(animate);

  controls.update();

  // Pulsing animation for active SOS rooms
  const time = Date.now() * 0.005;
  alerts.forEach(a => {
    if (a.status === 'ACTIVE' && roomMeshes[a.roomId]) {
      const group = roomMeshes[a.roomId];
      const wallMesh = group.getObjectByName('wallMesh');
      const beaconLight = roomBeacons[a.roomId];

      if (wallMesh) {
        const pulse = (Math.sin(time * 3) + 1) / 2; // 0 to 1
        wallMesh.material.color.setHex(0xFF3B30);
        wallMesh.material.emissive.setHex(0xFF3B30);
        wallMesh.material.emissiveIntensity = 0.3 + pulse * 0.5;
        wallMesh.material.opacity = 0.7 + pulse * 0.3;
      }

      if (beaconLight) {
        beaconLight.intensity = 2 + Math.sin(time * 6) * 1.5;
      }
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

function addLocalAlert(alert) {
  const existing = alerts.find(a => a.id === alert.id);
  if (!existing) {
    alerts.unshift(alert);
    if (alert.status === 'ACTIVE') playAlertSound();
    renderAll();
  }
}

function renderMap3DAnd2D() {
  // Clear 2D highlights
  document.querySelectorAll('.room').forEach(el => {
    el.classList.remove('flagged');
    const pulse = el.querySelector('.pulse-dot');
    if (pulse) pulse.remove();
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
      const el = document.querySelector(`.room[data-room-id="${a.roomId}"]`);
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
}

function renderAlertFeed() {
  const el = document.getElementById('alert-feed');
  const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;
  document.getElementById('active-count').textContent = `${activeCount} active`;

  if (alerts.length === 0) {
    el.innerHTML = `<div class="empty-state">No active alerts. Click "Simulate SOS" to test.</div>`;
    return;
  }

  el.innerHTML = alerts.map(a => {
    const isResolved = a.status === 'RESOLVED';
    return `
      <div class="alert-row ${isResolved ? 'resolved' : ''}">
        <div class="alert-left">
          <div class="alert-dot"></div>
          <div>
            <div class="alert-room">${a.roomName} ${a.confidence ? `<small style="color:var(--blue);">(${a.confidence}% match)</small>` : ''}</div>
            <div class="alert-meta">${a.id} · ${a.studentName || 'Student'} · Reported ${fmtTime(a.createdAt)}${isResolved ? ' · Resolved ' + fmtTime(a.resolvedAt) : ''}</div>
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
}

function renderAll() {
  renderMap3DAnd2D();
  renderAlertFeed();
}

// Connect to WebSockets for live ESP32 updates
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'INIT') {
      alerts = msg.alerts || [];
      renderAll();
    } else if (msg.type === 'NEW_ALERT') {
      addLocalAlert(msg.alert);
    } else if (msg.type === 'ALERT_RESOLVED') {
      const alert = alerts.find(a => a.id === msg.alert.id);
      if (alert) {
        alert.status = 'RESOLVED';
        alert.resolvedAt = msg.alert.resolvedAt;
        renderAll();
      }
    }
  };
}

// --- INIT APP ---
window.addEventListener('DOMContentLoaded', () => {
  init3D();
  initWebSocket();
  renderAll();
});
