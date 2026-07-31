#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "HWCDC.h"

HWCDC USBPort;

// Dual Serial printing helper
void usbPrint(const char* msg) {
  Serial.print(msg);
  USBPort.print(msg);
  USBPort.flush();
  delay(2);
}

void usbPrintln(const char* msg) {
  Serial.println(msg);
  USBPort.println(msg);
  USBPort.flush();
  delay(2);
}

// Pin Definitions for ESP32-C6 Zero
#define RGB_LED_PIN     8
#define EXT_BUTTON_PIN  20
#define BOOT_BUTTON_PIN  9

// =============================================================================
// HOTSPOT & BACKEND SERVER CONFIGURATION
// =============================================================================
const char* HOTSPOT_SSID     = "kartik";         // Your Laptop/Mobile Hotspot Name
const char* HOTSPOT_PASSWORD = "kartiksingh";     // Hotspot Password

// ⚠️ SERVER_URL: Port MUST be 3456 and endpoint MUST be /api/locate
//   • Local Mac IP:  "http://10.154.248.189:3456/api/locate"
//   • Render Cloud: "https://your-backend-name.onrender.com/api/locate"
const char* SERVER_URL       = "http://10.154.248.189:3456/api/locate";

const char* DEVICE_ID        = "ESP32_C6_ZERO_02";

const unsigned long HOLD_TIME_MS = 1000; // Require 1 second continuous press

// Convert RSSI (dBm) to Signal Percentage (0 - 100%)
int rssiToPercentage(int rssi) {
  if (rssi <= -100) return 0;
  if (rssi >= -50)  return 100;
  return 2 * (rssi + 100);
}

// RGB LED Control
void setRGB(uint8_t r, uint8_t g, uint8_t b) {
  neopixelWrite(RGB_LED_PIN, r, g, b);
  #ifdef RGB_BUILTIN
    neopixelWrite(RGB_BUILTIN, r, g, b);
  #endif
  rgbLedWrite(RGB_LED_PIN, r, g, b);
}

void connectWiFi() {
  usbPrintln("\n[WIFI] Connecting to Hotspot...");
  setRGB(0, 128, 255); // Cyan = Connecting
  
  // Disable NVS persistent storage so saved Enterprise credentials are never used
  WiFi.persistent(false);
  WiFi.disconnect(true, true); // Erase saved Wi-Fi config from flash NVS
  delay(200);

  WiFi.mode(WIFI_STA);
  WiFi.begin(HOTSPOT_SSID, HOTSPOT_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    usbPrint(".");
    retries++;
  }
  usbPrintln("");

  if (WiFi.status() == WL_CONNECTED) {
    setRGB(0, 0, 100); // Blue = Connected & Ready
    char buf[120];
    snprintf(buf, sizeof(buf), "[OK] Connected to Hotspot '%s'! IP: %s", HOTSPOT_SSID, WiFi.localIP().toString().c_str());
    usbPrintln(buf);
  } else {
    setRGB(255, 0, 0); // Red = Not connected
    usbPrintln("[WARN] Hotspot not connected yet. Will retry when button is pressed.");
  }
}

void setup() {
  Serial.begin(115200);
  USBPort.begin(115200);
  delay(1500);
  
  pinMode(RGB_LED_PIN, OUTPUT);
  setRGB(0, 0, 100); // Blue idle indicator
  
  usbPrintln("==================================================");
  usbPrintln(" 📡 ESP32-C6 Zero — Instant SOS Location Beacon");
  usbPrintln("==================================================");
  
  pinMode(EXT_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);

  // Connect to Hotspot on boot
  connectWiFi();
  
  usbPrintln("[READY] Hold button on GPIO 20 or GPIO 9 for 1 sec to trigger alert.");
}

void parseLocationResponse(String jsonResponse) {
  StaticJsonDocument<2048> doc;
  DeserializationError error = deserializeJson(doc, jsonResponse);

  if (error) {
    char buf[100];
    snprintf(buf, sizeof(buf), "❌ JSON Parsing Error: %s", error.c_str());
    usbPrintln(buf);
    return;
  }

  if (!doc["success"]) {
    usbPrintln("❌ Server returned success: false");
    return;
  }

  JsonObject predictions = doc["predictions"];

  usbPrintln("\n==================================================");
  usbPrintln("📍 GEOLOCATION PROBABILITY RESULTS");
  usbPrintln("==================================================");

  char lineBuf[256];

  // 1. MOST PROBABLE AREA
  if (predictions.containsKey("most_probable") && !predictions["most_probable"].isNull()) {
    JsonObject p1 = predictions["most_probable"];
    usbPrintln("\n🥇 MOST PROBABLE AREA (High Probability)");
    snprintf(lineBuf, sizeof(lineBuf), "   • Room: %s (Building %s, Floor %s)",
                  p1["room"].as<const char*>(),
                  p1["building"].as<const char*>(),
                  p1["floor"].as<const char*>());
    usbPrintln(lineBuf);
    snprintf(lineBuf, sizeof(lineBuf), "   • Confidence Score: %.1f%%", p1["confidence_score"].as<float>());
    usbPrintln(lineBuf);
    snprintf(lineBuf, sizeof(lineBuf), "   • Metrics: Common BSSIDs=%d, Cosine Sim=%.4f, Euclidean Dist=%.2f",
                  p1["metrics"]["common_bssids"].as<int>(),
                  p1["metrics"]["cosine_sim"].as<float>(),
                  p1["metrics"]["euclidean_dist"].as<float>());
    usbPrintln(lineBuf);
  }

  // 2. MEDIUM PROBABLE AREA
  if (predictions.containsKey("medium_probable") && !predictions["medium_probable"].isNull()) {
    JsonObject p2 = predictions["medium_probable"];
    usbPrintln("\n🥈 MEDIUM PROBABLE AREA");
    snprintf(lineBuf, sizeof(lineBuf), "   • Room: %s (Building %s, Floor %s)",
                  p2["room"].as<const char*>(),
                  p2["building"].as<const char*>(),
                  p2["floor"].as<const char*>());
    usbPrintln(lineBuf);
    snprintf(lineBuf, sizeof(lineBuf), "   • Confidence Score: %.1f%%", p2["confidence_score"].as<float>());
    usbPrintln(lineBuf);
    snprintf(lineBuf, sizeof(lineBuf), "   • Metrics: Common BSSIDs=%d, Cosine Sim=%.4f, Euclidean Dist=%.2f",
                  p2["metrics"]["common_bssids"].as<int>(),
                  p2["metrics"]["cosine_sim"].as<float>(),
                  p2["metrics"]["euclidean_dist"].as<float>());
    usbPrintln(lineBuf);
  }

  // 3. LESS PROBABLE AREA
  if (predictions.containsKey("less_probable") && !predictions["less_probable"].isNull()) {
    JsonObject p3 = predictions["less_probable"];
    usbPrintln("\n🥉 LESS PROBABLE AREA");
    snprintf(lineBuf, sizeof(lineBuf), "   • Room: %s (Building %s, Floor %s)",
                  p3["room"].as<const char*>(),
                  p3["building"].as<const char*>(),
                  p3["floor"].as<const char*>());
    usbPrintln(lineBuf);
    snprintf(lineBuf, sizeof(lineBuf), "   • Confidence Score: %.1f%%", p3["confidence_score"].as<float>());
    usbPrintln(lineBuf);
    snprintf(lineBuf, sizeof(lineBuf), "   • Metrics: Common BSSIDs=%d, Cosine Sim=%.4f, Euclidean Dist=%.2f",
                  p3["metrics"]["common_bssids"].as<int>(),
                  p3["metrics"]["cosine_sim"].as<float>(),
                  p3["metrics"]["euclidean_dist"].as<float>());
    usbPrintln(lineBuf);
  }

  usbPrintln("==================================================\n");
}

void performLocationScanAndTransmit(int triggeredPin) {
  char buf[200];
  usbPrintln("");
  usbPrintln("======================================================================");
  snprintf(buf, sizeof(buf), "🚨 [SOS TRIGGER] 1-Second Long Press on GPIO %d! Starting location scan...", triggeredPin);
  usbPrintln(buf);
  usbPrintln("======================================================================");
  
  // 1. Scanning surrounding Wi-Fi networks
  setRGB(255, 255, 0); // Yellow = Scanning
  
  usbPrintln("[1/3] Scanning surrounding Wi-Fi networks...");
  int totalFound = WiFi.scanNetworks(false, true);
  
  if (totalFound <= 0) {
    snprintf(buf, sizeof(buf), "[WARNING] No Wi-Fi networks found! (scanResult=%d)", totalFound);
    usbPrintln(buf);
  } else {
    snprintf(buf, sizeof(buf), "[INFO] Total networks detected: %d", totalFound);
    usbPrintln(buf);
  }
  
  // 2. Prepare JSON Payload for Backend /api/locate
  StaticJsonDocument<2048> doc;
  doc["device_id"] = DEVICE_ID;
  doc["trigger_gpio"] = triggeredPin;
  JsonArray signals = doc.createNestedArray("signals");
  
  int vitbplCount = 0;
  
  for (int i = 0; i < totalFound; ++i) {
    String ssid  = WiFi.SSID(i);
    String bssid = WiFi.BSSIDstr(i);
    bssid.toUpperCase();
    int signalPercent = rssiToPercentage(WiFi.RSSI(i));
    int channel       = WiFi.channel(i);
    
    // Filter: Keep SSIDs containing "VITBPL" OR BSSIDs starting with "68:28:CF"
    if (ssid.indexOf("VITBPL") >= 0 || ssid.indexOf("vitbpl") >= 0 || bssid.startsWith("68:28:CF")) {
      vitbplCount++;
      JsonObject net = signals.createNestedObject();
      net["ssid"]   = ssid;
      net["bssid"]  = bssid;
      net["signal"] = signalPercent;
      net["channel"]= channel;

      snprintf(buf, sizeof(buf), "  [%d] SSID: %-10s | BSSID: %s | Signal: %3d%% | Ch: %2d",
                    vitbplCount, ssid.c_str(), bssid.c_str(), signalPercent, channel);
      usbPrintln(buf);
    }
  }
  
  WiFi.scanDelete(); // Free scan memory
  
  if (vitbplCount == 0) {
    usbPrintln("⚠️ No VITBPL Access Points detected in this scan.");
  } else {
    snprintf(buf, sizeof(buf), "✅ Captured %d campus Access Point(s).", vitbplCount);
    usbPrintln(buf);
  }

  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  usbPrintln("\n[2/3] Payload Generated:");
  usbPrint("ESP32_PAYLOAD: ");
  usbPrintln(jsonPayload.c_str());
  
  // 3. Ensure Wi-Fi is Connected to WPA2 WPA/WPA2 Personal Hotspot
  if (WiFi.status() != WL_CONNECTED) {
    usbPrintln("⚠️ Wi-Fi disconnected — reconnecting now...");
    connectWiFi();
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    setRGB(0, 255, 0); // Green = Transmitting
    
    // 4. Send Data to Server via HTTP POST /api/locate
    usbPrintln("\n[3/3] Transmitting data to Server...");
    snprintf(buf, sizeof(buf), " Server URL: %s", SERVER_URL);
    usbPrintln(buf);
    
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(8000); // 8 sec timeout
    
    int httpCode = http.POST(jsonPayload);
    
    if (httpCode > 0) {
      snprintf(buf, sizeof(buf), "✅ [SUCCESS] HTTP Response Code: %d", httpCode);
      usbPrintln(buf);
      String response = http.getString();
      if (response.length() > 0) {
        parseLocationResponse(response);
      }
    } else {
      snprintf(buf, sizeof(buf), "❌ [ERROR] HTTP POST failed: %s", http.errorToString(httpCode).c_str());
      usbPrintln(buf);
      setRGB(255, 0, 0); // Red = Error
      delay(1500);
    }
    http.end();
  } else {
    setRGB(255, 0, 0); // Red = Connection Failed
    usbPrintln("❌ [ERROR] Failed to connect to Hotspot! Check SSID and Password.");
    delay(1500);
  }
  
  setRGB(0, 0, 100); // Back to Idle Blue
}

void loop() {
  int p20 = digitalRead(EXT_BUTTON_PIN);
  int p9  = digitalRead(BOOT_BUTTON_PIN);
  
  if (p20 == LOW || p9 == LOW) {
    int activePin = (p20 == LOW) ? EXT_BUTTON_PIN : BOOT_BUTTON_PIN;
    unsigned long pressStartTime = millis();
    bool triggered = false;
    
    // Visual feedback while holding button: Magenta / Purple LED
    setRGB(255, 0, 255); 
    
    while (digitalRead(activePin) == LOW) {
      if (millis() - pressStartTime >= HOLD_TIME_MS) {
        triggered = true;
        break;
      }
      delay(10);
    }
    
    if (triggered) {
      performLocationScanAndTransmit(activePin);
      
      // Wait for button release so it doesn't re-trigger continuously
      while (digitalRead(activePin) == LOW) {
        delay(10);
      }
    } else {
      // Released before 1 second - revert LED to Idle Blue
      setRGB(0, 0, 100);
    }
  }
  
  delay(30);
}