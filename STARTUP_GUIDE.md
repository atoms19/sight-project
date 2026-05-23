# Sight Project: Getting Started Guide

This guide details how to set up and run the entire Sight project, including flashing the ESP32 firmware, launching the backend services, and starting the frontend dashboard.

---

## 1. Prerequisites

Before you begin, ensure you have the following installed:

*   **Git:** For cloning the repository.
*   **Docker & Docker Compose:** For running all backend services.
*   **Python 3.9+ & pip:** For the ML pipeline and test scripts.
*   **Node.js & pnpm:** For the frontend (pnpm is recommended, see `dashboard/package.json`).
*   **PlatformIO Core:** (Optional, for firmware development) If you plan to compile and flash the ESP32 firmware yourself.

---

## 2. Setup

### A. Clone the Repository

If you haven't already, clone the Sight project repository:

```bash
git clone <your-repo-url>
cd sight-project
```

### B. Python Environment (for ML training)

The ML pipeline has its own Python dependencies. It's recommended to use a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r ml-pipeline/requirements.txt pytest kagglehub
```

### C. Train the NILM Model

The NILM model needs to be trained once. This script will generate synthetic data and save the trained model.

```bash
source .venv/bin/activate
python ml-pipeline/train_model.py
```
*(The `infra/docker-compose.yml` has been updated to automatically mount this trained model into the `ml-agent` container.)*

### D. Frontend Dependencies

Navigate to the `dashboard` directory and install frontend dependencies:

```bash
cd dashboard
pnpm install # or npm install or yarn install
cd ..
```

---

## 3. Starting the System

### A. Launch Backend Services (Docker Compose)

Navigate to the `infra` directory and start all backend services using Docker Compose:

```bash
cd infra
docker-compose up -d broker influxdb redis ingest api ml-agent grafana
cd ..
```
This will:
*   Start the MQTT broker (`mosquitto`).
*   Launch InfluxDB and Redis.
*   Run the `ingest` service (MQTT to InfluxDB/Redis).
*   Start the `api` service (FastAPI for REST & WebSockets).
*   Start the `ml-agent` for NILM and Anomaly Detection.
*   (Optional) Start `grafana` for dashboards.

Verify all containers are running and healthy:

```bash
docker-compose ps
```
Look for `(healthy)` or `Up` status for all services.

### B. Flash ESP32 Firmware (Physical Device)

If you have an ESP32 board, you'll need to flash the firmware.

1.  **Open in PlatformIO:** Open the `firmware` folder in VS Code with the PlatformIO extension, or use the PlatformIO CLI.
2.  **Configure `WIFI_SSID`, `WIFI_PASS`, `MQTT_HOST`:** Edit `firmware/src/main.cpp` with your WiFi credentials and the IP address or hostname of your MQTT broker (usually `broker` if running in Docker Compose and on the same network, or `localhost` if testing locally with the Docker broker exposed).
    *   **Note:** The `DEVICE_ID` is now dynamically generated from the ESP32's MAC address, so you no longer need to manually set it for each device!
3.  **Build & Upload:** Build and upload the firmware to your ESP32 board.

Once flashed, the ESP32 will connect to WiFi, establish an MQTT connection, and start publishing telemetry data every second.

### C. Launch Frontend Dashboard

Navigate to the `dashboard` directory and start the development server:

```bash
cd dashboard
pnpm dev # or npm run dev or yarn dev
```
Open your browser to the address indicated by the command (usually `http://localhost:5173`).
The dashboard will connect to the backend services to display live data, historical charts, and allow relay control.

---

## 4. Verifying Backend APIs (Optional)

You can use the `test_backend.py` script to verify the backend API endpoints are functioning correctly without a physical device connected.

```bash
python test_backend.py
```
This script injects mock MQTT telemetry, waits for ingestion, and then queries the `/health`, `/devices`, `/devices/{device_id}/live`, `/devices/{device_id}/history`, and `/devices/{device_id}/relay` endpoints.

---

That's it! You should now have a fully operational Sight IoT & ML energy monitoring system.
