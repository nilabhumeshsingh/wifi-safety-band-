# 🛡️ Assistive Safety Band

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

## 🎯 Why we built this

- **GPS doesn't work well indoors** — dorms, lecture halls, and basements block satellite signals
- **Using a phone in an emergency is slow** — you have to unlock it, open an app, and wait for GPS
- **Students walk alone at night** and need a fast, simple way to call for help
- **Existing solutions are expensive** or need complex setup

Our band solves this with **one button press**.

---

## 🔧 What's inside the band?

| Part | What it does |
|------|-------------|
| **ESP32** | The brain — scans Wi-Fi and sends data over the internet |
| **LiPo Battery** | Rechargeable battery that powers the device |
| **TP4056 Charging Module** | Lets you charge the battery with USB-C |
| **SOS Button** | Long-press to trigger an emergency alert |
| **Leather Strap** | Comfortable wristband to wear all day |

---

## ⚙️ How it works

```
Student long-presses SOS button
        ↓
ESP32 quickly scans nearby Wi-Fi networks (BSSIDs)
        ↓
Device sends Wi-Fi data to our cloud server
        ↓
Server matches Wi-Fi signals to a campus map
        ↓
Exact location appears on the security dashboard instantly
```

### Why Wi-Fi instead of GPS?

| Wi-Fi Scanning | GPS |
|---------------|-----|
| Works **instantly** indoors | Takes 30–60 seconds to find satellites |
| Uses **very little battery** | Drains battery quickly |
| Works **inside buildings** | Often fails in dorms and halls |
| **No sky view needed** | Needs clear view of the sky |

---

## 🖥️ Live Dashboard

Security staff can see all alerts on a real-time web dashboard:

- 🗺️ **3D floor map** — drag, zoom, and pan to see exact building/room
- 📍 **Live alert pins** — shows who, where, and when
- 📊 **Active alerts feed** — list of all ongoing emergencies
- 👮 **Guard status** — see which guards are available

🔗 **Live Demo:** [cissecurity3ddashboard.vercel.app](https://cissecurity3ddashboard.vercel.app/)

---

## 🛠️ Tech Stack

### Hardware
- ESP32 Wi-Fi microcontroller
- Rechargeable LiPo battery (5–7W)
- TP4056 USB-C charging module
- Tactile push button
- Custom leather wristband

### Software
- **Firmware:** C++ (Arduino framework)
- **Frontend:** React.js (3D interactive dashboard)
- **Backend:** Node.js + Express.js + FastAPI
- **Database:** Supabase
- **Hosting:** Vercel

---

## 📸 Prototype Photos

| Front View | Back View |
|-----------|-----------|
| ESP32 + charging module on leather strap | LiPo battery and wiring |

| Component Layout | Worn on Wrist |
|-----------------|---------------|
| Wired integration of all parts | Real-world size and comfort test |

*(See the `images/` folder or the project photos above)*

---

## ✅ What's good about it?

- ⚡ **Super fast** — location shared in under 2 seconds
- 🔋 **Long battery life** — no GPS means the battery lasts much longer
- 👆 **One button** — no phone, no app, no confusion in a panic
- 💰 **Very cheap** — under $15 per unit to build
- 🏫 **Works on campus** — uses existing Wi-Fi, no extra towers needed

---

## ⚠️ Known Limitations

| Problem | Why it happens | Our plan to fix it |
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
| 🌐 Live Dashboard | [cissecurity3ddashboard.vercel.app](https://cissecurity3ddashboard.vercel.app/) |

---

## 🏆 About This Project

- **Theme:** Open Innovation
- **Team:** N/A
- **Event:** International Innovation Challenge 2026

> *"One Touch. Instant Alert. Real Safety."*

---

## 📄 License

[Add your license here — e.g., MIT]
