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

// Predict closest room based on BSSID & signal strength
function predictRoomFromScan(scanNetworks) {
  const locations = loadMappings();
  if (!locations || locations.length === 0) return null;

  let bestMatch = null;
  let highestScore = -1;

  for (const loc of locations) {
    let matchScore = 0;
    let totalWeight = 0;

    const locBssidMap = {};
    for (const net of loc.networks) {
      locBssidMap[net.bssid] = net.signal;
    }

    for (const scanNet of scanNetworks) {
      const bssid = scanNet.bssid.toUpperCase();
      const signal = scanNet.signal;

      if (locBssidMap[bssid] !== undefined) {
        const storedSignal = locBssidMap[bssid];
        // Calculate similarity (100 - absolute difference in signal)
        const diff = Math.abs(storedSignal - signal);
        const similarity = Math.max(0, 100 - diff);
        matchScore += similarity * (signal / 100);
        totalWeight += signal / 100;
      }
    }

    const confidence = totalWeight > 0 ? (matchScore / totalWeight) : 0;
    if (confidence > highestScore) {
      highestScore = confidence;
      bestMatch = {
        room: loc.room,
        building: loc.building,
        floor: loc.floor,
        confidence: Math.round(confidence)
      };
    }
  }

  return bestMatch;
}

// Broadcast alerts to all connected WebSocket clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// HTTP API: Incoming ESP32 Alert Endpoint
app.post('/api/sos', (req, res) => {
  const { student_id, student_name, bssid, rssi, networks } = req.body;

  let room = req.body.room;
  let confidence = 100;

  // If ESP32 sends a list of scanned networks, run KNN matching
  if (networks && Array.isArray(networks) && networks.length > 0) {
    const match = predictRoomFromScan(networks);
    if (match) {
      room = match.room;
      confidence = match.confidence;
    }
  } else if (bssid) {
    // Fallback: lookup single BSSID
    const locations = loadMappings();
    for (const loc of locations) {
      if (loc.networks.some(n => n.bssid.toUpperCase() === bssid.toUpperCase())) {
        room = loc.room;
        break;
      }
    }
  }

  if (!room) room = '418'; // Fallback room if unknown

  const newAlert = {
    id: 'A' + String(alertSeq++).padStart(3, '0'),
    roomId: String(room).toLowerCase().replace(/\s+/g, '-'),
    roomName: `Room ${room}`,
    studentId: student_id || 'ESP32_DEVICE',
    studentName: student_name || 'Student in Distress',
    confidence: confidence,
    status: 'ACTIVE',
    createdAt: Date.now(),
    resolvedAt: null
  };

  alerts.unshift(newAlert);
  broadcast({ type: 'NEW_ALERT', alert: newAlert });

  res.json({ success: true, alert: newAlert });
});

// HTTP API: Get all alerts
app.get('/api/alerts', (req, res) => {
  res.json({ alerts });
});

// HTTP API: Resolve alert
app.patch('/api/alerts/:id/resolve', (req, res) => {
  const alert = alerts.find(a => a.id === req.params.id);
  if (alert) {
    alert.status = 'RESOLVED';
    alert.resolvedAt = Date.now();
    broadcast({ type: 'ALERT_RESOLVED', alert });
    res.json({ success: true, alert });
  } else {
    res.status(404).json({ error: 'Alert not found' });
  }
});

// WebSocket Connection
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'INIT', alerts }));
});

server.listen(PORT, () => {
  console.log(`\n  ╔═════════════════════════════════════════════════════╗`);
  console.log(`  ║   🛡️ NightGuard 3D Floor Map Dashboard            ║`);
  console.log(`  ║   http://localhost:${PORT}                           ║`);
  console.log(`  ╚═════════════════════════════════════════════════════╝\n`);
});
