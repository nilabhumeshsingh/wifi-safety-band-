/*
  =============================================================================
  ESP32-C6 Zero — Direct Terminal Nearest BSSID Printer & Tracker
  =============================================================================
  Hardware: ESP32-C6 Zero
  RGB LED:  Onboard WS2812 RGB LED on GPIO 8
  Buttons:  External Button on GPIO 20 & Onboard BOOT Button on GPIO 9
  
  Uses HWCDCSerial (always available) to output over USB Serial/JTAG port.
  Includes flush+delay after each print to prevent USB FIFO byte drops.
  =============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "esp_wpa2.h"
#include "esp_wifi.h"
#include "HWCDC.h"

// Create our own HWCDC instance for USB Serial/JTAG output
HWCDC USBPort;

// Flush helper: print + flush + small delay to prevent USB FIFO overflow
void usbPrint(const char* msg) {
  USBPort.print(msg);
  USBPort.flush();
  delay(5);
}
void usbPrintln(const char* msg) {
  USBPort.println(msg);
  USBPort.flush();
  delay(5);
}

// Hardware Pin Definitions
#define RGB_LED_PIN     8  // Onboard WS2812 RGB LED on ESP32-C6 Zero
#define EXT_BUTTON_PIN  20 // External Push Button on GPIO 20
#define BOOT_BUTTON_PIN  9 // Onboard BOOT Button on GPIO 9

const char* EAP_IDENTITY = "25BAI10967";
const char* EAP_USERNAME = "25BAI10967";
const char* EAP_PASSWORD = "e609oe";
const char* WIFI_SSID    = "VITBPL";

const char* SERVER_URL   = "http://172.25.62.160:3000/api/sos";
const char* DEVICE_ID    = "ESP32_C6_ZERO";

unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY_MS = 250;

int colorIndex = 0;
const uint8_t LED_COLORS[7][3] = {
  {255, 0, 0},    // 1. Red
  {0, 255, 0},    // 2. Green
  {0, 0, 255},    // 3. Blue
  {255, 255, 0},  // 4. Yellow
  {255, 0, 255},  // 5. Magenta
  {0, 255, 255},  // 6. Cyan
  {255, 255, 255} // 7. White
};

int rssiToPercentage(int rssi) {
  if (rssi <= -100) return 0;
  if (rssi >= -50)  return 100;
  return 2 * (rssi + 100);
}

void setRGB(uint8_t r, uint8_t g, uint8_t b) {
  neopixelWrite(RGB_LED_PIN, r, g, b);
  #ifdef RGB_BUILTIN
    neopixelWrite(RGB_BUILTIN, r, g, b);
  #endif
  rgbLedWrite(RGB_LED_PIN, r, g, b);
}

void cycleNextLEDColor() {
  colorIndex = (colorIndex + 1) % 7;
  uint8_t r = LED_COLORS[colorIndex][0];
  uint8_t g = LED_COLORS[colorIndex][1];
  uint8_t b = LED_COLORS[colorIndex][2];
  setRGB(r, g, b);
}

void setup() {
  Serial.begin(115200);    // UART0 (hardware pins)
  USBPort.begin(115200);   // USB Serial/JTAG -> goes to your terminal!
  delay(2000);             // Extra time for USB CDC to initialize

  pinMode(RGB_LED_PIN, OUTPUT);
  setRGB(0, 0, 255); // BLUE on boot

  usbPrintln("==================================================");
  usbPrintln("   ESP32-C6 Zero Terminal Nearest BSSID Scanner");
  usbPrintln("==================================================");

  pinMode(EXT_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);

  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);
  delay(100);

  #if defined(ESP_IDF_VERSION_MAJOR) && ESP_IDF_VERSION_MAJOR >= 5
    esp_eap_client_set_identity((uint8_t *)EAP_IDENTITY, strlen(EAP_IDENTITY));
    esp_eap_client_set_username((uint8_t *)EAP_USERNAME, strlen(EAP_USERNAME));
    esp_eap_client_set_password((uint8_t *)EAP_PASSWORD, strlen(EAP_PASSWORD));
    esp_wifi_sta_enterprise_enable();
  #else
    esp_wifi_sta_wpa2_ent_set_identity((uint8_t *)EAP_IDENTITY, strlen(EAP_IDENTITY));
    esp_wifi_sta_wpa2_ent_set_username((uint8_t *)EAP_USERNAME, strlen(EAP_USERNAME));
    esp_wifi_sta_wpa2_ent_set_password((uint8_t *)EAP_PASSWORD, strlen(EAP_PASSWORD));
    esp_wifi_sta_wpa2_ent_enable();
  #endif

  WiFi.begin(WIFI_SSID);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 15) {
    delay(300);
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    setRGB(0, 255, 0); // GREEN
    usbPrintln("[OK] Connected to VITBPL Enterprise Wi-Fi!");
  } else {
    setRGB(255, 128, 0); // ORANGE
    usbPrintln("[INFO] Wi-Fi Connecting... Serial Bridge Active.");
  }
}

void performLocationScan(int triggeredPin) {
  char buf[120];

  usbPrintln("");
  usbPrintln("======================================================================");
  snprintf(buf, sizeof(buf), " BUTTON PRESSED ON GPIO %d - SCANNING VITBPL ACCESS POINTS", triggeredPin);
  usbPrintln(buf);
  usbPrintln("======================================================================");

  // Disconnect WiFi to free the radio for scanning
  WiFi.disconnect(true);
  delay(200);
  WiFi.mode(WIFI_STA);
  delay(200);

  int totalFound = -1;
  for (int attempt = 0; attempt < 3 && totalFound < 0; attempt++) {
    if (attempt > 0) {
      snprintf(buf, sizeof(buf), " Scan retry %d/3...", attempt + 1);
      usbPrintln(buf);
      delay(500);
    }
    totalFound = WiFi.scanNetworks(false, true);
  }

  if (totalFound <= 0) {
    snprintf(buf, sizeof(buf), "No Wi-Fi networks found! (scanResult=%d)", totalFound);
    usbPrintln(buf);
    // Reconnect WiFi
    WiFi.begin(WIFI_SSID);
    return;
  }

  snprintf(buf, sizeof(buf), " Total networks found: %d", totalFound);
  usbPrintln(buf);

  StaticJsonDocument<2048> doc;
  doc["device_id"] = DEVICE_ID;
  doc["student_id"] = EAP_IDENTITY;
  doc["student_name"] = "Student (Button Press)";
  JsonArray signals = doc.createNestedArray("signals");

  int vitbplCount = 0;

  String nearestBSSID = "";
  String nearestSSID  = "";
  int maxSignal = -999;
  int nearestChannel = 0;

  for (int i = 0; i < totalFound; ++i) {
    String ssid  = WiFi.SSID(i);
    String bssid = WiFi.BSSIDstr(i);
    bssid.toUpperCase();
    int signalPercent = rssiToPercentage(WiFi.RSSI(i));
    int channel       = WiFi.channel(i);

    if (ssid.indexOf("VITBPL") >= 0 || ssid.indexOf("vitbpl") >= 0 || bssid.startsWith("68:28:CF")) {
      vitbplCount++;
      JsonObject net = signals.createNestedObject();
      net["ssid"]   = ssid;
      net["bssid"]  = bssid;
      net["signal"] = signalPercent;
      net["channel"]= channel;

      if (signalPercent > maxSignal) {
        maxSignal = signalPercent;
        nearestBSSID = bssid;
        nearestSSID  = ssid;
        nearestChannel = channel;
      }
    }
  }

  if (vitbplCount == 0) {
    usbPrintln("No VITBPL Access Points detected in this scan.");
    WiFi.scanDelete();
    return;
  }

  // TERMINAL DISPLAY OF NEAREST BSSID DIRECTLY FROM ESP32
  usbPrintln("");
  usbPrintln(" NEAREST VITBPL ACCESS POINT (RANK 1):");
  usbPrintln(" --------------------------------------------------");
  snprintf(buf, sizeof(buf), "    BSSID:   %s", nearestBSSID.c_str());
  usbPrintln(buf);
  snprintf(buf, sizeof(buf), "    SSID:    %s", nearestSSID.c_str());
  usbPrintln(buf);
  snprintf(buf, sizeof(buf), "    Signal:  %d%% Strength", maxSignal);
  usbPrintln(buf);
  snprintf(buf, sizeof(buf), "    Channel: %d", nearestChannel);
  usbPrintln(buf);
  usbPrintln(" --------------------------------------------------");
  usbPrintln("");

  usbPrintln(" ALL CAPTURED VITBPL ACCESS POINTS:");
  usbPrintln(" --------------------------------------------------");
  for (int i = 0; i < vitbplCount; ++i) {
    JsonObject net = doc["signals"][i];
    const char* bssid = net["bssid"];
    int sig = net["signal"];
    int ch  = net["channel"];
    bool isNearest = (String(bssid) == nearestBSSID);
    snprintf(buf, sizeof(buf), "  [%d] BSSID: %-18s | Signal: %3d%% | Ch: %2d %s",
                  i + 1, bssid, sig, ch, isNearest ? " (NEAREST)" : "");
    usbPrintln(buf);
  }
  usbPrintln(" --------------------------------------------------");

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  usbPrint("ESP32_PAYLOAD:");
  usbPrintln(jsonPayload.c_str());

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    int httpCode = http.POST(jsonPayload);
    if (httpCode > 0) {
      usbPrintln("HTTP POST Success!");
    }
    http.end();
  }

  WiFi.scanDelete();
  usbPrintln("======================================================================");

  // Reconnect to WiFi after scan
  usbPrintln(" Reconnecting to VITBPL Wi-Fi...");
  WiFi.begin(WIFI_SSID);
}

void loop() {
  int p20 = digitalRead(EXT_BUTTON_PIN);
  int p9  = digitalRead(BOOT_BUTTON_PIN);

  if (p20 == LOW || p9 == LOW) {
    if (millis() - lastDebounceTime > DEBOUNCE_DELAY_MS) {
      lastDebounceTime = millis();
      cycleNextLEDColor();

      int activePin = (p20 == LOW) ? 20 : 9;
      performLocationScan(activePin);
    }
  }

  delay(30);
}
