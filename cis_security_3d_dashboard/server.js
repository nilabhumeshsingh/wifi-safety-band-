const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const MAPPINGS_FILE = path.join(__dirname, '../mapper/mappings.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store active alerts in memory
let alerts = [];
let alertSeq = 1;

// --- GUARD ROSTER ---
// Room coordinates from the 3D layout for distance calculation
const roomCoords = {
  // 4th Floor Rooms
  '401': { x: -20, z: -12.5, y: 7.0 },
  '402': { x: -11, z: -12.5, y: 7.0 },
  '403': { x: 11, z: -12.5, y: 7.0 },
  '404': { x: 19.5, z: -12.5, y: 7.0 },
  '430': { x: -17.5, z: -6.5, y: 7.0 },
  '429': { x: -17.5, z: -3.0, y: 7.0 },
  '428': { x: -17.5, z: 0.5, y: 7.0 },
  '427': { x: -17.5, z: 4.5, y: 7.0 },
  'gw':  { x: -17.5, z: 9.2, y: 7.0 },
  'faculty-e': { x: 17.5, z: -6.5, y: 7.0 },
  '408': { x: 17.5, z: -3.0, y: 7.0 },
  '409': { x: 17.5, z: 0.5, y: 7.0 },
  '410': { x: 17.5, z: 4.5, y: 7.0 },
  'mw':  { x: 24.5, z: 4.5, y: 7.0 },
  '420': { x: -8.5, z: 4.5, y: 7.0 },
  '419': { x: -2.8, z: 4.5, y: 7.0 },
  '418': { x: 2.8,  z: 4.5, y: 7.0 },
  '417': { x: 8.5,  z: 4.5, y: 7.0 },
  'st-w': { x: -20.5, z: 15, y: 7.0 },
  '423': { x: -15.5, z: 15, y: 7.0 },
  '422': { x: -10.2, z: 15, y: 7.0 },
  '421': { x: -5.0,  z: 15, y: 7.0 },
  '416': { x: 11.5, z: 15.0, y: 7.0 },
  '415': { x: 18.2, z: 15.0, y: 7.0 },
  '414': { x: 24.9, z: 15.0, y: 7.0 },

  // 3rd Floor Rooms (Stacked Directly Below)
  '301': { x: -20, z: -12.5, y: 0.0 },
  '302': { x: -11, z: -12.5, y: 0.0 },
  '303': { x: 11, z: -12.5, y: 0.0 },
  '304': { x: 19.5, z: -12.5, y: 0.0 },
  '330': { x: -17.5, z: -6.5, y: 0.0 },
  '329': { x: -17.5, z: -3.0, y: 0.0 },
  '328': { x: -17.5, z: 0.5, y: 0.0 },
  '327': { x: -17.5, z: 4.5, y: 0.0 },
  'gw-3': { x: -17.5, z: 9.2, y: 0.0 },
  'faculty-e-3': { x: 17.5, z: -6.5, y: 0.0 },
  '308': { x: 17.5, z: -3.0, y: 0.0 },
  '309': { x: 17.5, z: 0.5, y: 0.0 },
  '310': { x: 17.5, z: 4.5, y: 0.0 },
  'mw-3': { x: 24.5, z: 4.5, y: 0.0 },
  '320': { x: -8.5, z: 4.5, y: 0.0 },
  '319': { x: -2.8, z: 4.5, y: 0.0 },
  '318': { x: 2.8,  z: 4.5, y: 0.0 },
  '317': { x: 8.5,  z: 4.5, y: 0.0 },
  'st-w-3': { x: -20.5, z: 15, y: 0.0 },
  '323': { x: -15.5, z: 15, y: 0.0 },
  '322': { x: -10.2, z: 15, y: 0.0 },
  '321': { x: -5.0,  z: 15, y: 0.0 },
  '316': { x: 11.5, z: 15.0, y: 0.0 },
  '315': { x: 18.2, z: 15.0, y: 0.0 },
  '314': { x: 24.9, z: 15.0, y: 0.0 },

  'courtyard': { x: 0, z: 0, y: 0 },
  'corridor-top': { x: 0, z: -8.5, y: 0 },
  'corridor-left': { x: -12.5, z: 0, y: 0 },
  'corridor-right': { x: 12.5, z: 0, y: 0 },
  'corridor-bottom': { x: 0, z: 8.5, y: 0 }
};

let guards = [
  { id: 'G1', name: 'Raj Kumar (Fl 4)',     assignedRoom: '402', status: 'available', lastSeen: Date.now() },
  { id: 'G2', name: 'Vikram Singh (Fl 4)',  assignedRoom: '409', status: 'available', lastSeen: Date.now() },
  { id: 'G3', name: 'Anil Sharma (Fl 4)',   assignedRoom: '420', status: 'available', lastSeen: Date.now() },
  { id: 'G4', name: 'Suresh Yadav (Fl 3)',  assignedRoom: '327', status: 'available', lastSeen: Date.now() },
  { id: 'G5', name: 'Deepak Verma (Fl 3)',  assignedRoom: '314', status: 'available', lastSeen: Date.now() },
  { id: 'G6', name: 'Manoj Patel (Ground)', assignedRoom: 'courtyard', status: 'available', lastSeen: Date.now() }
];

// Calculate Euclidean distance between two rooms
function roomDistance(roomA, roomB) {
  const a = roomCoords[roomA];
  const b = roomCoords[roomB];
  if (!a || !b) return Infinity;
  const ay = a.y || 0;
  const by = b.y || 0;
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.z - b.z, 2) + Math.pow(ay - by, 2));
}

// Find nearest available guard to a given room
function findNearestGuard(targetRoomId) {
  let nearest = null;
  let minDist = Infinity;

  for (const guard of guards) {
    if (guard.status !== 'available') continue;
    const dist = roomDistance(guard.assignedRoom, targetRoomId);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...guard, distance: Math.round(dist * 10) / 10 };
    }
  }

  return nearest;
}

// Load mappings dataset for KNN signal matching
function loadMappings() {
  try {
    if (fs.existsSync(MAPPINGS_FILE)) {
      const raw = fs.readFileSync(MAPPINGS_FILE, 'utf-8');
      return JSON.parse(raw).locations || [];
    }
  } catch (e) {
    console.error('Error loading mappings:', e.message);
  }
  return [];
}

// Supabase Config for event logging
const SUPABASE_URL = 'https://yeftztxhcvuolhyskadu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZnR6dHhoY3Z1b2xoeXNrYWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MTI5MDksImV4cCI6MjEwMDk4ODkwOX0.6lYjFOnPTcN-kX5Ii3tb3acX80JTaKa6CtWdZGUbbwo';

async function logEventToSupabase(deviceId, scanData, resolvedRoom, confidence) {
  try {
    const payload = JSON.stringify({
      device_id: deviceId,
      scan_data: scanData,
      resolved_room: resolvedRoom,
      confidence: confidence,
      status: 'active'
    });

    const response = await fetch(`${SUPABASE_URL}/rest/v1/sos_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: payload
    });

    if (!response.ok) {
      console.error('Supabase logging error:', response.statusText);
    }
  } catch (err) {
    console.error('Supabase log error:', err.message);
  }
}

// Load all room fingerprints from CSV and mappings.json
function getAllRoomFingerprints() {
  const fingerprints = [];

  // Load from mappings.json (using require for static Vercel bundling + fs fallback)
  try {
    let data = null;
    if (fs.existsSync(MAPPINGS_FILE)) {
      data = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));
    } else {
      data = require('./data/mappings.json');
    }
    if (data && data.locations && Array.isArray(data.locations)) {
      for (const loc of data.locations) {
        const networks = {};
        if (loc.networks && Array.isArray(loc.networks)) {
          loc.networks.forEach(net => {
            if (net.bssid) {
              networks[net.bssid.toUpperCase().trim()] = parseInt(net.signal) || 0;
            }
          });
        }
        if (Object.keys(networks).length > 0) {
          fingerprints.push({
            room: loc.room,
            building: loc.building || 'AB2',
            floor: loc.floor || '4',
            description: loc.description || '',
            networks
          });
        }
      }
    }
  } catch (e) {
    console.error('Error loading JSON fingerprints:', e.message);
  }

  return fingerprints;
}

// 3-Tier Probability Vector Matching Engine
function locateDevice3Tier(userSignals) {
  const userMap = {};
  if (Array.isArray(userSignals)) {
    userSignals.forEach(item => {
      if (item && item.bssid) {
        const bssidUpper = item.bssid.toUpperCase().trim();
        userMap[bssidUpper] = parseInt(item.signal) || 0;
      }
    });
  } else if (typeof userSignals === 'object' && userSignals !== null) {
    Object.keys(userSignals).forEach(bssid => {
      const bssidUpper = bssid.toUpperCase().trim();
      if (bssidUpper.includes(':')) {
        userMap[bssidUpper] = parseInt(userSignals[bssid]) || 0;
      }
    });
  }

  const userBssids = Object.keys(userMap);
  if (userBssids.length === 0) {
    return { success: false, error: 'No valid VITBPL BSSIDs found in scan payload' };
  }

  const dataset = getAllRoomFingerprints();
  const scoredRooms = [];

  const normUser = Math.sqrt(Object.values(userMap).reduce((acc, v) => acc + v * v, 0));

  for (const entry of dataset) {
    const roomMap = entry.networks;
    const roomBssids = Object.keys(roomMap);
    
    const commonBssids = userBssids.filter(b => roomBssids.includes(b));
    const overlapCount = commonBssids.length;

    const allBssids = new Set([...userBssids, ...roomBssids]);
    let dotProduct = 0;
    let normRoomSq = 0;

    for (const b of roomBssids) {
      normRoomSq += roomMap[b] * roomMap[b];
    }
    const normRoom = Math.sqrt(normRoomSq);

    for (const b of allBssids) {
      const uSig = userMap[b] || 0;
      const rSig = roomMap[b] || 0;
      dotProduct += uSig * rSig;
    }

    const cosineSim = (normUser * normRoom > 0) ? (dotProduct / (normUser * normRoom)) : 0;

    let distSq = 0;
    for (const b of userBssids) {
      const uSig = userMap[b];
      const rSig = roomMap[b] || 0;
      distSq += (uSig - rSig) * (uSig - rSig);
    }
    const euclideanDist = Math.sqrt(distSq);

    const rawScore = (overlapCount * 18) + (cosineSim * 45) + Math.max(0, 35 - euclideanDist * 0.25);
    const confidenceScore = Math.min(99.9, Math.max(1.0, Math.round(rawScore * 10) / 10));

    scoredRooms.push({
      room: entry.room,
      building: entry.building,
      floor: entry.floor,
      description: entry.description,
      confidence_score: confidenceScore,
      metrics: {
        common_bssids: overlapCount,
        cosine_sim: Math.round(cosineSim * 10000) / 10000,
        euclidean_dist: Math.round(euclideanDist * 100) / 100
      }
    });
  }

  scoredRooms.sort((a, b) => {
    if (b.metrics.common_bssids !== a.metrics.common_bssids) {
      return b.metrics.common_bssids - a.metrics.common_bssids;
    }
    if (b.metrics.cosine_sim !== a.metrics.cosine_sim) {
      return b.metrics.cosine_sim - a.metrics.cosine_sim;
    }
    return a.metrics.euclidean_dist - b.metrics.euclidean_dist;
  });

  const uniqueTopRooms = [];
  const seenRooms = new Set();
  for (const r of scoredRooms) {
    const cleanRoomNum = String(r.room).replace(/[^0-9]/g, '');
    const key = cleanRoomNum || r.room.toLowerCase();
    if (!seenRooms.has(key)) {
      seenRooms.add(key);
      uniqueTopRooms.push(r);
    }
    if (uniqueTopRooms.length >= 3) break;
  }

  return {
    success: true,
    total_candidates_evaluated: scoredRooms.length,
    predictions: {
      most_probable: uniqueTopRooms[0] ? {
        rank: 1,
        probability_tier: 'HIGH PROBABILITY',
        color: 'RED',
        hexColor: 0xFF3B30,
        ...uniqueTopRooms[0]
      } : null,

      medium_probable: uniqueTopRooms[1] ? {
        rank: 2,
        probability_tier: 'MEDIUM PROBABILITY',
        color: 'ORANGE',
        hexColor: 0xFF9F0A,
        ...uniqueTopRooms[1]
      } : null,

      less_probable: uniqueTopRooms[2] ? {
        rank: 3,
        probability_tier: 'LESS PROBABLE',
        color: 'YELLOW',
        hexColor: 0xFFCC00,
        ...uniqueTopRooms[2]
      } : null
    }
  };
}

// Broadcast alerts to all connected WebSocket clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Process incoming scan payload from ESP32-C6 (Supports /api/sos and /api/locate)
function handleIncomingScan(req, res) {
  const { device_id, student_id, student_name, signals, networks } = req.body;
  const scanData = signals || networks || [];

  if (!scanData || scanData.length === 0) {
    return res.status(400).json({ success: false, error: 'No Wi-Fi signals in payload' });
  }

  const result = locateDevice3Tier(scanData);
  if (!result.success) {
    return res.status(400).json(result);
  }

  const predictions = result.predictions;
  const mostProbable = predictions.most_probable;

  if (!mostProbable) {
    return res.status(404).json({ success: false, error: 'Could not determine location' });
  }

  // Extract clean room IDs for 3D layout matching
  const p1RoomId = String(mostProbable.room).toLowerCase().replace(/[^a-z0-9]/g, '');
  const p2RoomId = predictions.medium_probable ? String(predictions.medium_probable.room).toLowerCase().replace(/[^a-z0-9]/g, '') : null;
  const p3RoomId = predictions.less_probable ? String(predictions.less_probable.room).toLowerCase().replace(/[^a-z0-9]/g, '') : null;

  const nearestGuard = findNearestGuard(p1RoomId);

  const alertPayload = {
    id: 'A' + String(alertSeq++).padStart(3, '0'),
    deviceId: device_id || student_id || 'ESP32_C6_ZERO',
    studentName: student_name || 'ESP32 Geolocation Scan',
    predictions: predictions,
    primaryRoomId: p1RoomId,
    primaryRoomName: `Room ${mostProbable.room}`,
    confidence: mostProbable.confidence_score,
    nearestGuard: nearestGuard || null,
    status: 'ACTIVE',
    createdAt: Date.now()
  };

  // Set responding guard status
  if (nearestGuard) {
    const guard = guards.find(g => g.id === nearestGuard.id);
    if (guard) {
      guard.status = 'responding';
      guard.lastSeen = Date.now();
      broadcast({ type: 'GUARD_UPDATE', guards });
    }
  }

  alerts.unshift(alertPayload);

  // Broadcast 3-Tier Probability Event to 3D Floor Map WebClients
  broadcast({ type: 'PROBABILITY_ALERT_3TIER', alert: alertPayload });

  // Log scan event to Supabase in background
  const resolvedStr = `Room ${mostProbable.room} (${mostProbable.building} Fl ${mostProbable.floor})`;
  logEventToSupabase(alertPayload.deviceId, { signals: scanData }, resolvedStr, mostProbable.confidence_score);

  res.json({
    success: true,
    device_id: alertPayload.deviceId,
    timestamp: new Date().toISOString(),
    predictions: predictions,
    alert: alertPayload
  });
}

// HTTP API Endpoints for ESP32-C6 & Clients
app.post('/api/locate', handleIncomingScan);
app.post('/api/sos', handleIncomingScan);

// HTTP API: Get all alerts (queries Supabase for Serverless persistence)
app.get('/api/alerts', async (req, res) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/sos_events?order=id.desc&limit=15`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const supabaseAlerts = data.map((ev, idx) => {
          const scanSignals = ev.scan_data ? (ev.scan_data.signals || ev.scan_data.networks || []) : [];
          const evalRes = locateDevice3Tier(scanSignals);
          const predictions = evalRes.success ? evalRes.predictions : null;
          const mostProbable = predictions ? predictions.most_probable : null;

          const rawRoom = ev.resolved_room || (mostProbable ? mostProbable.room : '414b');
          const cleanRoomId = String(rawRoom).toLowerCase().replace(/[^a-z0-9]/g, '');

          const isResolved = ev.status && String(ev.status).toLowerCase() === 'resolved';

          return {
            id: 'S' + String(ev.id).padStart(3, '0'),
            deviceId: ev.device_id || 'ESP32_C6_ZERO',
            studentName: 'Student (Button Press)',
            predictions: predictions,
            primaryRoomId: cleanRoomId,
            primaryRoomName: ev.resolved_room ? (ev.resolved_room.startsWith('Room') ? ev.resolved_room : `Room ${ev.resolved_room}`) : (mostProbable ? `Room ${mostProbable.room}` : 'Room 414b'),
            confidence: ev.confidence || (mostProbable ? mostProbable.confidence_score : 99.9),
            nearestGuard: null,
            status: isResolved ? 'RESOLVED' : 'ACTIVE',
            createdAt: ev.triggered_at ? new Date(ev.triggered_at).getTime() : Date.now()
          };
        });

        // Merge in-memory alerts with Supabase alerts
        const merged = [...alerts];
        for (const sa of supabaseAlerts) {
          if (!merged.some(a => a.id === sa.id)) {
            merged.push(sa);
          }
        }
        return res.json({ alerts: merged });
      }
    }
  } catch (err) {
    console.error('Error fetching Supabase alerts:', err.message);
  }

  res.json({ alerts });
});

// HTTP API: Resolve all active alerts (updates in-memory + Supabase DB)
const handleResolveAll = async (req, res) => {
  const now = Date.now();
  let updatedCount = 0;

  alerts.forEach(a => {
    if (a.status !== 'RESOLVED') {
      a.status = 'RESOLVED';
      a.resolvedAt = now;
      updatedCount++;
    }
  });

  guards.forEach(g => {
    if (g.status === 'responding') {
      g.status = 'available';
      g.lastSeen = now;
    }
  });

  broadcast({ type: 'ALL_ALERTS_RESOLVED', alerts, guards });

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/sos_events?status=neq.resolved`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status: 'resolved' })
    });
  } catch (err) {
    console.error('Supabase resolve all update error:', err.message);
  }

  res.json({ success: true, resolvedCount: updatedCount });
};

app.post('/api/alerts/resolve-all', handleResolveAll);
app.patch('/api/alerts/resolve-all', handleResolveAll);

// HTTP API: Resolve alert (updates in-memory + Supabase DB)
app.patch('/api/alerts/:id/resolve', async (req, res) => {
  const alertId = req.params.id;

  // 1. Update in-memory alert if present
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.status = 'RESOLVED';
    alert.resolvedAt = Date.now();
    if (alert.nearestGuard) {
      const guard = guards.find(g => g.id === alert.nearestGuard.id);
      if (guard && guard.status === 'responding') {
        guard.status = 'available';
        guard.lastSeen = Date.now();
        broadcast({ type: 'GUARD_UPDATE', guards });
      }
    }
    broadcast({ type: 'ALERT_RESOLVED', alert });
  }

  // 2. Persist resolved status to Supabase database
  const numId = parseInt(alertId.replace(/[^0-9]/g, '')) || null;
  if (numId) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/sos_events?id=eq.${numId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'resolved' })
      });
    } catch (err) {
      console.error('Supabase resolve update error:', err.message);
    }
  }

  res.json({ success: true, alertId });
});

// HTTP API: Get all guards
app.get('/api/guards', (req, res) => {
  res.json({ guards });
});

// HTTP API: Update guard status
app.patch('/api/guards/:id/status', (req, res) => {
  const guard = guards.find(g => g.id === req.params.id);
  if (!guard) return res.status(404).json({ error: 'Guard not found' });

  const { status } = req.body;
  if (!['available', 'responding', 'off-duty'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use: available, responding, off-duty' });
  }

  guard.status = status;
  guard.lastSeen = Date.now();
  broadcast({ type: 'GUARD_UPDATE', guards });

  res.json({ success: true, guard });
});

// WebSocket Connection
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'INIT', alerts, guards }));
});

server.listen(PORT, () => {
  console.log(`\n  ╔═════════════════════════════════════════════════════╗`);
  console.log(`  ║   🛡️ CIS Security 3D Floor Map Dashboard          ║`);
  console.log(`  ║   http://localhost:${PORT}                           ║`);
  console.log(`  ╚═════════════════════════════════════════════════════╝\n`);
});
