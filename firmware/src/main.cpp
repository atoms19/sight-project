/**
 * Sight Project – ESP32 Firmware
 * Phase 1: Edge-AI IoT Framework
 *
 * Features:
 *  - Samples current (ACS712) and voltage (ZMPT101B) at 10 Hz
 *  - Calculates true RMS power using accumulated samples
 *  - Publishes JSON payload to MQTT every 1000 ms
 *  - Persists relay state in EEPROM for fail-safe power-cycle recovery
 *  - Subscribes to relay command topic for remote switching
 */

#include <Arduino.h>
#include <EEPROM.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ──────────────────────────────────────────────────────────────────────────────
// Configuration – update before flashing
// ──────────────────────────────────────────────────────────────────────────────
#ifndef WIFI_SSID
#define WIFI_SSID "your_wifi_ssid"
#endif
#ifndef WIFI_PASS
#define WIFI_PASS "your_wifi_password"
#endif
#ifndef MQTT_HOST
#define MQTT_HOST "192.168.1.100"
#endif
#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif
// DEVICE_ID and MQTT topics are dynamically generated from MAC address

// GPIO
#define PIN_CURRENT_SENSOR  34  // ADC1_CH6 – ACS712 output
#define PIN_VOLTAGE_SENSOR  35  // ADC1_CH7 – ZMPT101B output
#define PIN_RELAY           26  // Relay control

// Sampling
#define SAMPLE_RATE_HZ      10      // 10 samples per second
#define SAMPLE_INTERVAL_MS  (1000 / SAMPLE_RATE_HZ)  // 100 ms
#define PUBLISH_INTERVAL_MS 1000    // publish every 1 s
#define ADC_MAX             4095.0f
#define ADC_VREF            3.3f

// ACS712-30A calibration (adjust Sensitivity for your module variant)
#define ACS712_SENSITIVITY  0.066f  // V/A  (30 A module)
#define ACS712_ZERO_OFFSET  (ADC_VREF / 2.0f)

// ZMPT101B calibration
#define ZMPT101B_SCALE      233.0f  // multiply normalised signal to get Vrms

// EEPROM
#define EEPROM_SIZE         8
#define EEPROM_RELAY_ADDR   0

// ──────────────────────────────────────────────────────────────────────────────
// Globals
// ──────────────────────────────────────────────────────────────────────────────
WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);

volatile float g_sumI2   = 0.0f;   // accumulated i²  for RMS
volatile float g_sumV2   = 0.0f;   // accumulated v²  for RMS
volatile int   g_samples = 0;

unsigned long lastSampleMs  = 0;
unsigned long lastPublishMs = 0;

bool relayState = false;
char deviceId[32] = "meter_unknown";
char topicTelemetry[64] = "sight/meters/unknown/telemetry";
char topicCmd[64]       = "sight/meters/unknown/cmd";

// ──────────────────────────────────────────────────────────────────────────────
// EEPROM helpers
// ──────────────────────────────────────────────────────────────────────────────
void saveRelayState(bool state) {
    EEPROM.write(EEPROM_RELAY_ADDR, state ? 1 : 0);
    EEPROM.commit();
}

bool loadRelayState() {
    uint8_t val = EEPROM.read(EEPROM_RELAY_ADDR);
    return val == 1;
}

// ──────────────────────────────────────────────────────────────────────────────
// Relay control
// ──────────────────────────────────────────────────────────────────────────────
void setRelay(bool on) {
    relayState = on;
    digitalWrite(PIN_RELAY, on ? HIGH : LOW);
    saveRelayState(on);
    Serial.printf("[RELAY] %s\n", on ? "ON" : "OFF");
}

// ──────────────────────────────────────────────────────────────────────────────
// MQTT callback – handles relay commands
// ──────────────────────────────────────────────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (err) {
        Serial.printf("[MQTT] JSON parse error: %s\n", err.c_str());
        return;
    }
    if (doc.containsKey("relay")) {
        setRelay(doc["relay"].as<bool>());
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// WiFi
// ──────────────────────────────────────────────────────────────────────────────
void connectWifi() {
    Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    
    // Auto-generate unique Device ID and MQTT topics based on the hardware MAC address
    uint8_t mac[6];
    WiFi.macAddress(mac);
    snprintf(deviceId, sizeof(deviceId), "meter_%02x%02x%02x%02x%02x%02x", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    snprintf(topicTelemetry, sizeof(topicTelemetry), "sight/meters/%s/telemetry", deviceId);
    snprintf(topicCmd, sizeof(topicCmd), "sight/meters/%s/cmd", deviceId);
    
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.printf("\n[WiFi] Connected  IP=%s\n", WiFi.localIP().toString().c_str());
}

// ──────────────────────────────────────────────────────────────────────────────
// MQTT reconnect
// ──────────────────────────────────────────────────────────────────────────────
void mqttReconnect() {
    while (!mqttClient.connected()) {
        Serial.print("[MQTT] Connecting...");
        if (mqttClient.connect(deviceId)) {
            Serial.println(" connected");
            mqttClient.subscribe(topicCmd);
        } else {
            Serial.printf(" failed rc=%d – retry in 5 s\n", mqttClient.state());
            delay(5000);
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// ADC helpers
// ──────────────────────────────────────────────────────────────────────────────
inline float adcToVoltage(int raw) {
    return (raw / ADC_MAX) * ADC_VREF;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sampling – called every SAMPLE_INTERVAL_MS
// ──────────────────────────────────────────────────────────────────────────────
void takeSample() {
    int rawI = analogRead(PIN_CURRENT_SENSOR);
    int rawV = analogRead(PIN_VOLTAGE_SENSOR);

    float vI = adcToVoltage(rawI);
    float vV = adcToVoltage(rawV);

    // Current: remove DC offset, scale to amperes
    float current = (vI - ACS712_ZERO_OFFSET) / ACS712_SENSITIVITY;

    // Voltage: normalise to [-1, 1] then scale to Vrms equivalent
    float voltage = (vV - (ADC_VREF / 2.0f)) * 2.0f;  // [-1, 1]

    g_sumI2   += current * current;
    g_sumV2   += voltage * voltage;
    g_samples += 1;
}

// ──────────────────────────────────────────────────────────────────────────────
// Publish telemetry
// ──────────────────────────────────────────────────────────────────────────────
void publishTelemetry() {
    if (g_samples == 0) return;

    float irms    = sqrtf(g_sumI2 / g_samples);
    float vrms    = sqrtf(g_sumV2 / g_samples) * ZMPT101B_SCALE;
    float power   = irms * vrms;                 // apparent power (W)
    float energy  = power / 3600.0f;             // Wh per second accumulation

    // Reset accumulators
    g_sumI2   = 0.0f;
    g_sumV2   = 0.0f;
    g_samples = 0;

    StaticJsonDocument<256> doc;
    doc["device_id"]   = deviceId;
    doc["timestamp"]   = millis();
    doc["irms_a"]      = serialized(String(irms, 4));
    doc["vrms_v"]      = serialized(String(vrms, 2));
    doc["power_w"]     = serialized(String(power, 2));
    doc["energy_wh"]   = serialized(String(energy, 6));
    doc["relay_state"] = relayState;

    char buf[256];
    size_t n = serializeJson(doc, buf, sizeof(buf));
    mqttClient.publish(topicTelemetry, buf, n);

    Serial.printf("[TEL] I=%.3fA V=%.1fV P=%.2fW relay=%d\n",
                  irms, vrms, power, (int)relayState);
}

// ──────────────────────────────────────────────────────────────────────────────
// setup()
// ──────────────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(100);

    // EEPROM
    EEPROM.begin(EEPROM_SIZE);
    bool saved = loadRelayState();

    // GPIO
    pinMode(PIN_RELAY, OUTPUT);
    analogReadResolution(12);          // 12-bit ADC (0-4095)
    analogSetAttenuation(ADC_11db);    // full-scale 3.3 V

    // Restore relay state from EEPROM for fail-safe recovery
    setRelay(saved);

    // WiFi + MQTT
    connectWifi();
    mqttClient.setServer(MQTT_HOST, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setKeepAlive(30);

    Serial.println("[BOOT] Sight ESP32 firmware ready");
}

// ──────────────────────────────────────────────────────────────────────────────
// loop()
// ──────────────────────────────────────────────────────────────────────────────
void loop() {
    // Maintain WiFi
    if (WiFi.status() != WL_CONNECTED) {
        connectWifi();
    }

    // Maintain MQTT
    if (!mqttClient.connected()) {
        mqttReconnect();
    }
    mqttClient.loop();

    unsigned long now = millis();

    // 10 Hz sampling
    if (now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
        lastSampleMs = now;
        takeSample();
    }

    // 1 Hz publish
    if (now - lastPublishMs >= PUBLISH_INTERVAL_MS) {
        lastPublishMs = now;
        publishTelemetry();
    }
}
