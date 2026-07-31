require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend as static files from the sibling directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── Supabase ───────────────────────────────────────────────────────────────
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ─── SSE: connected guard clients ───────────────────────────────────────────
/** @type {Map<number, import('http').ServerResponse>} */
const sseClients = new Map();
let sseClientId = 0;

/**
 * Push a JSON event to every connected SSE client.
 * @param {string} event  - event name
 * @param {object} data   - JSON-serialisable payload
 */
function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients.values()) {
        res.write(payload);
    }
    console.log(`[SSE] broadcast "${event}" to ${sseClients.size} client(s)`);
}

// ─── Math helpers ────────────────────────────────────────────────────────────

/** Cosine similarity between two BSSID→signal maps (0–1) */
function cosineSimilarity(liveMap, roomMap) {
    const allBssids = new Set([...Object.keys(liveMap), ...Object.keys(roomMap)]);
    let dot = 0, liveMag = 0, roomMag = 0;
    for (const bssid of allBssids) {
        const s = liveMap[bssid] || 0;
        const v = roomMap[bssid] || 0;
        dot     += s * v;
        liveMag += s * s;
        roomMag += v * v;
    }
    if (liveMag === 0 || roomMag === 0) return 0;
    return dot / (Math.sqrt(liveMag) * Math.sqrt(roomMag));
}

/** Euclidean distance between two BSSID→signal maps */
function euclideanDist(liveMap, roomMap) {
    const allBssids = new Set([...Object.keys(liveMap), ...Object.keys(roomMap)]);
    let sumSq = 0;
    for (const bssid of allBssids) {
        const diff = (liveMap[bssid] || 0) - (roomMap[bssid] || 0);
        sumSq += diff * diff;
    }
    return Math.sqrt(sumSq);
}

// ─── Room resolution ────────────────────────────────────────────────────────
/**
 * Build a single prediction object in the format the ESP32 expects.
 * Returns null if candidate is falsy.
 */
function buildPrediction(candidate, totalSim) {
    if (!candidate) return null;
    const confidence_score = totalSim
        ? Math.round((candidate.similarity / totalSim) * 1000) / 10
        : 0;
    return {
        room:             candidate.room_no,
        building:         candidate.building || 'AB2',
        floor:            candidate.floor    || '4',
        confidence_score,
        metrics: {
            common_bssids:  candidate.matched_aps,
            cosine_sim:     Math.round(candidate.similarity * 10000) / 10000,
            euclidean_dist: Math.round(candidate.euclidean * 100) / 100
        }
    };
}

/**
 * Resolve a WiFi scan to a 3-tier predictions object.
 * Returns the new ESP32-compatible format plus `top_room` / `confidence` for Supabase.
 */
async function resolveRoom(scanData) {
    const liveBssids = scanData.map(s => s.bssid);
    const liveMap    = Object.fromEntries(scanData.map(s => [s.bssid, s.signal]));

    // 1. Find candidate rooms that share at least one BSSID with the live scan
    const { data: overlapRows, error: err1 } = await supabase
        .from('wifi_fingerprints')
        .select('room_no')
        .in('bssid', liveBssids);

    if (err1) throw err1;

    if (!overlapRows?.length) {
        return {
            top_room: null, confidence: 0,
            predictions: { most_probable: null, medium_probable: null, less_probable: null }
        };
    }

    const candidateRooms = [...new Set(overlapRows.map(r => r.room_no))];

    // 2. Fetch full fingerprint vectors + metadata for candidate rooms
    const { data: fullData, error: err2 } = await supabase
        .from('wifi_fingerprints')
        .select('room_no, bssid, signal_percent, building, floor')
        .in('room_no', candidateRooms);

    if (err2) throw err2;

    // Build per-room vectors and metadata lookup
    const roomVectors = {};
    const roomMeta    = {};
    for (const row of fullData) {
        if (!roomVectors[row.room_no]) roomVectors[row.room_no] = {};
        roomVectors[row.room_no][row.bssid] = row.signal_percent;
        if (!roomMeta[row.room_no]) {
            roomMeta[row.room_no] = {
                building: row.building || 'AB2',
                floor:    row.floor    || '4'
            };
        }
    }

    // 3. Score each candidate
    const scored = candidateRooms.map(room_no => {
        const fp     = roomVectors[room_no];
        const common = Object.keys(fp).filter(b => liveMap[b] !== undefined).length;
        return {
            room_no,
            matched_aps: common,
            similarity:  cosineSimilarity(liveMap, fp),
            euclidean:   euclideanDist(liveMap, fp),
            building:    roomMeta[room_no].building,
            floor:       roomMeta[room_no].floor
        };
    });

    // Require at least 2 common BSSIDs; rank by cosine similarity (descending)
    const ranked   = scored
        .filter(r => r.matched_aps >= 2)
        .sort((a, b) => b.similarity - a.similarity);

    const totalSim = ranked.reduce((sum, r) => sum + r.similarity, 0);

    const [first, second, third] = ranked;

    const predictions = {
        most_probable:   buildPrediction(first,  totalSim),
        medium_probable: buildPrediction(second, totalSim),
        less_probable:   buildPrediction(third,  totalSim)
    };

    return {
        top_room:   predictions.most_probable?.room       || null,
        confidence: predictions.most_probable?.confidence_score || 0,
        predictions
    };
}

// ─── SSE endpoint ────────────────────────────────────────────────────────────
app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type',      'text/event-stream');
    res.setHeader('Cache-Control',     'no-cache');
    res.setHeader('Connection',        'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const id = ++sseClientId;
    sseClients.set(id, res);
    console.log(`[SSE] client #${id} connected (total: ${sseClients.size})`);

    res.write(`event: connected\ndata: {"message":"SSE stream active","clientId":${id}}\n\n`);

    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25_000);

    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(id);
        console.log(`[SSE] client #${id} disconnected (total: ${sseClients.size})`);
    });
});

// ─── GET /api/sos/active ─────────────────────────────────────────────────────
app.get('/api/sos/active', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sos_events')
            .select('*')
            .in('status', ['open', 'acknowledged'])
            .order('triggered_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        res.json({ success: true, events: data });
    } catch (err) {
        console.error('[GET /api/sos/active]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/locate ────────────────────────────────────────────────────────
// ESP32-C6 Zero posts here on long-press of GPIO 20.
// Payload: { device_id: string, signals: [{ bssid, signal, ssid?, channel? }] }
app.post('/api/locate', async (req, res) => {
    try {
        const { device_id, signals, scan } = req.body;
        const scanData = signals || scan;   // accept either key

        if (!device_id || !Array.isArray(scanData) || scanData.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'device_id and signals[] are required'
            });
        }

        // Resolve room from WiFi fingerprints
        const result = await resolveRoom(scanData);

        const { top_room, confidence, predictions } = result;
        console.log(`[locate] ${device_id} → room ${top_room} (${confidence}%)`);
        if (predictions.most_probable) {
            const m = predictions.most_probable;
            console.log(`   🥇 ${m.room} | cosine=${m.metrics.cosine_sim} | euc=${m.metrics.euclidean_dist}`);
        }

        // ── Persist SOS event ────────────────────────────────────────────────
        const { data, error } = await supabase
            .from('sos_events')
            .insert({
                device_id,
                scan_data:     scanData,
                resolved_room: top_room,
                confidence,
                status:        'open'
            })
            .select()
            .single();

        if (error) throw error;

        // ── Broadcast to guard dashboards via SSE ────────────────────────────
        broadcast('sos', {
            id:            data.id,
            device_id:     data.device_id,
            resolved_room: top_room,
            confidence,
            building:      predictions.most_probable?.building || null,
            floor:         predictions.most_probable?.floor    || null,
            status:        data.status,
            created_at:    data.triggered_at,
            predictions
        });

        // ── Return ESP32-compatible response ─────────────────────────────────
        res.status(201).json({
            success: true,
            predictions,
            event: data
        });

    } catch (err) {
        console.error('[POST /api/locate]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── PATCH /api/sos/:id/acknowledge ─────────────────────────────────────────
app.patch('/api/sos/:id/acknowledge', async (req, res) => {
    const { id } = req.params;

    if (String(id).startsWith('sim-')) {
        broadcast('sos_update', { id, status: 'acknowledged' });
        return res.json({ success: true, simulated: true });
    }

    try {
        const { data, error } = await supabase
            .from('sos_events')
            .update({ status: 'acknowledged' })
            .eq('id', id)
            .select();

        if (error) throw error;
        broadcast('sos_update', { id, status: 'acknowledged' });
        res.json({ success: true, event: data?.[0] || null });
    } catch (err) {
        console.error('[PATCH acknowledge]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── PATCH /api/sos/:id/resolve ──────────────────────────────────────────────
app.patch('/api/sos/:id/resolve', async (req, res) => {
    const { id } = req.params;

    if (String(id).startsWith('sim-')) {
        broadcast('sos_update', { id, status: 'resolved' });
        return res.json({ success: true, simulated: true });
    }

    try {
        const { data, error } = await supabase
            .from('sos_events')
            .update({ status: 'resolved' })
            .eq('id', id)
            .select();

        if (error) throw error;
        broadcast('sos_update', { id, status: 'resolved' });
        res.json({ success: true, event: data?.[0] || null });
    } catch (err) {
        console.error('[PATCH resolve]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', clients: sseClients.size, ts: new Date().toISOString() })
);

app.get('/', (_req, res) =>
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'))
);

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3456;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚨 SOS Backend running on http://0.0.0.0:${PORT}`);
    console.log(`   Frontend served at http://localhost:${PORT}`);
    console.log(`   SSE stream:      http://localhost:${PORT}/api/stream`);
    console.log(`   POST endpoint:   http://localhost:${PORT}/api/locate`);
    console.log(`   (ESP32 → POST to http://<this-machine-IP>:${PORT}/api/locate)\n`);
});