# 🛡️ WiFi Safety Band — Assistive Safety Band

> A low-power wearable wristband for students. One long press of a button sends an instant SOS alert with your indoor location to campus security.

---

## 📖 What is this?

The **Assistive Safety Band** is a small, affordable wristband that helps students stay safe on campus.

When a student feels unsafe, they **long-press one button** on the band. The device immediately:

1. Scans nearby Wi-Fi signals to find where you are
2. Sends your location to a live security dashboard
3. Alerts campus guards in real time

**No phone needed. No app to open. No GPS required.**

---

## 🎯 Why We Built This

| Problem | Why It Matters |
|---------|---------------|
| **GPS fails indoors** | Dorms, lecture halls, and basements have weak or no satellite signal |
| **Smartphone SOS is too slow** | Unlocking, opening apps, and waiting for GPS takes too long in emergencies |
| **Students walk alone at night** | Real safety risks with no instant alert mechanism |
| **Existing solutions are expensive** | Bulky hardware, complex setup, and pairing required |

Our band solves this with **one button press** — no setup, no apps, no GPS.

---

## 🔧 Hardware

| Component | Purpose |
|-----------|---------|
| **ESP32 Wi-Fi Module** | The brain — scans Wi-Fi BSSIDs and sends data over HTTP |
| **Rechargeable LiPo Battery** | 5–7W capacity for all-day wear |
| **TP4056 USB-C Charging Module** | Easy recharging via USB-C |
| **Tactile Push Button** | Long-press SOS trigger (prevents false alarms from accidental bumps) |
| **Custom Leather Wristband** | Comfortable, durable strap for daily use |

### Why Wi-Fi Instead of GPS?

| Wi-Fi Scanning | GPS |
|----------------|-----|
| Works **instantly** indoors | Takes 30–60 seconds to find satellites |
| Uses **very little battery** | Drains battery quickly |
| Works **inside buildings** | Often fails in dorms and halls |
| **No sky view needed** | Needs clear view of the sky |

---

## ⚙️ How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Long-Press SOS │────▶│  ESP32 Scans     │────▶│  JSON Payload   │
│  Button         │     │  Wi-Fi BSSIDs    │     │  HTTP POST      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Dashboard│◀────│  Supabase Stores │◀────│  Backend        │
│  (3D Floor Map) │     │  Alert           │     │  Resolves Room  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Step-by-Step Flow

1. **Trigger Phase** — Student long-presses the tactile SOS button (prevents false alarms from accidental bumps)
2. **Wi-Fi BSSID Scanning** — ESP32 passively scans 2.4GHz Wi-Fi networks, capturing MAC addresses (BSSIDs) and signal levels — no GPS needed
3. **Packet Transmission** — Scan results formatted as JSON and sent via HTTP POST over campus Wi-Fi directly to backend
4. **Location Resolution** — Backend cross-references BSSIDs against pre-mapped campus lookup table to determine exact building/floor/zone
5. **Live Dashboard Update** — Resolved alert (location, timestamp, student ID) pushed to React monitoring dashboard for security staff

---

## 🖥️ Live Dashboard

Security staff can see all alerts on a real-time web dashboard:

- 🗺️ **3D floor map** — drag, zoom, and pan to see exact building/room
- 📍 **Live alert pins** — shows who, where, and when
- 📊 **Active alerts feed** — list of all ongoing emergencies
- 👮 **Guard status** — see which guards are available

<img width="1393/2" height="798/2" alt="Screenshot 2026-08-25 at 7 47 39 PM" src="https://github.com/user-attachments/assets/143dba48-bdfa-4ec9-bea2-280c72df1cfc" />
<img width="1409/2" height="804/2" alt="Screenshot 2026-08-25 at 7 47 45 PM" src="https://github.com/user-attachments/assets/d3355d8f-6c59-41ed-beba-f3a8b36f1d19" />



🔗 **Live Demo:** [cissecurity3ddashboard.vercel.app](https://cissecurity3ddashboard.vercel.app)

---

## 🛠️ Tech Stack

### Hardware
- ESP32 Wi-Fi microcontroller
- Rechargeable LiPo battery (5–7W)
- TP4056 USB-C charging module
- Tactile push button
- Custom leather wristband

### Firmware
- **Language:** C++ / Arduino Framework
- **Libraries:** `WiFi.h`, `HTTPClient.h`
- **Features:** Low-power idle state logic

### Cloud & Web
- **Frontend:** React.js (3D Interactive Floor Layout)
- **Backend:** Node.js + Express.js
- **Microservice:** FastAPI
- **Database:** Supabase
- **Hosting:** Vercel

---

## 🗄️ Database Schema

### `sos_events`
Stores every SOS alert triggered by a device.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `int8` (PK) | Unique alert ID |
| `device_id` | `text` | Identifier of the triggering device |
| `triggered_at` | `timestamptz` | Exact timestamp of the alert |
| `scan_data` | `jsonb` | Raw Wi-Fi scan results (BSSIDs + signal strengths) |
| `resolved_room` | `text` | Matched room/zone from fingerprint lookup |
| `confidence` | `float8` | Match confidence score |
| `status` | `text` | Alert status (e.g., `active`, `resolved`, `false_alarm`) |

### `wifi_fingerprints`
Pre-mapped Wi-Fi signature database for indoor localization.

| Column | Type | Description |
|--------|------|-------------|
| `Room` | `text` | Room name/number |
| `Building` | `text` | Building identifier |
| `Floor` | `int8` | Floor number |
| `Description` | `text` | Human-readable location description |
| `ScannedAt` | `text` | When the fingerprint was recorded |
| `WiFi_Signals` | `text` | Serialized signal data |
| `bssid` | `text` | Wi-Fi access point MAC address |
| `room_no` | `text` | Room number (alternative) |
| `signal_percent` | `int8` | Signal strength as percentage |
| `building` | `text` | Building name (alternative) |
| `floor` | `text` | Floor label (alternative) |
| `description` | `text` | Additional notes |

<img width="1369" height="767" alt="Screenshot 2026-08-25 at 7 48 26 PM" src="https://github.com/user-attachments/assets/b020ea5d-b61e-49c9-a7cf-d965a41f4a23" />


---

## 📸 Prototype Photos

| Front View | Back View |
|------------|-----------|
| ESP32 + charging module on leather strap | LiPo battery and wiring |

<img width="559/2" height="521/2" alt="Screenshot 2026-08-11 at 8 30 58 PM" src="https://github.com/user-attachments/assets/de64019c-6d3f-4d5e-8ac0-5128ccc8f7b0" />


| Component Layout | Worn on Wrist |
|------------------|---------------|
| Wired integration of all parts | Real-world size and comfort test |

<img width="287" height="795" alt="Screenshot 2026-08-11 at 8 31 08 PM" src="https://github.com/user-attachments/assets/24d18100-b93e-4ed4-8aaf-0fc801d568a4" />


---

## ✅ What's Good About It?

- ⚡ **Super fast** — location shared in under 2 seconds
- 🔋 **Long battery life** — no GPS means the battery lasts much longer
- 👆 **One button** — no phone, no app, no confusion in a panic
- 💰 **Very cheap** — under $15 per unit to build
- 🏫 **Works on campus** — uses existing Wi-Fi, no extra towers needed

---

## 🌍 Impact & Benefits

### Social Impact
- Instant emergency response for students walking alone
- Reduces anxiety and improves sense of campus safety
- Accessible design — no smartphone literacy required
- Empowers vulnerable groups (night-shift students, freshmen)
- Creates data-driven safety insights for campus security

### Economic Impact
- Low per-unit cost enables mass deployment
- Reduces liability costs for universities
- No recurring subscription or cellular fees
- Minimal IT infrastructure investment needed
- Scalable to other institutions with same stack

### Environmental Impact
- Rechargeable LiPo battery reduces e-waste
- Low power consumption vs GPS alternatives
- Minimal hardware — small carbon footprint
- Durable leather strap for long product life
- No disposable batteries or single-use components

---

## ⚠️ Known Limitations

| Problem | Why It Happens | Our Plan to Fix It |
|---------|---------------|-------------------|
| Needs Wi-Fi coverage | Sends data over Wi-Fi | Pre-configure multiple networks; add repeaters in dead zones |
| Only works indoors | No GPS chip yet | Add a small GPS module for outdoor areas |
| First Wi-Fi connection is slow | Needs to handshake with network | Pre-save Wi-Fi passwords on the device |
| Battery could last longer | Device stays partially awake | Add deep-sleep mode (wakes only on button press) |

---

## 🚀 Future Plans

1. **Add GPS fallback** — for outdoor campus areas without Wi-Fi
2. **Deep-sleep mode** — make the battery last days or weeks
3. **Pre-cached Wi-Fi** — store passwords so connection is instant
4. **Smaller design** — custom circuit board to shrink to smartwatch size
5. **Multi-campus kit** — package for any university to deploy easily

---

## 📂 Project Links

| Link | URL |
|------|-----|
| 🔗 GitHub Repo | [github.com/nilabhumeshsingh/wifi-safety-band-](https://github.com/nilabhumeshsingh/wifi-safety-band-) |
| 🌐 Live Dashboard | [cissecurity3ddashboard.vercel.app]([https://cissecurity3ddashboard.vercel.app](https://vibrant-maxwell.vercel.app)) |

---

## 🏆 About This Project

- **Theme:** Open Innovation
- **Event:** International Innovation Challenge 2026
- **Team:** N/A

> *"One Touch. Instant Alert. Real Safety."*

---


