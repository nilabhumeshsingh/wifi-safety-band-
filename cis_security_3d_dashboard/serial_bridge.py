import serial
import json
import time
import requests
import glob
import os

TARGET_URL = 'http://localhost:3000/api/sos'

print("\n" + "="*80)
print(" 📡 VITBPL LIVE TERMINAL SCAN MONITOR & 3D GEOLOCATION BRIDGE")
print(f" Listening on USB Serial (/dev/ttyACM*) -> Target: {TARGET_URL}")
print("="*80 + "\n")

def get_serial_port():
    ports = glob.glob('/dev/ttyACM*') + glob.glob('/dev/ttyUSB*')
    return ports[0] if ports else None

def display_terminal_scan(payload, predictions=None):
    signals = payload.get("signals", [])
    if not signals:
        print("\n⚠️ No VITBPL Access Points captured in this scan.\n")
        return

    # Sort signals by strongest signal %
    sorted_signals = sorted(signals, key=lambda x: x.get("signal", 0), reverse=True)
    nearest_ap = sorted_signals[0]

    os.system('clear' if os.name == 'posix' else 'cls')

    print("====================================================================================")
    print(" 📡 [VITBPL ACCESS POINT SCAN] Triggered by ESP32 Button Press")
    print("====================================================================================")
    print(f" 🥇 NEAREST VITBPL ACCESS POINT (Rank 1):")
    print(f"    • SSID:    {nearest_ap.get('ssid')}")
    print(f"    • BSSID:   {nearest_ap.get('bssid')}")
    print(f"    • Signal:  {nearest_ap.get('signal')}% Strength")
    print(f"    • Channel: {nearest_ap.get('channel')}")
    print("------------------------------------------------------------------------------------")
    print(" 📊 ALL CAPTURED VITBPL ACCESS POINTS IN PROXIMITY:")
    print(" -----------------------------------------------------------------------------------")
    print(f"  {'#':<3} │ {'SSID':<10} │ {'BSSID':<20} │ {'SIGNAL':<10} │ {'CHANNEL':<8}")
    print(" -----------------------------------------------------------------------------------")

    for idx, ap in enumerate(sorted_signals, start=1):
        is_nearest = " (NEAREST 📍)" if idx == 1 else ""
        sig_str = f"{ap.get('signal')}%"
        print(f"  {idx:<3} │ {ap.get('ssid'):<10} │ {ap.get('bssid'):<20} │ {sig_str:<10} │ Ch {ap.get('channel')}{is_nearest}")

    print(" -----------------------------------------------------------------------------------")

    if predictions:
        p1 = predictions.get("most_probable", {})
        p2 = predictions.get("medium_probable", {})
        p3 = predictions.get("less_probable", {})

        print("\n 📍 3D MAP PROBABILITY PREDICTIONS & LIGHTS ([http://localhost:3000](http://localhost:3000)):")
        if p1:
            print(f"   • 🔴 RED LIGHT (Most Probable):   Room {p1.get('room')} ({p1.get('confidence_score')}%) | Floor {p1.get('floor')}")
        if p2:
            print(f"   • 🟠 ORANGE LIGHT (Medium Prob): Room {p2.get('room')} ({p2.get('confidence_score')}%) | Floor {p2.get('floor')}")
        if p3:
            print(f"   • 🟡 YELLOW LIGHT (Less Prob):   Room {p3.get('room')} ({p3.get('confidence_score')}%) | Floor {p3.get('floor')}")

    print("====================================================================================\n")

while True:
    port = get_serial_port()
    if not port:
        time.sleep(2)
        continue
        
    try:
        s = serial.Serial(port, 115200, timeout=1)
        print(f"[OK] Connected to ESP32-C6 Zero on {port}!")
        
        while True:
            line = s.readline().decode('utf-8', errors='ignore').strip()
            
            if line.startswith("ESP32_PAYLOAD:"):
                json_str = line.replace("ESP32_PAYLOAD:", "").strip()
                try:
                    payload = json.loads(json_str)
                    
                    # POST to 3D Dashboard Geolocation Server
                    resp = requests.post(TARGET_URL, json=payload, timeout=3)
                    preds = None
                    if resp.status_code in [200, 201]:
                        res_data = resp.json()
                        preds = res_data.get('predictions', {})

                    # Print formatted terminal scan table
                    display_terminal_scan(payload, preds)

                except Exception as ex:
                    print("Bridge error processing payload:", ex)
    except Exception as e:
        time.sleep(2)
