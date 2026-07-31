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

let alerts = [];
let alertSeq = 1;

const roomCoords = {
    '401': { x: -20, z: -12.5 },
    '402': { x: -11, z: -12.5 },
    '403': { x: 11, z: -12.5 },
    '404': { x: 19.5, z: -12.5 },
    '430': { x: -17.5, z: -6.5 },
    '429': { x: -17.5, z: -3.0 },
    '428': { x: -17.5, z: 0.5 },
    '427': { x: -17.5, z: 4.5 },
    'gw': { x: -17.5, z: 9.2 },
    'faculty-e': { x: 17.5, z: -6.5 },
    '408': { x: 17.5, z: -3.0 },
    '409': { x: 17.5, z: 0.5 },
    '410': { x: 17.5, z: 4.5 },
    'mw': { x: 24.5, z: 4.5 },
    '420': { x: -8.5, z: 4.5 },
    '419': { x: -2.8, z: 4.5 },
    '418': { x: 2.8, z: 4.5 },
    '417': { x: 8.5, z: 4.5 },
    'st-w': { x: -20.5, z: 15 },
    '423': { x: -15.5, z: 15 },
    '422': { x: -10.2, z: 15 },
    '421': { x: -5.0, z: 15 },
    '416': { x: 11.5, z: 15.0 },
    '415': { x: 18.2, z: 15.0 },
    '414': { x: 24.9, z: 15.0 },
    'courtyard': { x: 0, z: 0 }
};

let guards = [
    { id: 'G1', name: 'Raj Kumar', assignedRoom: '402', status: 'available', lastSeen: Date.now() },
    { id: 'G2', name: 'Vikram Singh', assignedRoom: '409', status: 'available', lastSeen: Date.now() },
    { id: 'G3', name: 'Anil Sharma', assignedRoom: '420', status: 'available', lastSeen: Date.now() },
    { id: 'G4', name: 'Suresh Yadav', assignedRoom: '427', status: 'available', lastSeen: Date.now() },
    { id: 'G5', name: 'Deepak Verma', assignedRoom: '416', status: 'off-duty', lastSeen: Date.now() },
    { id: 'G6', name: 'Manoj Patel', assignedRoom: 'courtyard', status: 'available', lastSeen: Date.now() }
];

function roomDistance(roomA, roomB) {
    const a = roomCoords[roomA];
    const b = roomCoords[roomB];
    if (!a || !b) return Infinity;
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.z - b.z, 2));
}

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

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

app.post('/api/sos', (req, res) => {
    let room = req.body.room || '418';
    const roomId = String(room).toLowerCase().replace(/\s+/g, '-');
    const nearestGuard = findNearestGuard(roomId);

    const newAlert = {
        id: 'A' + String(alertSeq++).padStart(3, '0'),
        roomId: roomId,
        roomName: `Room ${room}`,
        studentName: req.body.student_name || 'Student Emergency',
        nearestGuard: nearestGuard || null,
        status: 'ACTIVE',
        createdAt: Date.now()
    };

    if (nearestGuard) {
        const guard = guards.find(g => g.id === nearestGuard.id);
        if (guard) {
            guard.status = 'responding';
            broadcast({ type: 'GUARD_UPDATE', guards });
        }
    }

    alerts.unshift(newAlert);
    broadcast({ type: 'NEW_ALERT', alert: newAlert });
    res.json({ success: true, alert: newAlert });
});

app.get('/api/alerts', (req, res) => res.json({ alerts }));
app.get('/api/guards', (req, res) => res.json({ guards }));

app.patch('/api/alerts/:id/resolve', (req, res) => {
    const alert = alerts.find(a => a.id === req.params.id);
    if (alert) {
        alert.status = 'RESOLVED';
        if (alert.nearestGuard) {
            const guard = guards.find(g => g.id === alert.nearestGuard.id);
            if (guard && guard.status === 'responding') {
                guard.status = 'available';
                broadcast({ type: 'GUARD_UPDATE', guards });
            }
        }
        broadcast({ type: 'ALERT_RESOLVED', alert });
        res.json({ success: true, alert });
    } else {
        res.status(404).json({ error: 'Alert not found' });
    }
});

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'INIT', alerts, guards }));
});

server.listen(PORT, () => {
    console.log(`\n  ╔═════════════════════════════════════════════════════╗`);
    console.log(`  ║   🛡️ CIS Security 3D Floor Map Dashboard          ║`);
    console.log(`  ║   http://localhost:${PORT}                           ║`);
    console.log(`  ╚═════════════════════════════════════════════════════╝\n`);
});