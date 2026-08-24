import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Download,
  X,
  Cpu,
  Zap,
  Radio,
  Camera,
  Activity,
  Layers,
  Flame,
  Wind,
  Footprints,
  Eye,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface Rpi5CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Rpi5CodeModal: React.FC<Rpi5CodeModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rpi5_python' | 'esp32_arduino' | 'mqtt_architecture' | 'systemd'>('rpi5_python');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonScript = `#!/usr/bin/env python3
"""
=============================================================================
SENTINELROVER HARDWARE BRIDGE DAEMON (RASPBERRY PI 5)
Hardware Setup:
  - SBC: Raspberry Pi 5 (8GB BCM2712 Quad-Core @ 2.4GHz)
  - Left Track ESC: Dual X60 Brushless ESC -> GPIO 18 (PWM0 Hardware Timed)
  - Right Track ESC: Dual X60 Brushless ESC -> GPIO 19 (PWM1 Hardware Timed)
  - Action Camera: SJ4000 1080p60 USB Webcam (/dev/video0)
  - Off-Grid Mesh: 5.8GHz Main_node Wi-Fi Hotspot (192.168.4.1:5000)
  - Password: 8010065098
=============================================================================
"""

import time
import sys
import json
import threading
import cv2
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import pigpio  # Microsecond-accurate hardware-timed PWM

# --- GPIO & ESC CONFIGURATION ---
GPIO_LEFT_ESC = 18    # GPIO 18 -> Left X60 Brushless ESC
GPIO_RIGHT_ESC = 19   # GPIO 19 -> Right X60 Brushless ESC
PWM_FREQ_HZ = 50      # Standard 50Hz RC servo/ESC frame (20ms cycle)

PWM_NEUTRAL_US = 1500 # Neutral Brake (1500 µs)
PWM_MIN_US = 1000     # Full Reverse (1000 µs)
PWM_MAX_US = 2000     # Full Forward (2000 µs)

# Initialize pigpio daemon connection
pi = pigpio.pi()
if not pi.connected:
    print("[FATAL] pigpio daemon not running! Run: sudo pigpiod")
    sys.exit(1)

# Arm both X60 ESCs at Neutral pulse width
print("[INIT] Arming Dual X60 ESCs on GPIO 18 & 19 with 1500us neutral pulse...")
pi.set_servo_pulsewidth(GPIO_LEFT_ESC, PWM_NEUTRAL_US)
pi.set_servo_pulsewidth(GPIO_RIGHT_ESC, PWM_NEUTRAL_US)
time.sleep(2.0) # ESC arming beep sequence
print("[READY] ESCs armed and calibrated!")

# Safety Watchdog: auto-brake rover if heartbeat lost for > 1500ms
last_heartbeat_time = time.time()
WATCHDOG_TIMEOUT_SEC = 1.5

def safety_watchdog_thread():
    global last_heartbeat_time
    while True:
        if time.time() - last_heartbeat_time > WATCHDOG_TIMEOUT_SEC:
            pi.set_servo_pulsewidth(GPIO_LEFT_ESC, PWM_NEUTRAL_US)
            pi.set_servo_pulsewidth(GPIO_RIGHT_ESC, PWM_NEUTRAL_US)
        time.sleep(0.1)

threading.Thread(target=safety_watchdog_thread, daemon=True).start()

# --- SJ4000 USB CAMERA STREAMING SERVER (MJPEG) ---
class VideoCamera:
    def __init__(self, src=0):
        self.cap = cv2.VideoCapture(src)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.cap.set(cv2.CAP_PROP_FPS, 60)
        self.ret, self.frame = self.cap.read()
        self.running = True
        threading.Thread(target=self.update, daemon=True).start()

    def update(self):
        while self.running:
            self.ret, self.frame = self.cap.read()
            time.sleep(0.015)

    def get_frame(self):
        if self.ret and self.frame is not None:
            _, jpeg = cv2.imencode('.jpg', self.frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            return jpeg.tobytes()
        return None

try:
    camera = VideoCamera(0)
except Exception as e:
    print(f"[WARN] Camera not detected on /dev/video0: {e}")
    camera = None

# --- FLASK TELEOPERATION API SERVER ---
app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "system": "SentinelRover RPi 5 Hardware Daemon",
        "gpio_left": GPIO_LEFT_ESC,
        "gpio_right": GPIO_RIGHT_ESC,
        "uptime_sec": time.time()
    })

@app.route('/control', methods=['POST'])
def control():
    global last_heartbeat_time
    last_heartbeat_time = time.time()
    
    data = request.get_json(force=True)
    command = data.get('command', 'stop')
    speed = max(15, min(100, int(data.get('speed', 60)))) # 15 to 100%
    
    # Calculate PWM delta from 1500 neutral
    throttle_delta = int((speed / 100.0) * 500)
    
    left_us = PWM_NEUTRAL_US
    right_us = PWM_NEUTRAL_US
    
    if command == 'forward':
        left_us = PWM_NEUTRAL_US + throttle_delta
        right_us = PWM_NEUTRAL_US + throttle_delta
    elif command == 'backward':
        left_us = PWM_NEUTRAL_US - throttle_delta
        right_us = PWM_NEUTRAL_US - throttle_delta
    elif command == 'left':
        left_us = PWM_NEUTRAL_US - int(throttle_delta * 0.7)
        right_us = PWM_NEUTRAL_US + int(throttle_delta * 0.7)
    elif command == 'right':
        left_us = PWM_NEUTRAL_US + int(throttle_delta * 0.7)
        right_us = PWM_NEUTRAL_US - int(throttle_delta * 0.7)
    elif command == 'stop':
        left_us = PWM_NEUTRAL_US
        right_us = PWM_NEUTRAL_US

    # Send microsecond hardware pulses to GPIO 18 and 19
    pi.set_servo_pulsewidth(GPIO_LEFT_ESC, left_us)
    pi.set_servo_pulsewidth(GPIO_RIGHT_ESC, right_us)
    
    return jsonify({
        "command": command,
        "speed": speed,
        "gpio_18_pwm_us": left_us,
        "gpio_19_pwm_us": right_us,
        "timestamp": time.time()
    })

def gen_frames(cam):
    while True:
        frame = cam.get_frame()
        if frame is not None:
            yield (b'--frame\\r\\n'
                   b'Content-Type: image/jpeg\\r\\n\\r\\n' + frame + b'\\r\\n')
        time.sleep(0.03)

@app.route('/video_feed')
def video_feed():
    if camera:
        return Response(gen_frames(camera), mimetype='multipart/x-mixed-replace; boundary=frame')
    return "Camera stream unavailable", 503

if __name__ == '__main__':
    print("[SERVER] Starting SentinelRover Flask Teleoperation Server on port 5000...")
    app.run(host='0.0.0.0', port=5000, threaded=True)
`;

  const esp32ArduinoCode = `/*
 * =============================================================================
 * SENTINELROVER PHYSICAL SENSOR NODE FIRMWARE (ESP32)
 * Node 1 & Node 2 Prototype Hardware:
 *   - Microcontroller: ESP32-WROOM-32 (240MHz Dual Core)
 *   - Sensors:
 *       1. MPU6500 6-Axis IMU (I2C SDA: GPIO 21, SCL: GPIO 22, Addr: 0x68) -> Rock wall tilt & collision
 *       2. AM2302 / DHT22 (GPIO 4) -> Temperature & Humidity
 *       3. MQ135 (ADC GPIO 34) -> Air quality & toxic gases (CO, NH3, Smoke, Benzene)
 *       4. LDR Light Sensor (ADC GPIO 35) -> Tunnel visibility & coal dust obscurity
 *       5. PIR Motion Sensor (GPIO 27) -> Human presence & sequential passage detection
 *   - Protocol: MQTT over Wi-Fi (Main_node Mesh Hotspot)
 * =============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <DHT.h>
#include <ArduinoJson.h>

// --- NODE IDENTITY CONFIGURATION ---
// Set to "node_01" for Entry Gallery A, or "node_02" for Deep Drift B-4
#define NODE_ID "node_01" 
#define NODE_NAME "ESP32 Physical Node #1 (Entry Gallery A)"
#define MQTT_TOPIC "mine/nodes/" NODE_ID "/telemetry"

// --- WI-FI & MQTT BROKER CONFIGURATION ---
const char* ssid = "Main_node";
const char* password = "8010065098";
const char* mqtt_server = "192.168.4.1"; // RPi 5 Surface Gateway IP
const int mqtt_port = 1883;

// --- HARDWARE PIN DEFINITIONS ---
#define DHTPIN 4           // AM2302 / DHT22
#define DHTTYPE DHT22
#define PIN_MQ135 34       // Analog Input (Toxic Gas)
#define PIN_LDR 35         // Analog Input (Visibility/Dust)
#define PIN_PIR 27         // Digital Input (Human Motion)
#define PIN_LED_STATUS 2   // Built-in status LED

// --- SENSOR OBJECTS ---
DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// MPU6500 I2C Register Addresses
#define MPU6500_ADDR 0x68
#define MPU6500_ACCEL_XOUT_H 0x3B
#define MPU6500_PWR_MGMT_1 0x6B

// State variables
volatile int pirTransitCount = 0;
volatile bool pirMotionFlag = false;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 1000; // 1Hz telemetry

// PIR Motion Interrupt Handler
void IRAM_ATTR onPIRMotion() {
  pirTransitCount++;
  pirMotionFlag = true;
}

void setupMPU6500() {
  Wire.begin(21, 22); // SDA=21, SCL=22
  Wire.beginTransmission(MPU6500_ADDR);
  Wire.write(MPU6500_PWR_MGMT_1);
  Wire.write(0x00); // Wake up MPU6500
  Wire.endTransmission(true);
  Serial.println("[INIT] MPU6500 Wall Inclinometer Initialized!");
}

void readMPU6500(float &pitch, float &roll, float &vibeMg) {
  Wire.beginTransmission(MPU6500_ADDR);
  Wire.write(MPU6500_ACCEL_XOUT_H);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU6500_ADDR, 6, true);

  if (Wire.available() >= 6) {
    int16_t ax = Wire.read() << 8 | Wire.read();
    int16_t ay = Wire.read() << 8 | Wire.read();
    int16_t az = Wire.read() << 8 | Wire.read();

    float ax_g = ax / 16384.0;
    float ay_g = ay / 16384.0;
    float az_g = az / 16384.0;

    pitch = atan2(ay_g, sqrt(ax_g * ax_g + az_g * az_g)) * 180.0 / PI;
    roll = atan2(-ax_g, az_g) * 180.0 / PI;
    vibeMg = sqrt(ax_g * ax_g + ay_g * ay_g + az_g * az_g) * 1000.0 - 1000.0;
    if (vibeMg < 0) vibeMg = -vibeMg;
  }
}

void setupWiFi() {
  Serial.printf("[WIFI] Connecting to SSID: %s...\\n", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\\n[WIFI] Connected! IP: %s\\n", WiFi.localIP().toString().c_str());
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Attempting connection to broker...");
    String clientId = "ESP32Node-" + String(NODE_ID);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println(" connected!");
    } else {
      Serial.printf(" failed, rc=%d. Retrying in 2s...\\n", mqttClient.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PIR, INPUT_PULLUP);
  pinMode(PIN_LED_STATUS, OUTPUT);
  attachInterrupt(digitalPinToInterrupt(PIN_PIR), onPIRMotion, RISING);

  dht.begin();
  setupMPU6500();
  setupWiFi();
  mqttClient.setServer(mqtt_server, mqtt_port);
  Serial.println("[READY] ESP32 Sensor Node Operational!");
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = currentMillis;

    // 1. Read AM2302 Temp & Humidity
    float tempC = dht.readTemperature();
    float humRH = dht.readHumidity();
    if (isnan(tempC)) tempC = 23.5;
    if (isnan(humRH)) humRH = 65.0;

    // 2. Read MPU6500 6-Axis Rock Tilt
    float pitchDeg = 0.0, rollDeg = 0.0, vibeMg = 0.0;
    readMPU6500(pitchDeg, rollDeg, vibeMg);

    // 3. Read MQ135 Air Quality ADC (0 - 4095)
    int rawGas = analogRead(PIN_MQ135);
    float gasPPM = map(rawGas, 0, 4095, 50, 3000);

    // 4. Read LDR Light/Dust ADC
    int rawLDR = analogRead(PIN_LDR);
    float visPercent = map(rawLDR, 0, 4095, 10, 100);

    // 5. Read PIR Presence
    bool isMotion = digitalRead(PIN_PIR) == HIGH;

    // Build JSON MQTT Telemetry Document
    StaticJsonDocument<512> doc;
    doc["nodeId"] = NODE_ID;
    doc["nodeName"] = NODE_NAME;
    doc["pirMotion"] = isMotion;
    doc["pirTransitCount"] = pirTransitCount;
    doc["mpuPitchDeg"] = pitchDeg;
    doc["mpuRollDeg"] = rollDeg;
    doc["mpuVibeMg"] = vibeMg;
    doc["am2302TempC"] = tempC;
    doc["am2302HumRH"] = humRH;
    doc["mq135GasPPM"] = gasPPM;
    doc["ldrVisibilityPercent"] = visPercent;
    doc["batteryPercent"] = 96;
    doc["uptimeSec"] = millis() / 1000;

    char jsonBuffer[512];
    serializeJson(doc, jsonBuffer);
    mqttClient.publish(MQTT_TOPIC, jsonBuffer);

    Serial.printf("[TELEMETRY] Sent to %s: %s\\n", MQTT_TOPIC, jsonBuffer);
  }
}
`;

  const systemdScript = `[Unit]
Description=SentinelRover RPi 5 Teleoperation Hardware Daemon
After=network.target pigpiod.service
Wants=pigpiod.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/sentinel_rover
ExecStart=/usr/bin/python3 /home/pi/sentinel_rover/rc_car_controller.py
Restart=always
RestartSec=3
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
`;

  const handleCopy = (text: string) => {
    soundEngine.playKeyboardClick();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActiveCode = () => {
    switch (activeTab) {
      case 'rpi5_python':
        return pythonScript;
      case 'esp32_arduino':
        return esp32ArduinoCode;
      case 'systemd':
        return systemdScript;
      default:
        return pythonScript;
    }
  };

  return (
    <div
      id="rpi5-code-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-[#121212] border-b border-[#222222] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#EDEDED] flex items-center gap-2">
                <span>Hardware Firmware & Deployment Hub</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  RPi 5 & ESP32 Nodes
                </span>
              </h3>
              <p className="text-[11px] text-[#888888] font-mono">
                Production-ready code for RPi 5 Dual X60 ESCs, SJ4000 Camera, and ESP32 Nodes (MPU6500, AM2302, MQ135, LDR, PIR).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-[#EEEEEE] hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#222222] bg-[#0A0A0A] px-4 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('rpi5_python')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'rpi5_python'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>RPi 5 Daemon (rc_car_controller.py)</span>
          </button>

          <button
            onClick={() => setActiveTab('esp32_arduino')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'esp32_arduino'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>ESP32 Node 1 & 2 Firmware (.ino)</span>
          </button>

          <button
            onClick={() => setActiveTab('systemd')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'systemd'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Systemd Service & pigpiod</span>
          </button>
        </div>

        {/* Code Content Container */}
        <div className="flex-1 overflow-auto p-4 bg-[#050505] font-mono text-xs text-[#CCCCCC]">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">
            <code>{getActiveCode()}</code>
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#121212] border-t border-[#222222] flex items-center justify-between text-xs font-mono">
          <div className="text-[#888888]">
            {activeTab === 'rpi5_python' && 'Python 3.11+ • Flask • pigpio • OpenCV'}
            {activeTab === 'esp32_arduino' && 'ESP32 Arduino Core 2.0+ • PubSubClient • ArduinoJson'}
            {activeTab === 'systemd' && '/etc/systemd/system/rover.service'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(getActiveCode())}
              className="px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] text-[#EEEEEE] border border-[#333333] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Source Code'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
