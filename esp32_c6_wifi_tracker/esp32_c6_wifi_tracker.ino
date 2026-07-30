/*
  =============================================================================
  ESP32-C6 Wi-Fi Geolocation & 3-Tier Location Tracker
  =============================================================================
  Hardware: ESP32-C6 (or ESP32-S3 / ESP32-C3 / ESP32)
  Function: 
    1. Scans nearby Wi-Fi Access Points (SSID, BSSID/MAC, Signal %).
    2. Constructs JSON payload.
    3. Posts payload to backend server /api/locate endpoint.
    4. Displays 3-Tier Probability Results (Most, Medium, Less Probable).
  =============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Ensure ArduinoJson v6 or v7 library is installed

// =============================================================================
// CONFIGURATION PARAMETERS
// =============================================================================
const char* WIFI_SSID     = "YOUR_WIFI_HOTSPOT_SSID";     // Network for ESP32 Internet/LAN connectivity
const char* WIFI_PASSWORD = "YOUR_WIFI_HOTSPOT_PASSWORD";

// Server API Endpoint URL (Replace with your Laptop/Server local IP or Domain)
// Example: "http://192.168.1.100:3456/api/locate"
const char* SERVER_URL    = "http://192.168.1.100:3456/api/locate";

const char* DEVICE_ID     = "ESP32_C6_TRACKER_01";
const int SCAN_INTERVAL_MS = 10000; // Scan every 10 seconds

// RSSI (dBm) to Signal Percentage conversion helper
int rssiToPercentage(int rssi) {
  if (rssi <= -100) return 0;
  if (rssi >= -50)  return 100;
  return 2 * (rssi + 100);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("==================================================");
  Serial.println("   📡 ESP32-C6 Wi-Fi Geolocation Tracker Started");
  Serial.println("==================================================");

  // Set Wi-Fi mode to Station
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  // Connect to Wi-Fi network for backend communication
  Serial.printf("Connecting to Wi-Fi: %s ...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] Wi-Fi Connected!");
    Serial.print("ESP32-C6 IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WARN] Wi-Fi connection timed out. Scanning will continue...");
  }
}

void performLocationScan() {
  Serial.println("\n--------------------------------------------------");
  Serial.println("🔍 Starting Wi-Fi Access Point Scan...");

  // Synchronous scan of all channels
  int n = WiFi.scanNetworks(false, true);

  if (n == 0) {
    Serial.println("❌ No Wi-Fi networks found!");
    return;
  }

  Serial.printf("✅ Found %d Wi-Fi networks!\n", n);

  // Prepare JSON Document
  StaticJsonDocument<2048> doc;
  doc["device_id"] = DEVICE_ID;
  JsonArray signals = doc.createNestedArray("signals");

  for (int i = 0; i < n; ++i) {
    JsonObject net = signals.createNestedObject();
    net["ssid"]   = WiFi.SSID(i);
    net["bssid"]  = WiFi.BSSIDstr(i);
    net["signal"] = rssiToPercentage(WiFi.RSSI(i));
    net["channel"]= WiFi.channel(i);
  }

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("Payload prepared. Sending HTTP POST to backend server...");

  // Send HTTP POST Request
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    int httpCode = http.POST(jsonPayload);

    if (httpCode > 0) {
      String response = http.getString();
      Serial.printf("HTTP Response Code: %d\n", httpCode);

      if (httpCode == HTTP_CODE_OK || httpCode == 201) {
        parseLocationResponse(response);
      } else {
        Serial.println("Error response from server:");
        Serial.println(response);
      }
    } else {
      Serial.printf("❌ HTTP POST failed, error: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("⚠️ Cannot send HTTP POST: Wi-Fi not connected.");
  }

  // Clean up scan memory
  WiFi.scanDelete();
}

void parseLocationResponse(String jsonResponse) {
  StaticJsonDocument<2048> doc;
  DeserializationError error = deserializeJson(doc, jsonResponse);

  if (error) {
    Serial.print("❌ JSON Deserialization failed: ");
    Serial.println(error.c_str());
    return;
  }

  bool success = doc["success"];
  if (!success) {
    Serial.println("❌ Server returned success: false");
    return;
  }

  JsonObject predictions = doc["predictions"];

  Serial.println("\n==================================================");
  Serial.println("📍 ESP32-C6 GEOLOCATION PROBABILITY RESULTS");
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
  performLocationScan();
  delay(SCAN_INTERVAL_MS);
}
