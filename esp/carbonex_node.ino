#include <Wire.h>
#include <math.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <HTTPClient.h>

// Wi-Fi credentials
const char* ssid = "Nothing";
const char* password = "12345678";

// Receiver running on the base/server computer
const char* receiverUrl = "http://10.85.219.17:8000/endpoint";
const char* nodeId = "Node01";

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

const int MPU_ADDR = 0x68;
const unsigned long telemetryIntervalMs = 1000;
unsigned long lastTime;
unsigned long lastTelemetryTime = 0;
unsigned long sequenceNumber = 0;
float dt;
int lastHttpStatus = 0;

int16_t AcX, AcY, AcZ, Tmp, GyX, GyY, GyZ;

struct KalmanFilter {
  float angle = 0.0f;
  float bias = 0.0f;
  float P[2][2] = {{0.0f, 0.0f}, {0.0f, 0.0f}};
  float Q_angle = 0.001f;
  float Q_bias = 0.003f;
  float R_measure = 0.03f;

  float update(float newAngle, float newRate, float elapsedSeconds) {
    float rate = newRate - bias;
    angle += elapsedSeconds * rate;
    P[0][0] += elapsedSeconds *
                (elapsedSeconds * P[1][1] - P[0][1] - P[1][0] + Q_angle);
    P[0][1] -= elapsedSeconds * P[1][1];
    P[1][0] -= elapsedSeconds * P[1][1];
    P[1][1] += Q_bias * elapsedSeconds;

    float measurementUncertainty = P[0][0] + R_measure;
    float gain[2] = {
      P[0][0] / measurementUncertainty,
      P[1][0] / measurementUncertainty
    };
    float innovation = newAngle - angle;
    angle += gain[0] * innovation;
    bias += gain[1] * innovation;

    float P00 = P[0][0];
    float P01 = P[0][1];
    P[0][0] -= gain[0] * P00;
    P[0][1] -= gain[0] * P01;
    P[1][0] -= gain[1] * P00;
    P[1][1] -= gain[1] * P01;
    return angle;
  }
};

KalmanFilter kalmanX;
KalmanFilter kalmanY;

void showStatus(const char* line1, const String& line2 = "") {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println(line1);
  if (line2.length() > 0) {
    display.setCursor(0, 16);
    display.println(line2);
  }
  display.display();
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  showStatus("Connecting WiFi...");
  Serial.print("Connecting to WiFi");

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Connected. Node IP: ");
    Serial.println(WiFi.localIP());
    showStatus("WiFi connected", WiFi.localIP().toString());
    delay(1000);
  } else {
    Serial.println("WiFi connection timed out");
    showStatus("WiFi unavailable", "Retrying...");
  }
}

bool readMpu(float& tiltX, float& tiltY, int8_t& temperature) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) {
    return false;
  }

  if (Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)14, true) != 14) {
    return false;
  }

  AcX = (Wire.read() << 8) | Wire.read();
  AcY = (Wire.read() << 8) | Wire.read();
  AcZ = (Wire.read() << 8) | Wire.read();
  Tmp = (Wire.read() << 8) | Wire.read();
  GyX = (Wire.read() << 8) | Wire.read();
  GyY = (Wire.read() << 8) | Wire.read();
  GyZ = (Wire.read() << 8) | Wire.read();

  float rollRaw = atan2(AcY, sqrt((float)AcX * AcX + (float)AcZ * AcZ)) * 180.0f / PI;
  float pitchRaw = atan2(-AcX, sqrt((float)AcY * AcY + (float)AcZ * AcZ)) * 180.0f / PI;
  float gyroXRate = GyX / 131.0f;
  float gyroYRate = GyY / 131.0f;

  tiltX = kalmanX.update(rollRaw, gyroXRate, dt);
  tiltY = kalmanY.update(pitchRaw, gyroYRate, dt);
  temperature = (int8_t)((Tmp / 340.0f) + 36.53f);
  return true;
}

void sendTelemetry(float tiltX, float tiltY, int8_t temperature) {
  if (WiFi.status() != WL_CONNECTED) {
    lastHttpStatus = 0;
    return;
  }

  HTTPClient http;
  http.begin(receiverUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  String payload = "{";
  payload += "\"node_id\":\"" + String(nodeId) + "\",";
  payload += "\"seq\":" + String(sequenceNumber++) + ",";
  payload += "\"tilt_x\":" + String((int)(tiltX * 1000.0f)) + ",";
  payload += "\"tilt_y\":" + String((int)(tiltY * 1000.0f)) + ",";
  payload += "\"temp\":" + String(temperature) + ",";
  payload += "\"batt\":0,";
  payload += "\"vib\":0,";
  payload += "\"crack\":0,";
  payload += "\"rssi\":" + String(WiFi.RSSI());
  payload += "}";

  lastHttpStatus = http.POST(payload);
  Serial.printf("POST %s -> HTTP %d\n", payload.c_str(), lastHttpStatus);
  if (lastHttpStatus > 0) {
    Serial.println(http.getString());
  } else {
    Serial.printf("Telemetry error: %s\n", http.errorToString(lastHttpStatus).c_str());
  }
  http.end();
}

void drawTelemetry(float tiltX, float tiltY, int8_t temperature) {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("CarboNex Node Data");
  display.drawLine(0, 10, 128, 10, WHITE);
  display.setCursor(0, 20);
  display.print("TILT X : ");
  display.print((int)(tiltX * 1000.0f));
  display.println(" mDeg");
  display.setCursor(0, 35);
  display.print("TILT Y : ");
  display.print((int)(tiltY * 1000.0f));
  display.println(" mDeg");
  display.setCursor(0, 50);
  display.print("TEMP   : ");
  display.print(temperature);
  display.println(" C");
  display.setCursor(106, 0);
  display.print(lastHttpStatus == 200 ? "OK" : "--");
  display.display();
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED allocation failed");
    for (;;) {
      delay(1000);
    }
  }
  display.setTextColor(WHITE);
  display.setTextSize(1);
  showStatus("Starting CarboNex...");

  connectWiFi();

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission(true);
  lastTime = micros();
}

void loop() {
  unsigned long currentTime = micros();
  dt = (currentTime - lastTime) / 1000000.0f;
  lastTime = currentTime;
  if (dt <= 0.0f || dt > 0.5f) {
    dt = 0.01f;
  }

  connectWiFi();

  float tiltX;
  float tiltY;
  int8_t temperature;
  if (readMpu(tiltX, tiltY, temperature)) {
    drawTelemetry(tiltX, tiltY, temperature);
    if (millis() - lastTelemetryTime >= telemetryIntervalMs) {
      lastTelemetryTime = millis();
      sendTelemetry(tiltX, tiltY, temperature);
    }
  } else {
    Serial.println("MPU6050 read failed");
    showStatus("MPU6050 read failed");
  }

  delay(100);
}
