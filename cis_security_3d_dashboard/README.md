# 🛡️ CIS Security 3D Vector Map Dashboard & Geolocation Engine

This package contains the complete, self-contained **3D Geolocation Dashboard**, **Node.js Web Server**, **Supabase Event Logger**, **Serial Bridge**, and **ESP32 Firmware**.

---

## 📁 Package Structure

- **`public/`**: Frontend 3D Vector Floor Map UI (`index.html`, `app3d.js`, `style.css`, Three.js canvas).
- **`server.js`**: Node.js server with Express + WebSockets + 3-Tier Room Probability Vector Matching + Supabase Integration.
- **`data/`**: Signal fingerprint datasets (`mappings.json`, `wifi-mappings(8).csv`).
- **`serial_bridge.py`**: Local Python bridge to auto-forward ESP32 USB scan logs to the server.
- **`esp32_firmware/`**: ESP32-C6 Zero C++ sketch with button trigger & USBSerial output.

---

## 🚀 How to Run Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the 3D Dashboard Server**:
   ```bash
   npm start
   ```
   Open **http://localhost:3000** in your browser.

3. **Start the Serial USB Bridge** (for ESP32 hardware):
   ```bash
   python3 serial_bridge.py
   ```

---

## 🌐 How to Host on Cloud (Render, Railway, Heroku, VPS)

1. Upload or push this folder to your Git repository (GitHub/GitLab).
2. Set Build Command: `npm install`
3. Set Start Command: `node server.js`
4. Environment Variable (Optional): `PORT` (defaults to 3000 if not specified).

---

## 🔌 API Endpoints

- `GET /` — Serves 3D Interactive Floor Map Dashboard.
- `POST /api/sos` — Accepts Wi-Fi scan payload, calculates 3-tier probability rooms, logs to Supabase, and broadcasts 3D lights via WebSockets.
- `GET /api/alerts` — Returns all active SOS alerts.
- `PATCH /api/alerts/:id/resolve` — Resolves an alert and frees assigned guard.
- `GET /api/guards` — Returns security guard roster.
