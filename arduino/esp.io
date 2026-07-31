/*
  =============================================================================
  ESP32-C6 Zero — VITBPL Wi-Fi Location Tracker & Serial Display
  =============================================================================
  Hardware: ESP32-C6 Zero (or ESP32-C6 / ESP32-S3 / ESP32)
  
  Function:
    1. Scans nearby Wi-Fi networks and filters for campus "VITBPL" Access Points.
    2. Displays captured AP details (SSID, BSSID/MAC, Signal %, Channel).
    3. Posts payload to backend server /api/locate endpoint over Wi-Fi.
    4. Receives and displays 3-Tier Location Probabilities (Most, Medium, Less).
    
  NEW: Scan is triggered ONLY by a long-press on GPIO 20.
  =============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Requires ArduinoJson library (v6 or v7)

// =============================================================================
// CONFIGURATION PARAMETERS (Update these for your network)
// =============================================================================
const char* WIFI_SSID     = "kartik";     // Network for ESP32 Internet/LAN connectivity
const char* WIFI_PASSWORD = "kartiksingh";

// ⚠️  SERVER_URL:
//     • Local development: "http://10.154.248.189:3456/api/locate"
//     • Render cloud:      "https://your-backend-name.onrender.com/api/locate"
const char* SERVER_URL    = "http://10.154.248.189:3456/api/locate";

const char* DEVICE_ID     = "ESP32_C6_ZERO_01";
const int SCAN_INTERVAL_MS = 10000; // Minimum cooldown between scans

// =============================================================================
// GPIO 20 SWITCH CONFIGURATION
// =============================================================================
const int TRIGGER_PIN      = 20;          // GPIO pin for the trigger switch
const unsigned long LONG_PRESS_MS = 1000; // 1 second = long press
const unsigned long DEBOUNCE_MS   = 50;   // Debounce time

// Button state variables
bool lastButtonState      = HIGH;         // INPUT_PULLUP -> HIGH when open
bool buttonPressed        = false;
unsigned long pressStartTime = 0;
unsigned long lastScanTime   = 0;

// Convert RSSI (dBm) to Signal Percentage (0 - 100%)
int rssiToPercentage(int rssi) {
  if (rssi <= -100) return 0;
  if (rssi >= -50)  return 100;
  return 2 * (rssi + 100);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Configure GPIO 20 with internal pull-up
  pinMode(TRIGGER_PIN, INPUT_PULLUP);

  Serial.println();
  Serial.println("==================================================");
  Serial.println("   📡 ESP32-C6 Zero — VITBPL Wi-Fi Tracker");
  Serial.println("==================================================");
  Serial.println("   [TRIGGER] Hold switch on GPIO 20 for 1 sec to scan");
  Serial.println("==================================================");

  // Set Wi-Fi to Station Mode
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  // Connect to Local Wi-Fi / Hotspot for HTTP POST communication
  Serial.printf("Connecting to Wi-Fi: %s ...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {  // 40 × 500ms = 20 seconds
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] Connected to Wi-Fi network!");
    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Gateway (Mac backend): ");
    Serial.println(WiFi.gatewayIP());   // ← shows what IP to use as SERVER_URL
  } else {
    Serial.println("\n[WARN] Wi-Fi not connected yet. Will attempt POST when connected.");
  }
}

void performLocationScan() {
  Serial.println("\n--------------------------------------------------");
  Serial.println("🔍 Scanning for campus VITBPL Wi-Fi Access Points...");

  // Synchronous scan across 2.4GHz & 5GHz channels
  int totalFound = WiFi.scanNetworks(false, true);

  if (totalFound == 0) {
    Serial.println("❌ No Wi-Fi networks found!");
    return;
  }

  // Prepare JSON Document
  StaticJsonDocument<2048> doc;
  doc["device_id"] = DEVICE_ID;
  JsonArray signals = doc.createNestedArray("signals");

  int vitbplCount = 0;

  Serial.println("\n📡 CAPTURED VITBPL ACCESS POINTS:");
  Serial.println("--------------------------------------------------");

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

      // Print captured AP details cleanly to Serial Monitor
      Serial.printf("  [%d] SSID: %-10s | BSSID: %s | Signal: %3d%% | Ch: %2d\n",
                    vitbplCount, ssid.c_str(), bssid.c_str(), signalPercent, channel);
    }
  }

  Serial.println("--------------------------------------------------");

  if (vitbplCount == 0) {
    Serial.println("⚠️ No VITBPL Access Points detected in this scan.");
    WiFi.scanDelete();
    return;
  }

  Serial.printf("✅ Captured %d VITBPL Access Point(s). Posting payload to server...\n", vitbplCount);

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send HTTP POST to Backend Geolocation Server
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi dropped — reconnecting...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int r = 0;
    while (WiFi.status() != WL_CONNECTED && r < 20) { delay(500); Serial.print("."); r++; }
    Serial.println();
  }

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    int httpCode = http.POST(jsonPayload);

    if (httpCode > 0) {
      String response = http.getString();
      if (httpCode == HTTP_CODE_OK || httpCode == 201) {
        parseLocationResponse(response);
      } else {
        Serial.printf("❌ Server response error (%d): %s\n", httpCode, response.c_str());
      }
    } else {
      Serial.printf("❌ HTTP POST failed: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("⚠️ HTTP POST skipped: Wi-Fi not connected.");
  }

  // Clear memory
  WiFi.scanDelete();
}

void parseLocationResponse(String jsonResponse) {
  StaticJsonDocument<2048> doc;
  DeserializationError error = deserializeJson(doc, jsonResponse);

  if (error) {
    Serial.print("❌ JSON Parsing Error: ");
    Serial.println(error.c_str());
    return;
  }

  if (!doc["success"]) {
    Serial.println("❌ Server returned success: false");
    return;
  }

  JsonObject predictions = doc["predictions"];

  Serial.println("\n==================================================");
  Serial.println("📍 UPDATED GEOLOCATION PROBABILITY RESULTS");
  Serial.println("==================================================");

  // 1. MOST PROBABLE AREA
  if (predictions.containsKey("most_probable") && !predictions["most_probable"].isNull()) {
    JsonObject p1 = predictions["most_probable"];
    Serial.println("\n🥇 MOST PROBABLE AREA (High Probability)");
    Serial.printf("   • Room: %s (Building %s, Floor %s)\n",
                  p1["room"].as<const char*>(),
                  p1["building"].as<const char*>(),
                  p1["floor"].as<const char*>());
    Serial.printf("   • Confidence Score: %.1f%%\n", p1["confidence_score"].as<float>());
    Serial.printf("   • Metrics: Common BSSIDs=%d, Cosine Sim=%.4f, Euclidean Dist=%.2f\n",
                  p1["metrics"]["common_bssids"].as<int>(),
                  p1["metrics"]["cosine_sim"].as<float>(),
                  p1["metrics"]["euclidean_dist"].as<float>());
  }

  // 2. MEDIUM PROBABLE AREA
  if (predictions.containsKey("medium_probable") && !predictions["medium_probable"].isNull()) {
    JsonObject p2 = predictions["medium_probable"];
    Serial.println("\n🥈 MEDIUM PROBABLE AREA");
    Serial.printf("   • Room: %s (Building %s, Floor %s)\n",
                  p2["room"].as<const char*>(),
                  p2["building"].as<const char*>(),
                  p2["floor"].as<const char*>());
    Serial.printf("   • Confidence Score: %.1f%%\n", p2["confidence_score"].as<float>());
    Serial.printf("   • Metrics: Common BSSIDs=%d, Cosine Sim=%.4f, Euclidean Dist=%.2f\n",
                  p2["metrics"]["common_bssids"].as<int>(),
                  p2["metrics"]["cosine_sim"].as<float>(),
                  p2["metrics"]["euclidean_dist"].as<float>());
  }

  // 3. LESS PROBABLE AREA
  if (predictions.containsKey("less_probable") && !predictions["less_probable"].isNull()) {
    JsonObject p3 = predictions["less_probable"];
    Serial.println("\n🥉 LESS PROBABLE AREA");
    Serial.printf("   • Room: %s (Building %s, Floor %s)\n",
                  p3["room"].as<const char*>(),
                  p3["building"].as<const char*>(),
                  p3["floor"].as<const char*>());
    Serial.printf("   • Confidence Score: %.1f%%\n", p3["confidence_score"].as<float>());
    Serial.printf("   • Metrics: Common BSSIDs=%d, Cosine Sim=%.4f, Euclidean Dist=%.2f\n",
                  p3["metrics"]["common_bssids"].as<int>(),
                  p3["metrics"]["cosine_sim"].as<float>(),
                  p3["metrics"]["euclidean_dist"].as<float>());
  }

  Serial.println("==================================================\n");
}

void loop() {
  // Read the current state of the switch on GPIO 20
  // INPUT_PULLUP: LOW = pressed, HIGH = released
  bool currentButtonState = digitalRead(TRIGGER_PIN);

  unsigned long now = millis();

  // Detect falling edge (press start)
  if (lastButtonState == HIGH && currentButtonState == LOW) {
    pressStartTime = now;
    buttonPressed = true;
    Serial.println("[GPIO 20] Button pressed...");
  }

  // Detect rising edge (release)
  if (lastButtonState == LOW && currentButtonState == HIGH) {
    buttonPressed = false;
  }

  // Check for long press while button is held
  if (buttonPressed && currentButtonState == LOW) {
    unsigned long heldDuration = now - pressStartTime;

    // Long press detected
    if (heldDuration >= LONG_PRESS_MS) {
      // Cooldown guard to prevent rapid re-triggering
      if (now - lastScanTime >= SCAN_INTERVAL_MS) {
        Serial.println("[GPIO 20] ✅ Long press confirmed! Triggering scan...");
        performLocationScan();
        lastScanTime = now;
      } else {
        unsigned long wait = SCAN_INTERVAL_MS - (now - lastScanTime);
        Serial.printf("[GPIO 20] ⏳ Cooldown active. Wait %lu ms before next scan.\n", wait);
      }
      // Reset so it doesn't fire continuously while held
      buttonPressed = false;
    }
  }

  lastButtonState = currentButtonState;
  delay(10); // Small delay for stability
}