const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3456;
const MAPPINGS_FILE = path.join(__dirname, 'mappings.json');

// Initialize mappings file
if (!fs.existsSync(MAPPINGS_FILE)) {
  fs.writeFileSync(MAPPINGS_FILE, JSON.stringify({ locations: [] }, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Scan WiFi networks using nmcli
app.get('/api/scan', (req, res) => {
  try {
    // Force a fresh rescan
    try {
      execSync('nmcli device wifi rescan', { timeout: 10000 });
    } catch (e) {
      // rescan might fail if too frequent, that's ok
    }
    
    // Wait a moment for scan to complete
    const delay = ms => new Promise(r => setTimeout(r, ms));
    
    // Get scan results
    const output = execSync(
      'nmcli -t -f SSID,BSSID,SIGNAL,CHAN,FREQ,SECURITY device wifi list',
      { encoding: 'utf-8', timeout: 15000 }
    );
    
    const networks = output
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        // nmcli -t mode escapes colons in values as \:
        // Format: SSID:AA\:BB\:CC\:DD\:EE\:FF:SIGNAL:CHAN:FREQ:SECURITY
        // Replace escaped colons with a placeholder, split on real colons, restore
        const tokens = line.replace(/\\:/g, '\x00').split(':').map(t => t.replace(/\x00/g, ':'));
        
        // After this, tokens = [SSID, BSSID_FULL, SIGNAL, CHAN, FREQ, SECURITY]
        // (BSSID is one token because its internal colons were escaped)
        
        if (tokens.length < 6) return null;
        
        const ssid = tokens[0] || '';
        const bssid = (tokens[1] || '').toUpperCase();
        const signal = parseInt(tokens[2]) || 0;
        const channel = parseInt(tokens[3]) || 0;
        const frequency = tokens[4] || '';
        const security = tokens.slice(5).join(' ').trim();
        
        if (!bssid || bssid.length < 17) return null; // Valid MAC = 17 chars (AA:BB:CC:DD:EE:FF)
        
        return { ssid, bssid, signal, channel, frequency, security };
      })
      .filter(n => n !== null)
      .sort((a, b) => b.signal - a.signal);
    
    res.json({ success: true, networks, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Scan error:', error.message);
    res.status(500).json({ success: false, error: 'WiFi scan failed: ' + error.message });
  }
});

// Get all saved mappings
app.get('/api/mappings', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));
    res.json(data);
  } catch (error) {
    res.json({ locations: [] });
  }
});

// Save a new mapping
app.post('/api/mappings', (req, res) => {
  try {
    const { room, building, floor, description, networks } = req.body;
    
    if (!room || !networks || networks.length === 0) {
      return res.status(400).json({ error: 'Room number and at least one network scan required' });
    }
    
    const data = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));
    
    const mapping = {
      id: Date.now(),
      room: room.trim(),
      building: (building || '').trim(),
      floor: (floor || '').trim(),
      description: (description || '').trim(),
      networks: networks.map(n => ({
        ssid: n.ssid,
        bssid: n.bssid,
        signal: n.signal,
        channel: n.channel,
        frequency: n.frequency
      })),
      scannedAt: new Date().toISOString()
    };
    
    data.locations.push(mapping);
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(data, null, 2));
    
    res.json({ success: true, mapping });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save mapping: ' + error.message });
  }
});

// Delete a mapping
app.delete('/api/mappings/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));
    const id = parseInt(req.params.id);
    data.locations = data.locations.filter(l => l.id !== id);
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});

// Export mappings as CSV (Compact Key-Value format without 0 entries)
app.get('/api/export/csv', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));
    
    let csv = 'Room,Building,Floor,Description,ScannedAt,WiFi_Signals\n';
    
    for (const loc of data.locations) {
      // Convert networks array to key-value string: "BSSID:Signal%; BSSID:Signal%"
      const signalsKv = loc.networks
        .map(net => `${net.bssid}:${net.signal}%`)
        .join('; ');
      
      const row = [
        `"${loc.room}"`,
        `"${loc.building}"`,
        `"${loc.floor}"`,
        `"${loc.description}"`,
        `"${loc.scannedAt}"`,
        `"${signalsKv}"`
      ];
      
      csv += row.join(',') + '\n';
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=wifi-mappings.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export for SOS backend (BSSID -> location lookup)
app.get('/api/export/sos', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));
    const lookup = {};
    
    for (const loc of data.locations) {
      for (const net of loc.networks) {
        // Keep the mapping with the strongest signal for each BSSID
        if (!lookup[net.bssid] || net.signal > lookup[net.bssid].signal) {
          lookup[net.bssid] = {
            bssid: net.bssid,
            room: loc.room,
            building: loc.building,
            floor: loc.floor,
            description: loc.description,
            signal: net.signal
          };
        }
      }
    }
    
    res.json({
      generated_at: new Date().toISOString(),
      total_aps: Object.keys(lookup).length,
      ap_locations: Object.values(lookup).map(({ signal, ...rest }) => rest)
    });
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Load all room fingerprints from CSV and mappings.json
function getAllRoomFingerprints() {
  const fingerprints = [];

  // 1. Load from CSV if present
  const csvPath = path.join(__dirname, '../wifi-mappings(8).csv');
  if (fs.existsSync(csvPath)) {
    try {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Parse CSV row respecting quotes: "room","building","floor","desc","scannedAt","wifi_signals"
        const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
        const matches = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          matches.push(match[1] !== undefined ? match[1] : match[2]);
        }
        if (matches.length >= 6) {
          const room = matches[0] || '';
          const building = matches[1] || '';
          const floor = matches[2] || '';
          const description = matches[3] || '';
          const wifiStr = matches[5] || '';
          
          const networks = {};
          if (wifiStr) {
            wifiStr.split(';').forEach(item => {
              item = item.trim();
              if (!item) return;
              const parts = item.split(':');
              if (parts.length >= 7) {
                const bssid = parts.slice(0, 6).join(':').toUpperCase();
                const sig = parseInt(parts[6].replace('%', '')) || 0;
                networks[bssid] = sig;
              }
            });
          }

          if (Object.keys(networks).length > 0) {
            fingerprints.push({ room, building, floor, description, networks, source: 'csv' });
          }
        }
      }
    } catch (e) {
      console.error('Error loading CSV fingerprints:', e.message);
    }
  }

  // 2. Load from mappings.json
  if (fs.existsSync(MAPPINGS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));
      if (data.locations && Array.isArray(data.locations)) {
        for (const loc of data.locations) {
          const networks = {};
          if (loc.networks && Array.isArray(loc.networks)) {
            loc.networks.forEach(net => {
              if (net.bssid) {
                networks[net.bssid.toUpperCase()] = parseInt(net.signal) || 0;
              }
            });
          }
          if (Object.keys(networks).length > 0) {
            fingerprints.push({
              room: loc.room,
              building: loc.building || '',
              floor: loc.floor || '',
              description: loc.description || '',
              networks,
              source: 'json'
            });
          }
        }
      }
    } catch (e) {
      console.error('Error loading JSON fingerprints:', e.message);
    }
  }

  return fingerprints;
}

// 3-Tier Probability Vector Matching Algorithm
function locateDevice(userSignals) {
  // Normalize userSignals into map: { BSSID: signal_percent }
  const userMap = {};
  if (Array.isArray(userSignals)) {
    userSignals.forEach(item => {
      if (item.bssid) {
        userMap[item.bssid.toUpperCase()] = parseInt(item.signal) || 0;
      }
    });
  } else if (typeof userSignals === 'object' && userSignals !== null) {
    Object.keys(userSignals).forEach(bssid => {
      userMap[bssid.toUpperCase()] = parseInt(userSignals[bssid]) || 0;
    });
  }

  const userBssids = Object.keys(userMap);
  if (userBssids.length === 0) {
    return { success: false, error: 'No valid BSSIDs provided in scan payload' };
  }

  const dataset = getAllRoomFingerprints();
  const scoredRooms = [];

  const normUser = Math.sqrt(Object.values(userMap).reduce((acc, v) => acc + v * v, 0));

  for (const entry of dataset) {
    const roomMap = entry.networks;
    const roomBssids = Object.keys(roomMap);
    
    // Find common BSSIDs
    const commonBssids = userBssids.filter(b => roomBssids.includes(b));
    const overlapCount = commonBssids.length;

    // Union of all BSSIDs for Cosine Similarity
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

    // Calculate Euclidean distance across user BSSIDs
    let distSq = 0;
    for (const b of userBssids) {
      const uSig = userMap[b];
      const rSig = roomMap[b] || 0;
      distSq += (uSig - rSig) * (uSig - rSig);
    }
    const euclideanDist = Math.sqrt(distSq);

    // Confidence Score Calculation (0 - 100%)
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

  // Sort descending by common_bssids, then cosine_sim, then euclidean_dist
  scoredRooms.sort((a, b) => {
    if (b.metrics.common_bssids !== a.metrics.common_bssids) {
      return b.metrics.common_bssids - a.metrics.common_bssids;
    }
    if (b.metrics.cosine_sim !== a.metrics.cosine_sim) {
      return b.metrics.cosine_sim - a.metrics.cosine_sim;
    }
    return a.metrics.euclidean_dist - b.metrics.euclidean_dist;
  });

  // Extract Top 3 Unique Rooms
  const uniqueTopRooms = [];
  const seenRooms = new Set();
  for (const r of scoredRooms) {
    const key = `${r.building}-${r.floor}-${r.room}`.toLowerCase();
    if (!seenRooms.has(key)) {
      seenRooms.add(key);
      uniqueTopRooms.push(r);
    }
    if (uniqueTopRooms.length >= 3) break;
  }

  const top3 = {
    most_probable: uniqueTopRooms[0] ? {
      rank: 1,
      probability_tier: 'MOST PROBABLE (HIGH)',
      ...uniqueTopRooms[0]
    } : null,

    medium_probable: uniqueTopRooms[1] ? {
      rank: 2,
      probability_tier: 'MEDIUM PROBABLE',
      ...uniqueTopRooms[1]
    } : null,

    less_probable: uniqueTopRooms[2] ? {
      rank: 3,
      probability_tier: 'LESS PROBABLE',
      ...uniqueTopRooms[2]
    } : null
  };

  return {
    success: true,
    total_candidates_evaluated: scoredRooms.length,
    predictions: top3
  };
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
      status: 'resolved'
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
      console.error('Supabase logging failed:', response.statusText);
    }
  } catch (err) {
    console.error('Supabase async log error:', err.message);
  }
}

// Geolocation endpoint for ESP32-C6 / IoT Devices / API Clients
app.post('/api/locate', (req, res) => {
  try {
    const { device_id, signals } = req.body;

    if (!signals || (Array.isArray(signals) && signals.length === 0)) {
      return res.status(400).json({ success: false, error: 'No Wi-Fi signals provided in request body' });
    }

    const result = locateDevice(signals);
    const devId = device_id || 'ESP32_C6_DEVICE';
    result.device_id = devId;
    result.timestamp = new Date().toISOString();

    // Log event to Supabase in background
    const mostProbable = result.predictions && result.predictions.most_probable;
    const resolvedStr = mostProbable ? `${mostProbable.room} (${mostProbable.building} Fl ${mostProbable.floor})` : 'Unknown';
    const confScore = mostProbable ? mostProbable.confidence_score : 0;

    logEventToSupabase(devId, { signals }, resolvedStr, confScore);

    res.json(result);
  } catch (error) {
    console.error('Locate API Error:', error);
    res.status(500).json({ success: false, error: 'Geolocation calculation failed: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n  ╔═══════════════════════════════════════════╗`);
  console.log(`  ║   📡 WiFi Signal Mapper                  ║`);
  console.log(`  ║   http://localhost:${PORT}                 ║`);
  console.log(`  ║                                           ║`);
  console.log(`  ║   Walk around campus, scan & map signals  ║`);
  console.log(`  ╚═══════════════════════════════════════════╝\n`);
});
