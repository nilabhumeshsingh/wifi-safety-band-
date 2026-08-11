#!/usr/bin/env python3
"""
Serial-to-Vercel Bridge
========================
Reads ESP32_PAYLOAD JSON from USB serial and POSTs it to the Vercel dashboard.
The ESP32 scans WiFi and outputs the data; this script sends it to the cloud.

Usage:
    python3 serial_to_vercel.py
"""

import serial
import serial.tools.list_ports
import json
import time
import urllib.request
import urllib.error
import sys

VERCEL_URL = "https://cissecurity3ddashboard.vercel.app/api/sos"
BAUD_RATE = 115200

def find_esp32_port():
    """Find the ESP32 serial port automatically."""
    import glob
    ports = sorted(glob.glob('/dev/ttyACM*'))
    if ports:
        return ports[0]
    # Fallback: check all ports
    for p in serial.tools.list_ports.comports():
        if 'ACM' in p.device or 'USB' in p.device:
            return p.device
    return None

def post_to_vercel(payload_json):
    """POST the scan data to the Vercel dashboard."""
    try:
        data = json.dumps(payload_json).encode('utf-8')
        req = urllib.request.Request(
            VERCEL_URL,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode('utf-8')
            result = json.loads(body)
            return resp.status, result
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if e.fp else ''
        return e.code, {'error': body}
    except Exception as e:
        return 0, {'error': str(e)}

def main():
    port = find_esp32_port()
    if not port:
        print("❌ No ESP32 serial port found!")
        sys.exit(1)

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║        🛡️  Serial-to-Vercel Bridge — NightGuard            ║
║                                                              ║
║  Port: {port:<20s}                                  ║
║  URL:  cissecurity3ddashboard.vercel.app/api/sos             ║
║                                                              ║
║  Press BOOT button on ESP32 to scan & send!                  ║
║  Press Ctrl+C to stop.                                       ║
╚══════════════════════════════════════════════════════════════╝
""")

    ser = serial.Serial(port, BAUD_RATE, timeout=1)
    time.sleep(2)  # Let ESP32 boot

    alert_count = 0

    try:
        while True:
            line = ser.readline()
            if not line:
                continue

            try:
                text = line.decode('utf-8', errors='replace').strip()
            except:
                continue

            if not text:
                continue

            # Print all ESP32 output
            print(f"  [ESP32] {text}")

            # Check for payload line
            if text.startswith("ESP32_PAYLOAD:"):
                json_str = text[len("ESP32_PAYLOAD:"):]
                try:
                    payload = json.loads(json_str)
                    num_signals = len(payload.get('signals', []))
                    print(f"\n  📡 Captured {num_signals} VITBPL BSSIDs — Sending to Vercel...")

                    status, result = post_to_vercel(payload)

                    if status == 200 and result.get('success'):
                        alert_count += 1
                        preds = result.get('predictions', {})
                        most = preds.get('most_probable', {})
                        room = most.get('room', '?')
                        conf = most.get('confidence_score', 0)
                        building = most.get('building', '?')
                        floor_num = most.get('floor', '?')
                        tier = most.get('probability_tier', '')

                        alert = result.get('alert', {})
                        alert_id = alert.get('id', '?')

                        print(f"""
  ╔══════════════════════════════════════════════════════════╗
  ║  ✅ ALERT #{alert_count} CREATED — {alert_id:<30s}      ║
  ║                                                          ║
  ║  🏢 Room: {room:<12s} | Building: {building:<6s} | Floor: {floor_num:<4s}║
  ║  📊 Confidence: {conf:>5.1f}%  ({tier})                  ║
  ╚══════════════════════════════════════════════════════════╝
""")
                        # Show medium and less probable too
                        med = preds.get('medium_probable', {})
                        low = preds.get('less_probable', {})
                        if med.get('room'):
                            print(f"  🟠 2nd: Room {med['room']} ({med.get('confidence_score', 0):.1f}%)")
                        if low.get('room'):
                            print(f"  🟡 3rd: Room {low['room']} ({low.get('confidence_score', 0):.1f}%)")
                        print()
                    else:
                        err = result.get('error', 'Unknown error')
                        print(f"  ❌ POST failed (HTTP {status}): {err}\n")

                except json.JSONDecodeError as e:
                    print(f"  ⚠️  Invalid JSON payload: {e}")

    except KeyboardInterrupt:
        print(f"\n  🛑 Bridge stopped. {alert_count} alerts sent.")
    finally:
        ser.close()

if __name__ == '__main__':
    main()
