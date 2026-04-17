# Sight Project

**Autonomous Edge-AI IoT Framework for Predictive Building Optimization**

A production-ready, zero-cloud repository implementing real-time energy monitoring, NILM appliance classification, anomaly-driven load-shedding, and a live React dashboard — all running entirely at the edge.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  ESP32 Firmware (Phase 1)                                           │
│  • Samples current + voltage at 10 Hz via ACS712 + ZMPT101B       │
│  • Computes true RMS power, publishes JSON to MQTT every 1 s       │
│  • Persists relay state in EEPROM for fail-safe power-cycle        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ MQTT (sight/meters/+/telemetry)
┌──────────────────────────────▼──────────────────────────────────────┐
│  Edge Server (Phase 2)                                              │
│  • mqtt_ingest.py → InfluxDB (90-day retention) + Redis (live)     │
│  • FastAPI REST API  GET /devices, /live, /history                  │
│  • FastAPI WebSocket /ws/{device_id} — 1 Hz push                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Redis live state
┌──────────────────────────────▼──────────────────────────────────────┐
│  ML Pipeline (Phase 3)                                              │
│  • NILM feature extraction (mean, std, spikes, transitions, time)  │
│  • Random Forest classifier — appliance identification             │
│  • Anomaly detector — 7-day rolling average, automated load-shed   │
│  • Priority config — critical loads never auto-shed                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST + WebSocket
┌──────────────────────────────▼──────────────────────────────────────┐
│  React 18 Dashboard (Phase 4)                                       │
│  • Vite + TypeScript + Recharts                                     │
│  • Live power chart with 7-day baseline reference line             │
│  • Manual relay control panel                                      │
│  • Custom useWebSocket hook (sub-200 ms latency)                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
sight-project/
├── firmware/                   # Phase 1 – ESP32 (C++/PlatformIO)
│   ├── platformio.ini
│   └── src/main.cpp
├── edge-server/                # Phase 2 – Edge Server (Python)
│   ├── ingest/mqtt_ingest.py
│   ├── api/main.py
│   ├── Dockerfile.ingest
│   ├── Dockerfile.api
│   └── requirements.txt
├── ml-pipeline/                # Phase 3 – ML Pipeline (Python)
│   ├── nilm/
│   │   ├── features.py
│   │   └── classifier.py
│   ├── anomaly/detector.py
│   ├── agent.py
│   ├── Dockerfile
│   └── requirements.txt
├── dashboard/                  # Phase 4 – React 18 Dashboard
│   ├── src/
│   │   ├── App.tsx
│   │   ├── hooks/useWebSocket.ts
│   │   └── components/{LiveChart,ControlPanel}.tsx
│   ├── tests/useWebSocket.test.ts
│   ├── Dockerfile
│   └── package.json
├── infra/                      # Phase 5 – DevOps
│   ├── docker-compose.yml      # 8-service orchestration
│   ├── nginx/nginx.conf
│   ├── mosquitto/mosquitto.conf
│   └── grafana/provisioning/
│       ├── datasources/influxdb.yaml
│       └── dashboards/{provider.yaml,load_curves.json}
├── tests/
│   └── python/                 # Pytest suites (23 tests)
│       ├── test_nilm_features.py
│       └── test_anomaly_detector.py
├── .github/workflows/ci.yml   # CI: Pytest + Jest + Docker smoke-test
├── pytest.ini
└── .gitignore
```

## Quick Start

### 1. Clone & start all services

```bash
cd infra
docker compose up -d
```

This starts 8 services:
| # | Service    | Port  | Description              |
|---|------------|-------|--------------------------|
| 1 | broker     | 1883  | Mosquitto MQTT           |
| 2 | influxdb   | 8086  | InfluxDB 2 TSDB          |
| 3 | redis      | 6379  | Redis live-state cache   |
| 4 | ingest     | –     | MQTT → InfluxDB + Redis  |
| 5 | api        | 8000  | FastAPI REST + WebSocket |
| 6 | ml-agent   | –     | NILM + anomaly detection |
| 7 | ui         | –     | React 18 dashboard       |
| 8 | proxy      | 80    | Nginx reverse proxy      |

Open **http://localhost** for the dashboard, **http://localhost:3001** for Grafana.

### 2. Flash firmware

```bash
cd firmware
# Edit src/main.cpp and set WIFI_SSID, WIFI_PASS, MQTT_HOST
pio run --target upload
```

### 3. Run tests

```bash
# Python
pip install -r ml-pipeline/requirements.txt pytest
pytest

# JavaScript
cd dashboard && npm install && npm test
```

## Services

| Component | Tech | Notes |
|-----------|------|-------|
| Firmware | C++17, PlatformIO | ACS712 + ZMPT101B, EEPROM fail-safe |
| MQTT Broker | Mosquitto 2.0 | TCP 1883 + WS 9001 |
| Time-series DB | InfluxDB 2.7 | 90-day retention, Flux queries |
| Cache | Redis 7.2 | Live device state, 10 s TTL |
| Ingest | Python 3.12, paho-mqtt | Writes InfluxDB + Redis |
| API | FastAPI 0.111, uvicorn | REST + 1 Hz WebSocket push |
| ML | scikit-learn RF, numpy | NILM + 7-day anomaly detection |
| Dashboard | React 18, Vite, Recharts | TypeScript, dark theme |
| Proxy | Nginx 1.27 | Rate-limiting, WS upgrade, SPA routing |
| Monitoring | Grafana 10.4 | Pre-provisioned load-curve dashboard |
