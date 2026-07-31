# 🛡️ Assistive Safety Band

> **Low-Power Campus Wearable for One-Touch Emergency Alert & Wi-Fi BSSID Indoor Localization**

The **Assistive Safety Band** is a low-power wearable that gives students instant, one-touch access to emergency help using Wi-Fi-based indoor localization. A single long-press on the SOS button triggers real-time location sharing to a monitoring dashboard — no GPS, no app, no setup.

---

## 📌 Description

The **Assistive Safety Band** is an accessible, pocket-friendly wearable designed to give university students peace of mind while walking across campus — especially indoors, in dorms, and in academic buildings where GPS is slow or unreliable. Equipped with a long-press SOS trigger and instant Wi-Fi BSSID localization, the band dispatches real-time location telemetry directly to a central monitoring web dashboard the moment an emergency is signaled.

Our prototype solves this with a dedicated, low-power **ESP-based wearable band** that does one job extremely well: sound the alarm and share location, instantly, with nothing to unlock or configure.

When a student **long-presses** the SOS button:

1. **Instant Localization** — The board passively scans nearby 2.4GHz Wi-Fi Access Points (`BSSIDs` signal levels) in under two seconds.
2. **Direct Dispatch** — The scan results are sent directly over Wi-Fi to a backend (Node.js/Express + FastAPI), which cross-references the BSSIDs against a pre-built campus lookup table to resolve the exact building/floor/zone.
3. **Live Alert** — The resolved location and alert status appear in real time on a React-based monitoring dashboard.

The device is built around **Wi-Fi positioning (Wi-Fi BSSID scanning)** rather than GPS. This is a deliberate design choice for a campus environment: a GPS cold start can take 30–60 seconds and drains tiny wearable batteries quickly, and GPS signal is frequently lost entirely indoors — inside dorms, lecture halls, and multi-story academic buildings. Passive Wi-Fi scanning, by contrast, uses a fraction of the power of a GPS module and resolves location almost instantly, even deep inside a building, because it only needs to "hear" nearby access points rather than lock onto satellites. This is why the band can realistically run for extended periods on a small LiPo cell while still delivering fast, indoor-accurate location the moment it's needed.

---

## 🛠️ Components

### Hardware Components

| Component | Details |
|---|---|
| **Microcontroller** | ESP Wi-Fi Module *(model: ESP32)* |
| **Input Trigger** | Tactile push button, configured for **long-press SOS activation** (prevents accidental triggers from a brief bump) |
| **Power Source** | Rechargeable LiPo battery, 5–7W capacity |
| **Charging** | USB-C / TP4056 charge controller *(confirm if used)* |
| **Enclosure** | Pocket-clip form factor |


### Software & Cloud Infrastructure

* **Firmware Runtime:** C++ / Arduino Framework for ESP
* **Frontend Dashboard:** React.js, HTML5, CSS3, JavaScript (ES6+)
* **Backend Services:** Node.js + Express.js, and FastAPI
* **Database:** Supabase

---

## ⚙️ Working

The device operates in a low-power idle state to conserve battery, and only becomes active when the SOS button is engaged.

**Data Flow:**

```
Long-press SOS button
        ↓
ESP module scans nearby Wi-Fi BSSIDs 
        ↓
Data packaged as JSON, sent via HTTP POST over Wi-Fi
        ↓
Backend (Node.js/Express + FastAPI) receives payload
        ↓
BSSIDs cross-referenced against campus BSSID lookup table
        ↓
Resolved location stored in Supabase
        ↓
React dashboard updates in real time with the alert + location
```

1. **Trigger Phase** — The student long-presses the tactile SOS button. A long-press (rather than a single tap) is used deliberately to avoid false alarms from accidental contact in a pocket or bag.
2. **Wi-Fi BSSID Scanning** — Instead of a power-hungry GPS lock, the ESP module runs a passive scan of surrounding Wi-Fi networks, capturing MAC addresses (BSSIDs)
3. **Packet Transmission** — The band formats the scan results into a JSON payload and sends an HTTP POST request to the backend.
4. **Location Resolution** — The backend matches the received BSSIDs against a pre-mapped lookup table of known campus access points to determine the student's building/zone.
5. **Live Dashboard Update** — The resolved alert (location, timestamp, student identifier) is pushed to the monitoring dashboard for campus security/response staff to view.

### Libraries Used

> *[TODO — list your firmware `#include` libraries here once finalized, e.g. `WiFi.h`, `HTTPClient.h`, `ArduinoJson.h`]*

```cpp
// Example placeholder — replace with actual includes
#include <WiFi.h>
// #include <HTTPClient.h>
// #include <ArduinoJson.h>
```

### Localization Method

Location is resolved entirely via a **Wi-Fi BSSID lookup table** — a pre-built database mapping known campus access point BSSIDs to physical locations (building, floor, or zone). This prototype is **purely indoor-focused**, with no GPS fallback for outdoor use in this version.

### Website / Dashboard

* **Frontend:** Built with React.js. *[TODO — note any UI/map library used, e.g. Tailwind, Leaflet, Mapbox]*
* **Backend:** Node.js/Express and FastAPI handle request routing, BSSID-to-location resolution, and communication with Supabase.
* **Database:** Supabase stores alert records, resolved locations, and timestamps.
* **Dashboard Contents:** *[TODO — describe exactly what the dashboard displays during the demo, e.g. live alert list, resolved location/zone, timestamp, student ID, status indicator, map view, etc.]*

### Hardware–Software Integration

The ESP module and the web stack communicate over standard Wi-Fi using HTTP. The hardware side is responsible only for detecting the SOS trigger and collecting nearby BSSID data — all heavier processing (location resolution, storage, and visualization) is offloaded to the backend and dashboard. This keeps the on-device firmware lightweight and power-efficient, which directly supports longer battery life.

---

## ✅ Pros

* **Ultra-Fast Indoor Localization** — BSSID scanning works seamlessly inside multi-story dorms and academic buildings where standard GPS fails or drifts.
* **Low-Power Efficiency** — Eliminates continuous GPS polling, allowing a compact LiPo battery to last significantly longer on a single charge. Wi-Fi passive scanning uses a fraction of the power of a standard GPS module while still resolving location almost instantly.
* **Zero-Friction Usability** — A single long-press of one tactile button triggers the alert — no smartphone unlocking, apps, or pairing required in a high-stress moment.
* **Direct Cloud Communication** — Sends emergency data straight over Wi-Fi without depending on a phone or Bluetooth connectivity.

## ⚠️ Cons

* **Wi-Fi Coverage Dependency** — Requires active campus Wi-Fi coverage or available access points to transmit telemetry data.
* **BSSID Database Dependency** — Geolocation accuracy relies on an up-to-date mapping of campus access points.
* **Initial Wi-Fi Handshake Latency** — First-time network association (especially on unsecured or enterprise Wi-Fi) can add a few seconds of delay if the device isn't pre-configured/pre-connected.
* **Indoor-Only Coverage** — Current version has no GPS fallback, so it is not designed for outdoor/open-campus localization.

---

## 🚧 Future Work

* Add GPS fallback for outdoor localization
* Finalize and document firmware libraries and core loop logic
* Pre-cache Wi-Fi handshake to reduce first-connection latency
*  Implement deep-sleep mode for extended standby battery life

---

## 📄 License

*[TODO — add license, e.g. MIT]*
