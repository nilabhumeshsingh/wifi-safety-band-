/**
 * NightGuard — SOS Guard Dashboard
 * frontend/src/app.js
 *
 * Connects to the backend via:
 *   GET  /api/sos/active         — hydrate alerts on page load
 *   GET  /api/stream             — SSE for real-time SOS events
 *   PATCH /api/sos/:id/acknowledge
 *   PATCH /api/sos/:id/resolve
 *
 * ESP32 response format (from backend /api/locate):
 *   {
 *     success: true,
 *     predictions: {
 *       most_probable:   { room, building, floor, confidence_score, metrics: { common_bssids, cosine_sim, euclidean_dist } },
 *       medium_probable: { ... } | null,
 *       less_probable:   { ... } | null
 *     },
 *     event: { id, device_id, resolved_room, confidence, status, triggered_at, ... }
 *   }
 */

// ─── Config ──────────────────────────────────────────────────────────────────
// 🚀 DEPLOYMENT CONFIG:
// Put your deployed Render backend URL here (e.g. 'https://nightguard-backend.onrender.com')
// Leave empty ('') if serving frontend directly from the backend server.
const RENDER_BACKEND_URL = 'https://nightguard-backend.onrender.com';

const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = (window.location.protocol === 'file:' || isLocal)
    ? 'http://localhost:3456'
    : (window.BACKEND_URL || RENDER_BACKEND_URL);

// ─── Floor Plan ──────────────────────────────────────────────────────────────
const PLAN_W = 680, PLAN_H = 600;

const ROOMS = [
    // ---- top band ----
    { n: 'Stairs', t: 'stairs',   x: 40,  y: 50,  w: 60,  h: 55 },
    { n: '402',    t: 'classroom', x: 140, y: 50,  w: 130, h: 55 },
    { n: '401',    t: 'classroom', x: 40,  y: 105, w: 110, h: 60 },
    { n: '403',    t: 'classroom', x: 420, y: 50,  w: 110, h: 55 },
    { n: '404',    t: 'classroom', x: 530, y: 50,  w: 90,  h: 55 },
    { n: 'Stairs', t: 'stairs',   x: 620, y: 50,  w: 50,  h: 55 },

    // ---- horizontal corridor spanning full width ----
    { n: 'Corridor', t: 'corridor', x: 40, y: 165, w: 630, h: 50 },

    // ---- left wing ----
    { n: '430', t: 'faculty', x: 150, y: 215, w: 80, h: 65 },
    { n: '429', t: 'faculty', x: 150, y: 280, w: 80, h: 65 },
    { n: '428', t: 'faculty', x: 150, y: 345, w: 80, h: 65 },

    // ---- right wing ----
    { n: 'Faculty', t: 'faculty', x: 560, y: 215, w: 110, h: 65 },
    { n: '408',     t: 'faculty', x: 560, y: 280, w: 110, h: 65 },
    { n: '409',     t: 'faculty', x: 560, y: 345, w: 110, h: 65 },

    // ---- side corridor strips ----
    { n: 'Corridor',     t: 'corridor', x: 230, y: 215, w: 50,  h: 195 },
    { n: 'Relax Region', t: 'relax',    x: 280, y: 215, w: 230, h: 195 },
    { n: 'Corridor',     t: 'corridor', x: 510, y: 215, w: 50,  h: 195 },

    // ---- bottom-left cluster ----
    { n: 'Girls Washroom', t: 'faculty',   x: 40,  y: 410, w: 40,  h: 85 },
    { n: '427',            t: 'classroom', x: 80,  y: 410, w: 80,  h: 85 },
    { n: 'Corridor',       t: 'corridor',  x: 160, y: 410, w: 40,  h: 85 },
    { n: '420',            t: 'classroom', x: 200, y: 410, w: 55,  h: 85 },
    { n: '419',            t: 'classroom', x: 255, y: 410, w: 55,  h: 85 },
    { n: '418',            t: 'classroom', x: 310, y: 410, w: 55,  h: 85 },
    { n: '417',            t: 'classroom', x: 365, y: 410, w: 65,  h: 85 },

    // ---- bottom-right cluster ----
    { n: 'Faculty 410',   t: 'faculty',   x: 430, y: 410, w: 70,  h: 85 },
    { n: 'Corridor',      t: 'corridor',  x: 500, y: 410, w: 40,  h: 85 },
    { n: 'Mens Washroom', t: 'faculty',   x: 540, y: 410, w: 80,  h: 85 },
    { n: 'Stairs',        t: 'stairs',    x: 620, y: 410, w: 50,  h: 85 },

    // ---- lower corridor strip ----
    { n: 'Corridor', t: 'corridor', x: 40,  y: 495, w: 630, h: 25 },

    // ---- bottom row ----
    { n: 'Stairs', t: 'stairs',    x: 40,  y: 520, w: 60,  h: 70 },
    { n: '423',    t: 'classroom', x: 100, y: 520, w: 70,  h: 70 },
    { n: '422',    t: 'classroom', x: 170, y: 520, w: 60,  h: 70 },
    { n: '421',    t: 'classroom', x: 230, y: 520, w: 70,  h: 70 },
    { n: '416',    t: 'classroom', x: 430, y: 520, w: 90,  h: 70 },
    { n: '415',    t: 'classroom', x: 520, y: 520, w: 80,  h: 70 },
    { n: '414',    t: 'classroom', x: 600, y: 520, w: 70,  h: 70 },
];

const COLORS = {
    classroom: 0xAEAEB2,
    faculty:   0x6E6E73,
    corridor:  0x3A3A3C,
    relax:     0x5FB88A,
    stairs:    0xFF9F0A,
    alert:     0xFF3B30,
    ack:       0x0A84FF,
};

const HEIGHTS = { classroom: 0.55, faculty: 0.55, corridor: 0.12, relax: 0.45, stairs: 0.55 };

// ─── State ───────────────────────────────────────────────────────────────────
let activeAlerts = 0;
const pings      = [];
const alertsById = {};  // key: supabase event id (or local 'sim-...')

// ─── Utils ───────────────────────────────────────────────────────────────────
function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function formatTime(isoString) {
    if (!isoString) return timeNow();
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Find the ROOMS entry matching a room number string */
function findRoomByNumber(roomNo) {
    if (!roomNo) return null;
    const key = String(roomNo).trim();
    return ROOMS.find(r => r.n === key || r.n.replace(/\s+/g, '') === key.replace(/\s+/g, ''));
}

/**
 * Normalise an incoming event to a consistent shape regardless of whether
 * it came from SSE (new predictions format) or from GET /api/sos/active
 * (legacy Supabase columns: resolved_room, confidence).
 */
function normaliseEvent(ev) {
    // SSE events carry full predictions object
    if (ev.predictions?.most_probable) {
        const p = ev.predictions.most_probable;
        return {
            id:          ev.id,
            device_id:   ev.device_id,
            status:      ev.status || 'open',
            created_at:  ev.created_at || ev.triggered_at,
            room_no:     p.room,
            building:    p.building || 'AB2',
            floor:       p.floor    || '4',
            confidence:  p.confidence_score,
            predictions: ev.predictions
        };
    }
    // Supabase hydrated events (no predictions object)
    return {
        id:          ev.id,
        device_id:   ev.device_id,
        status:      ev.status || 'open',
        created_at:  ev.triggered_at || ev.created_at,
        room_no:     ev.resolved_room,
        building:    ev.building || 'AB2',
        floor:       ev.floor    || '4',
        confidence:  ev.confidence,
        predictions: null
    };
}

// ─── Alert Feed ──────────────────────────────────────────────────────────────
function updateActiveCount() {
    const pill = document.getElementById('active-count');
    if (!pill) return;
    pill.textContent = `${activeAlerts} active`;
    pill.classList.toggle('has-alerts', activeAlerts > 0);
}

const MAX_FEED_ITEMS    = 5;
const MAX_HISTORY_ITEMS = 20;

/** Render one row of the 3-tier predictions table */
function predictionRow(label, tier, medal) {
    if (!tier) return '';
    const m = tier.metrics;
    return `
        <tr>
            <td>${medal} <b>${tier.room}</b></td>
            <td>${label}</td>
            <td class="pred-conf">${tier.confidence_score.toFixed(1)}%</td>
            <td class="pred-metric">${m ? m.common_bssids : '—'} APs</td>
            <td class="pred-metric">${m ? m.cosine_sim.toFixed(3) : '—'}</td>
            <td class="pred-metric">${m ? m.euclidean_dist.toFixed(1) : '—'}</td>
        </tr>`;
}

/** Build the expandable predictions table HTML */
function buildPredictionsTable(predictions) {
    if (!predictions?.most_probable) return '';
    const { most_probable: p1, medium_probable: p2, less_probable: p3 } = predictions;
    return `
        <details class="pred-details">
            <summary class="pred-summary">📊 View location analysis</summary>
            <table class="pred-table">
                <thead>
                    <tr>
                        <th>Room</th>
                        <th>Probability</th>
                        <th>Confidence</th>
                        <th>Common APs</th>
                        <th>Cosine Sim</th>
                        <th>Euclidean Dist</th>
                    </tr>
                </thead>
                <tbody>
                    ${predictionRow('Most Probable',   p1, '🥇')}
                    ${predictionRow('Medium Probable', p2, '🥈')}
                    ${predictionRow('Less Probable',   p3, '🥉')}
                </tbody>
            </table>
        </details>`;
}

/**
 * Add an SOS alert to the feed and highlight the map.
 * @param {object} rawEvent - raw event from SSE or Supabase
 */
function addAlert(rawEvent) {
    const ev = normaliseEvent(rawEvent);

    // Deduplicate — don't add the same event twice
    if (alertsById[ev.id]) return;

    const room      = findRoomByNumber(ev.room_no);
    const roomLabel = ev.room_no ? `Room ${ev.room_no}` : 'Unknown Location';
    const locDetail = [
        ev.building,
        ev.floor ? `Floor ${ev.floor}` : null,
        ev.confidence ? `${ev.confidence.toFixed(1)}% confidence` : null
    ].filter(Boolean).join(' · ');

    activeAlerts++;
    updateActiveCount();

    const feed  = document.getElementById('alert-feed');
    const empty = feed.querySelector('.alert-empty');
    if (empty) empty.remove();

    const isAck = ev.status === 'acknowledged';
    const item  = document.createElement('div');
    item.className = 'alert-item' + (isAck ? ' acknowledged' : '');
    item.id = `alert-${ev.id}`;

    item.innerHTML = `
        <span class="alert-dot"></span>
        <span class="alert-text">
            SOS triggered in <b>${roomLabel}</b>
            <span class="alert-loc">${locDetail}</span>
            ${buildPredictionsTable(ev.predictions)}
        </span>
        <span class="alert-time">${formatTime(ev.created_at)}</span>
        ${isAck
            ? `<button class="alert-action res" onclick="resolveAlert('${ev.id}')">Resolve</button>`
            : `<button class="alert-action ack" onclick="acknowledgeAlert('${ev.id}')">Acknowledge</button>`
        }
    `;
    feed.prepend(item);
    overflowFeedToHistory();

    // Highlight map
    if (room) {
        flashRoom3D(room);
        flashRoom2D(room);
        focusCameraOnRoom(room);
    }

    const autoTimer = setTimeout(() => resolveAlert(ev.id), 60_000);
    alertsById[ev.id] = { id: ev.id, room, autoTimer, status: ev.status || 'open' };
}

function overflowFeedToHistory() {
    const feed = document.getElementById('alert-feed');
    while (feed.children.length > MAX_FEED_ITEMS) {
        moveToHistory(feed.lastChild);
    }
}

function moveToHistory(item) {
    const historyCard = document.getElementById('history-card');
    const history     = document.getElementById('alert-history');
    item.classList.add('history-item');
    const btn = item.querySelector('.alert-action');
    if (btn) btn.remove();
    history.prepend(item);
    if (historyCard) historyCard.style.display = '';
    updateHistoryCount();
    while (history.children.length > MAX_HISTORY_ITEMS) {
        history.removeChild(history.lastChild);
    }
}

function updateHistoryCount() {
    const pill    = document.getElementById('history-count');
    const history = document.getElementById('alert-history');
    if (pill) pill.textContent = `${history.children.length} logged`;
}

let historyOpen = false;
function toggleHistory() {
    historyOpen = !historyOpen;
    const body    = document.getElementById('history-body');
    const chevron = document.getElementById('history-chevron');
    const toggle  = document.getElementById('history-toggle');
    if (body)    body.classList.toggle('collapsed', !historyOpen);
    if (chevron) chevron.classList.toggle('open', historyOpen);
    if (toggle)  toggle.setAttribute('aria-expanded', String(historyOpen));
}

// ─── Acknowledge / Resolve ───────────────────────────────────────────────────
async function acknowledgeAlert(id) {
    const a = alertsById[id];
    if (!a || a.status === 'resolved' || a.status === 'acknowledged') return;
    try {
        await fetch(`${API_BASE}/api/sos/${id}/acknowledge`, { method: 'PATCH' });
    } catch (e) {
        console.warn('[ACK] fetch failed', e);
    }
    applyAcknowledge(id);
}

function applyAcknowledge(id) {
    const a = alertsById[id];
    if (!a) return;
    a.status = 'acknowledged';
    clearTimeout(a.autoTimer);

    const item = document.getElementById(`alert-${id}`);
    if (item) {
        item.classList.add('acknowledged');
        const txt = item.querySelector('.alert-text');
        if (txt) {
            const roomName = a.room ? `Room ${a.room.n}` : 'Unknown';
            // Keep predictions table but update the top line
            const existingDetails = txt.querySelector('.pred-details');
            txt.innerHTML = `Acknowledged — <b>${roomName}</b> · unit responding
                <span class="alert-loc">Guard dispatched</span>
                ${existingDetails ? existingDetails.outerHTML : ''}`;
        }
        const btn = item.querySelector('.alert-action');
        if (btn) {
            btn.textContent = 'Resolve';
            btn.className   = 'alert-action res';
            btn.setAttribute('onclick', `resolveAlert('${id}')`);
        }
    }
    if (a.room) unflashRoom3D(a.room, true);
}

async function resolveAlert(id) {
    const a = alertsById[id];
    if (!a || a.status === 'resolved') return;
    try {
        await fetch(`${API_BASE}/api/sos/${id}/resolve`, { method: 'PATCH' });
    } catch (e) {
        console.warn('[RESOLVE] fetch failed', e);
    }
    applyResolve(id);
}

function applyResolve(id) {
    const a = alertsById[id];
    if (!a) return;
    a.status = 'resolved';
    clearTimeout(a.autoTimer);

    const item = document.getElementById(`alert-${id}`);
    if (item) {
        item.classList.add('resolved');
        const txt = item.querySelector('.alert-text');
        if (txt) {
            const roomName = a.room ? `Room ${a.room.n}` : 'Unknown';
            txt.innerHTML = `Resolved — <b>${roomName}</b> cleared
                <span class="alert-loc">Situation resolved</span>`;
        }
    }
    activeAlerts = Math.max(0, activeAlerts - 1);
    updateActiveCount();
    if (a.room) { unflashRoom3D(a.room); unflashRoom2D(a.room); }
}

// ─── SSE Connection ──────────────────────────────────────────────────────────
let sseRetryDelay = 2000;

function connectSSE() {
    setConnectionStatus('connecting');
    const es = new EventSource(`${API_BASE}/api/stream`);

    es.addEventListener('connected', () => {
        sseRetryDelay = 2000;
        setConnectionStatus('online');
        console.log('[SSE] connected');
    });

    es.addEventListener('sos', e => {
        const data = JSON.parse(e.data);
        console.log('[SSE] sos event', data);
        addAlert(data);
        notifyGuard(data);
    });

    es.addEventListener('sos_update', e => {
        const { id, status } = JSON.parse(e.data);
        console.log('[SSE] sos_update', id, status);
        if (status === 'acknowledged') applyAcknowledge(id);
        if (status === 'resolved')     applyResolve(id);
    });

    es.onerror = () => {
        setConnectionStatus('offline');
        es.close();
        console.warn(`[SSE] disconnected — retry in ${sseRetryDelay}ms`);
        setTimeout(() => {
            sseRetryDelay = Math.min(sseRetryDelay * 2, 30_000);
            connectSSE();
        }, sseRetryDelay);
    };
}

function setConnectionStatus(state) {
    const dot   = document.getElementById('conn-dot');
    const label = document.getElementById('conn-label');
    if (!dot || !label) return;
    dot.className   = `conn-dot ${state}`;
    const labels    = { online: 'Live', connecting: 'Connecting…', offline: 'Offline' };
    label.textContent = labels[state] || state;
}

function notifyGuard(data) {
    if (Notification.permission !== 'granted') return;
    const p = data.predictions?.most_probable;
    const room = p?.room || data.resolved_room || '?';
    const bldg = p?.building || 'AB2';
    const flr  = p?.floor    || '4';
    const conf = p ? ` (${p.confidence_score.toFixed(1)}%)` : '';
    new Notification('🚨 SOS Alert', {
        body: `Room ${room} · ${bldg} Floor ${flr}${conf}`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23FF3B30"/></svg>'
    });
}

// ─── Load active events on page start ────────────────────────────────────────
async function loadActiveAlerts() {
    try {
        const res  = await fetch(`${API_BASE}/api/sos/active`);
        const json = await res.json();
        if (Array.isArray(json.events)) {
            // Add in reverse-chronological order so newest ends up on top
            [...json.events].reverse().forEach(ev => addAlert(ev));
        }
    } catch (e) {
        console.warn('[load] could not fetch active alerts:', e.message);
    }
}

// ─── 3D Scene ────────────────────────────────────────────────────────────────
let scene, camera, renderer, container;
let cam     = { theta: 0.9, phi: 1.05, radius: 13, target: new THREE.Vector3(0, 0, 0) };
let camGoal = { target: new THREE.Vector3(0, 0, 0), radius: 13, active: false };
const roomMeshes  = [];
let focusedRoom   = null;
let focusRingMesh = null;

function toWorld(px, py, pw, ph) {
    const s = 1 / 40;
    return {
        x: (px + pw / 2 - PLAN_W / 2) * s,
        z: (py + ph / 2 - PLAN_H / 2) * s,
        w: pw * s,
        d: ph * s,
    };
}

function initScene() {
    container = document.getElementById('canvas-3d-container');
    scene     = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    updateCameraFromSpherical();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x9a9a9e, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 10, 4);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x8e8e93, 0.35);
    rim.position.set(-6, 4, -6);
    scene.add(rim);

    const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 17),
        new THREE.MeshBasicMaterial({ color: 0x0A0A0C })
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = -0.02;
    scene.add(plate);

    const grid = new THREE.GridHelper(20, 40, 0x2a2a2e, 0x1c1c1e);
    grid.position.y = -0.01;
    scene.add(grid);

    ROOMS.forEach(room => buildRoomMesh(room));
    buildRadarSweep();
    attachControls();
    window.addEventListener('resize', onResize);
    requestAnimationFrame(animate);
}

function buildRoomMesh(room) {
    const { x, z, w, d } = toWorld(room.x, room.y, room.w, room.h);
    const h        = HEIGHTS[room.t];
    const isStairs = room.t === 'stairs';
    const geo = new THREE.BoxGeometry(w * 0.94, h, d * 0.94);
    const mat = new THREE.MeshStandardMaterial({
        color: COLORS[room.t], roughness: 0.55, metalness: 0.08,
        transparent: true, opacity: room.t === 'corridor' ? 0.5 : (isStairs ? 0.22 : 0.88)
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    scene.add(mesh);

    const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0xE5E5EA, transparent: true, opacity: 0.25 })
    );
    edges.position.copy(mesh.position);
    scene.add(edges);

    let stepsGroup = null;
    if (isStairs) stepsGroup = buildStairSteps(x, z, w, d);

    if (room.t !== 'corridor') {
        const label = makeLabelSprite(room.n);
        label.position.set(x, (isStairs ? 0.95 : h) + 0.42, z);
        scene.add(label);
    }

    roomMeshes.push({ room, mesh, edges, baseColor: COLORS[room.t], stepsGroup });
}

function buildStairSteps(x, z, w, d) {
    const group   = new THREE.Group();
    const steps   = 7, maxH = 0.85;
    const alongX  = w >= d;
    const runLen  = (alongX ? w : d) * 0.94;
    const stepLen = runLen / steps;
    const tA = new THREE.Color(0xFF9F0A), tB = new THREE.Color(0xFFC773);

    for (let i = 0; i < steps; i++) {
        const stepH = ((i + 1) / steps) * maxH;
        const stepW = alongX ? stepLen * 0.94 : w * 0.82;
        const stepD = alongX ? d * 0.82 : stepLen * 0.94;
        const geo   = new THREE.BoxGeometry(stepW, stepH, stepD);
        const shade = tA.clone().lerp(tB, i / (steps - 1));
        const mat   = new THREE.MeshStandardMaterial({ color: shade, roughness: 0.4, metalness: 0.18, transparent: true, opacity: 0.95 });
        const sm    = new THREE.Mesh(geo, mat);
        const off   = (i - (steps - 1) / 2) * stepLen;
        sm.position.set(alongX ? x + off : x, stepH / 2, alongX ? z : z + off);
        group.add(sm);
        const se = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x2C2C2E, transparent: true, opacity: 0.55 }));
        se.position.copy(sm.position);
        group.add(se);
    }
    scene.add(group);
    return group;
}

function makeLabelSprite(text) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const ctx = c.getContext('2d');
    ctx.font = '600 40px "SF Mono",-apple-system,Menlo,monospace';
    ctx.fillStyle = 'rgba(229,229,234,0.92)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 48);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.1, 0.42, 1);
    return sprite;
}

function buildRadarSweep() {
    const geo  = new THREE.RingGeometry(0.02, 8, 48, 1, 0, Math.PI / 6);
    const mat  = new THREE.MeshBasicMaterial({ color: 0xAEAEB2, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
    const sweep = new THREE.Mesh(geo, mat);
    sweep.rotation.x = -Math.PI / 2;
    sweep.position.y = 0.02;
    scene.add(sweep);
    sweep.userData.isSweep = true;
    roomMeshes.push({ sweep });
}

function flashRoom3D(room) {
    roomMeshes.forEach(({ room: r, mesh, stepsGroup }) => {
        if (!r || r !== room || !mesh) return;
        mesh.material.color.setHex(COLORS.alert);
        mesh.material.opacity = 0.95;
        if (stepsGroup) stepsGroup.visible = false;
    });
    const { x, z } = toWorld(room.x, room.y, room.w, room.h);
    spawnPing(x, z);
}

function unflashRoom3D(room, downgradeToAck = false) {
    roomMeshes.forEach(({ room: r, mesh, baseColor, stepsGroup }) => {
        if (!r || r !== room || !mesh) return;
        if (downgradeToAck) {
            mesh.material.color.setHex(COLORS.ack);
            mesh.material.opacity = 0.75;
            if (stepsGroup) stepsGroup.visible = false;
        } else {
            mesh.material.color.setHex(baseColor);
            mesh.material.opacity = r.t === 'corridor' ? 0.5 : (r.t === 'stairs' ? 0.22 : 0.88);
            if (stepsGroup) stepsGroup.visible = true;
        }
    });
}

function spawnPing(x, z) {
    const geo  = new THREE.RingGeometry(0.05, 0.18, 40);
    const mat  = new THREE.MeshBasicMaterial({ color: 0xFF3B30, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.05, z);
    scene.add(ring);
    pings.push({ mesh: ring, t: 0 });
}

function animate() {
    requestAnimationFrame(animate);

    for (let i = pings.length - 1; i >= 0; i--) {
        const p = pings[i];
        p.t += 0.02;
        const scale = 1 + p.t * 9;
        p.mesh.scale.set(scale, scale, scale);
        p.mesh.material.opacity = Math.max(0, 0.9 - p.t * 0.9);
        if (p.t >= 1) { scene.remove(p.mesh); pings.splice(i, 1); }
    }

    roomMeshes.forEach(item => { if (item.sweep) item.sweep.rotation.z += 0.004; });

    if (camGoal.active) {
        cam.target.lerp(camGoal.target, 0.08);
        cam.radius += (camGoal.radius - cam.radius) * 0.08;
        updateCameraFromSpherical();
        if (cam.target.distanceTo(camGoal.target) < 0.01 && Math.abs(cam.radius - camGoal.radius) < 0.02) {
            camGoal.active = false;
        }
    }

    renderer.render(scene, camera);
}

function focusCameraOnRoom(room) {
    const { x, z, w, d } = toWorld(room.x, room.y, room.w, room.h);
    camGoal.target.set(x, 0, z);
    camGoal.radius = Math.max(4.5, Math.max(w, d) * 2.2);
    camGoal.active = true;
    focusedRoom    = room;
    highlightFocusRing(room);
}

function highlightFocusRing(room) {
    if (focusRingMesh) scene.remove(focusRingMesh);
    const { x, z, w, d } = toWorld(room.x, room.y, room.w, room.h);
    const radius = Math.max(w, d) / 2 + 0.18;
    const geo = new THREE.RingGeometry(radius, radius + 0.05, 40);
    const mat = new THREE.MeshBasicMaterial({ color: 0xE5E5EA, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    focusRingMesh = new THREE.Mesh(geo, mat);
    focusRingMesh.rotation.x = -Math.PI / 2;
    focusRingMesh.position.set(x, 0.03, z);
    scene.add(focusRingMesh);
}

function onResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function updateCameraFromSpherical() {
    const { theta, phi, radius, target } = cam;
    const sinPhi = Math.sin(phi);
    camera.position.set(
        target.x + radius * sinPhi * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * sinPhi * Math.cos(theta)
    );
    camera.lookAt(target);
}

const raycaster  = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

function attachControls() {
    let dragging = false, panning = false, lastX = 0, lastY = 0, downX = 0, downY = 0;

    container.addEventListener('contextmenu', e => e.preventDefault());
    container.addEventListener('pointerdown', e => {
        if (e.button === 2) panning = true; else dragging = true;
        lastX = e.clientX; lastY = e.clientY;
        downX = e.clientX; downY = e.clientY;
        container.setPointerCapture(e.pointerId);
    });
    container.addEventListener('pointermove', e => {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        if (dragging) {
            cam.theta -= dx * 0.006;
            cam.phi    = Math.min(Math.PI / 2 - 0.05, Math.max(0.15, cam.phi - dy * 0.006));
            camGoal.active = false;
            updateCameraFromSpherical();
        } else if (panning) {
            const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
            cam.target.addScaledVector(right, -dx * 0.02);
            cam.target.addScaledVector(new THREE.Vector3(0, 1, 0), dy * 0.02);
            camGoal.active = false;
            updateCameraFromSpherical();
        }
    });
    container.addEventListener('pointerup', e => {
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (moved < 4 && e.button === 0) handleRoomClick(e);
        dragging = false; panning = false;
    });
    container.addEventListener('wheel', e => {
        e.preventDefault();
        camGoal.active = false;
        cam.radius = Math.min(28, Math.max(4, cam.radius + e.deltaY * 0.012));
        updateCameraFromSpherical();
    }, { passive: false });
}

function handleRoomClick(e) {
    const rect = container.getBoundingClientRect();
    pointerNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const meshes = roomMeshes.filter(m => m.mesh).map(m => m.mesh);
    const hits   = raycaster.intersectObjects(meshes);
    if (!hits.length) return;
    const entry = roomMeshes.find(m => m.mesh === hits[0].object);
    if (entry && entry.room.t !== 'corridor') focusCameraOnRoom(entry.room);
}

function resetCameraView() {
    camGoal.active = false;
    cam = { theta: 0.9, phi: 1.05, radius: 13, target: new THREE.Vector3(0, 0, 0) };
    updateCameraFromSpherical();
    if (focusRingMesh) { scene.remove(focusRingMesh); focusRingMesh = null; }
    focusedRoom = null;
}

// ─── 2D Grid ─────────────────────────────────────────────────────────────────
let gridBuilt = false;
function build2DGrid() {
    if (gridBuilt) return;
    gridBuilt = true;
    const host = document.getElementById('floor-grid-2d');
    ROOMS.forEach(room => {
        const el = document.createElement('div');
        el.className = `room-2d t-${room.t}`;
        el.style.left   = (room.x / PLAN_W * 100) + '%';
        el.style.top    = (room.y / PLAN_H * 100) + '%';
        el.style.width  = (room.w / PLAN_W * 100) + '%';
        el.style.height = (room.h / PLAN_H * 100) + '%';
        el.textContent  = room.t === 'corridor' ? 'Corridor' : room.n;
        el.title = room.n + (room.t !== 'corridor' ? ' — click to focus' : '');
        if (room.t !== 'corridor') {
            el.addEventListener('click', () => focusCameraOnRoom(room));
        }
        el.dataset.roomRef = ROOMS.indexOf(room);
        host.appendChild(el);
    });
}

function flashRoom2D(room) {
    const idx = ROOMS.indexOf(room);
    document.querySelectorAll(`.room-2d[data-room-ref="${idx}"]`).forEach(el => el.classList.add('alerting'));
}
function unflashRoom2D(room) {
    const idx = ROOMS.indexOf(room);
    document.querySelectorAll(`.room-2d[data-room-ref="${idx}"]`).forEach(el => el.classList.remove('alerting'));
}

function switchView(view) {
    const is3d = view === '3d';
    document.getElementById('tab-3d').classList.toggle('active', is3d);
    document.getElementById('tab-2d').classList.toggle('active', !is3d);
    document.getElementById('view-3d-wrapper').style.display = is3d ? '' : 'none';
    document.getElementById('view-2d-wrapper').style.display = is3d ? 'none' : '';
    if (!is3d) build2DGrid();
    if (is3d)  onResize();
}

// ─── Dev: Simulate SOS ───────────────────────────────────────────────────────
function simulateSOS(roomOverride) {
    // Request notification permission on first user gesture
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    const classrooms = ROOMS.filter(r => r.t === 'classroom');
    const room       = roomOverride || classrooms[Math.floor(Math.random() * classrooms.length)];
    const p2 = classrooms.find(r => r !== room);
    const p3 = classrooms.find(r => r !== room && r !== p2);

    addAlert({
        id:          'sim-' + Date.now(),
        device_id:   'ESP32_C6_ZERO_01',
        status:      'open',
        created_at:  new Date().toISOString(),
        predictions: {
            most_probable: {
                room:             room.n,
                building:         'AB2',
                floor:            '4',
                confidence_score: parseFloat((55 + Math.random() * 35).toFixed(1)),
                metrics: {
                    common_bssids:  5,
                    cosine_sim:     parseFloat((0.85 + Math.random() * 0.12).toFixed(4)),
                    euclidean_dist: parseFloat((8 + Math.random() * 20).toFixed(2))
                }
            },
            medium_probable: p2 ? {
                room:             p2.n,
                building:         'AB2',
                floor:            '4',
                confidence_score: parseFloat((15 + Math.random() * 25).toFixed(1)),
                metrics: {
                    common_bssids:  3,
                    cosine_sim:     parseFloat((0.5 + Math.random() * 0.3).toFixed(4)),
                    euclidean_dist: parseFloat((20 + Math.random() * 30).toFixed(2))
                }
            } : null,
            less_probable: p3 ? {
                room:             p3.n,
                building:         'AB2',
                floor:            '4',
                confidence_score: parseFloat((5 + Math.random() * 15).toFixed(1)),
                metrics: {
                    common_bssids:  2,
                    cosine_sim:     parseFloat((0.2 + Math.random() * 0.25).toFixed(4)),
                    euclidean_dist: parseFloat((35 + Math.random() * 40).toFixed(2))
                }
            } : null
        }
    });
}

// ─── Boot ──────────────────────────────────────────────────────────────
async function boot() {
    document.getElementById('alert-feed').innerHTML =
        '<div class="alert-empty">No active alerts — all clear on the 4th floor.</div>';

    // NOTE: Notification.requestPermission() must only be called from a user gesture.
    // It is triggered the first time the guard clicks "Simulate SOS" or "Acknowledge".

    initScene();
    await loadActiveAlerts();
    connectSSE();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
