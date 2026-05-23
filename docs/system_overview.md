# Sight Project: System Overview & Commercial Benefits

The Sight platform is a Full-Stack IoT & Energy Monitoring System integrated with Edge Machine Learning. It transforms standard facility power monitoring into an intelligent, automated microgrid. 

---

## 1. Commercial & Industrial Benefits

Deploying this model and hardware in a commercial setting provides significant Return on Investment (ROI) across several key areas:

### Cost Reduction via Automated Peak Shaving
Commercial energy bills are heavily dependent on "Peak Demand Charges"—a premium paid for the single highest spike in power usage during a billing cycle. The Anomaly Detector and load-shedding control loop act as an automated peak shaver. If total facility load spikes, the system automatically cuts power to lower-priority devices (e.g., aesthetic lighting, EV chargers) to keep the peak down, saving thousands in utility fees.

### Predictive Maintenance
Machinery (like HVAC compressors or industrial motors) rarely fails instantly; degradation alters their electrical signature over time. As a failing motor draws more current, the system's Anomaly Detector identifies the deviation from the 7-day rolling baseline. Facilities can dispatch technicians to perform cheap preventative maintenance before catastrophic, expensive failures occur.

### Granular Cost Allocation (NILM)
Instead of a single, opaque utility bill, the Non-Intrusive Load Monitoring (NILM) model analyzes micro-fluctuations (1Hz) in power delivery to identify exactly *which* appliances are running. It disaggregates the facility's power usage, allowing management to see the exact cost of the server room versus the warehouse, without requiring expensive sub-meters on every outlet.

### Operational Resilience & Fail-safes
The system acts as an automated triage director during power constraints. Using a hardcoded priority configuration, the system guarantees that critical loads (like Medical Equipment or Server Racks) are never autonomously shed. Furthermore, the IoT edge devices persist their relay states in onboard EEPROM, meaning fail-safe logic survives localized power losses and reboots.

### Fire Safety & Risk Mitigation
Electrical faults result in instant, massive current spikes. Because the microcontroller evaluates the raw power line at 10 times per second, the machine learning agent can trigger an emergency relay shutoff in near real-time, potentially preventing electrical fires.

### ESG Reporting & Compliance
The platform permanently logs high-resolution power telemetry to a Time-Series Database (InfluxDB). This provides irrefutable, cryptographic-quality data necessary for strict Environmental, Social, and Governance (ESG) reporting, or for qualifying for green energy tax credits.

---

## 2. How the System Functions (Architecture & Data Flow)

The Sight system operates via a continuous, closed-loop pipeline running from the physical electrical wire all the way to the Python Machine Learning agent and back. 

Here is the exact step-by-step functionality:

### Step 1: Physical Data Ingestion (The Edge Controller)
* **Hardware:** An ESP32 microcontroller interfaces with physical current (ACS712) and voltage (ZMPT101B) sensors.
* **Sampling:** It samples the raw electrical waveforms at 10Hz, calculating the true RMS Apparent Power (Watts) and Energy (Watt-hours).
* **Emission:** Every 1.0 second, it bundles this data into a JSON payload and publishes it via MQTT to the local broker (topic: `sight/meters/<device_id>/telemetry`).

### Step 2: Backend Accumulation & Routing
* **MQTT Broker (Mosquitto):** Receives the high-frequency telemetry.
* **Ingest Worker (Python):** A continuous backend service subscribes to the telemetry stream and writes the data to two locations:
  1. **InfluxDB:** For long-term historical storage (90-day retention) and ESG analytics.
  2. **Redis Cache:** For ultra-fast, live state sharing (10-second TTL).

### Step 3: Machine Learning Inference (The Brain)
* **The ML Agent:** A Python worker loops every 1.0 seconds, reading the absolute latest power states directly from Redis.
* **Appliance Classification:** It maintains a 10-second rolling buffer of power readings. It feeds this buffer into the trained **NILM Random Forest Model** to extract features (spikes, transitions, standard deviation) and mathematically guess which appliance is attached.
* **Anomaly Detection:** It compares the live wattage against a dynamically adjusting 7-day rolling average. If the power spikes beyond a configurable threshold (e.g., 1.5x normal load), it flags an anomaly.

### Step 4: Automated Load Shedding (The Control Loop)
* **The Decision:** If an anomaly is detected, the agent checks the facility's `PRIORITY_CONFIG`. If the device is not marked as `critical`, the agent initiates a load-shed.
* **The Command:** The agent publishes a JSON command `{"relay": false}` to the MQTT broker (topic: `sight/meters/<device_id>/cmd`).
* **The Execution:** The ESP32 firmware, which is actively listening to this command topic, receives the instruction. It safely toggles its GPIO pin to cut the physical relay, shedding the load and instantly dropping the facility's power consumption. It saves this new state to non-volatile EEPROM.