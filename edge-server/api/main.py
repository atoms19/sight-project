"""
Sight Project – FastAPI Backend
Phase 2: REST + WebSocket API for live monitoring and relay command overrides.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import paho.mqtt.publish as mqtt_publish
import redis.asyncio as aioredis
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from influxdb_client.client.influxdb_client_async import InfluxDBClientAsync
from pydantic import BaseModel

from api.weather import router as weather_router, weather_ingest_loop

load_dotenv()

logger = logging.getLogger("sight.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ──────────────────────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────────────────────
INFLUX_URL    = os.getenv("INFLUX_URL",    "http://influxdb:8086")
INFLUX_TOKEN  = os.getenv("INFLUX_TOKEN",  "sight-super-secret-token")
INFLUX_ORG    = os.getenv("INFLUX_ORG",    "sight")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "telemetry")

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

MQTT_HOST  = os.getenv("MQTT_HOST", "broker")
MQTT_PORT  = int(os.getenv("MQTT_PORT", "1883"))

WS_PUSH_INTERVAL = 1.0  # seconds (1 Hz)

# ──────────────────────────────────────────────────────────────────────────────
# Lifespan – replaces deprecated @app.on_event
# ──────────────────────────────────────────────────────────────────────────────
redis_pool: aioredis.Redis | None = None
influx_client: InfluxDBClientAsync | None = None


@asynccontextmanager
async def lifespan(application: FastAPI):  # noqa: ARG001
    global redis_pool, influx_client
    redis_pool    = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    influx_client = InfluxDBClientAsync(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    
    application.state.redis = redis_pool
    application.state.influx = influx_client
    application.state.bucket = INFLUX_BUCKET
    weather_task = asyncio.create_task(weather_ingest_loop(application))
    
    logger.info("Sight API started")
    yield
    weather_task.cancel()
    if redis_pool:
        await redis_pool.aclose()
    if influx_client:
        await influx_client.close()


# ──────────────────────────────────────────────────────────────────────────────
# App
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Sight API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(weather_router)


# ──────────────────────────────────────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────────────────────────────────────
class RelayCommand(BaseModel):
    relay: bool


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
async def _get_live_state(device_id: str) -> dict[str, Any]:
    raw = await redis_pool.get(f"sight:live:{device_id}")
    if raw is None:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found or offline")
    return json.loads(raw)


async def _query_history(device_id: str, range_str: str = "-1h") -> list[dict]:
    query = f"""
    from(bucket: "{INFLUX_BUCKET}")
      |> range(start: {range_str})
      |> filter(fn: (r) => r._measurement == "power_telemetry")
      |> filter(fn: (r) => r.device_id == "{device_id}")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"])
    """
    query_api = influx_client.query_api()
    tables    = await query_api.query(query)
    rows: list[dict] = []
    for table in tables:
        for record in table.records:
            rows.append({
                "time":      record.get_time().isoformat(),
                "power_w":   record.values.get("power_w", 0),
                "irms_a":    record.values.get("irms_a", 0),
                "vrms_v":    record.values.get("vrms_v", 0),
                "energy_wh": record.values.get("energy_wh", 0),
                "relay":     record.values.get("relay", 0),
            })
    return rows


# ──────────────────────────────────────────────────────────────────────────────
# REST endpoints
# ──────────────────────────────────────────────────────────────────────────────
CARBON_INTENSITY_KG_PER_KWH = float(os.getenv("CARBON_INTENSITY_KG_PER_KWH", "0.429"))  # Global avg roughly

@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/devices")
async def list_devices() -> dict:
    members = await redis_pool.smembers("sight:devices")
    return {"devices": list(members)}


@app.get("/devices/{device_id}/live")
async def live_state(device_id: str) -> dict:
    return await _get_live_state(device_id)


@app.get("/devices/{device_id}/history")
async def history(device_id: str, range: str = "-1h") -> dict:
    rows = await _query_history(device_id, range)
    return {"device_id": device_id, "range": range, "data": rows}


@app.post("/devices/{device_id}/relay")
async def set_relay(device_id: str, cmd: RelayCommand) -> dict:
    payload = json.dumps({"relay": cmd.relay})
    topic   = f"sight/meters/{device_id}/cmd"
    try:
        await asyncio.to_thread(
            mqtt_publish.single,
            topic,
            payload=payload,
            hostname=MQTT_HOST,
            port=MQTT_PORT,
            qos=1,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"MQTT publish failed: {exc}") from exc

    # Optimistically update Redis override flag
    override_key = f"sight:override:{device_id}"
    await redis_pool.setex(override_key, 86400, json.dumps({"relay": cmd.relay}))

    return {"device_id": device_id, "relay": cmd.relay, "status": "sent"}


@app.get("/esg/summary")
async def esg_summary(range: str = "-30d") -> dict:
    """Calculate ESG Carbon Footprint across all devices for a given range."""
    # This query sums the total Wh recorded across all measurements in the range
    query = f"""
    from(bucket: "{INFLUX_BUCKET}")
      |> range(start: {range})
      |> filter(fn: (r) => r._measurement == "power_telemetry")
      |> filter(fn: (r) => r._field == "energy_wh")
      |> group()
      |> sum()
    """
    try:
        query_api = influx_client.query_api()
        tables    = await query_api.query(query)
        
        total_energy_wh = 0.0
        for table in tables:
            for record in table.records:
                total_energy_wh += float(record.get_value() or 0.0)
                
        total_kwh = total_energy_wh / 1000.0
        total_co2_kg = total_kwh * CARBON_INTENSITY_KG_PER_KWH
        
        # Estimate 'saved' by assuming the anomaly detector shaved off 5% of peak load
        # In a real system, we would query the specific shed events
        saved_co2_kg = total_co2_kg * 0.05 
        
        return {
            "range": range,
            "total_energy_kwh": round(total_kwh, 2),
            "total_co2_kg": round(total_co2_kg, 2),
            "saved_co2_kg": round(saved_co2_kg, 2),
            "intensity_factor": CARBON_INTENSITY_KG_PER_KWH
        }
    except Exception as exc:
        logger.error("ESG Summary error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to calculate ESG metrics")

# ──────────────────────────────────────────────────────────────────────────────
# WebSocket – 1 Hz live push
# ──────────────────────────────────────────────────────────────────────────────
@app.websocket("/ws/{device_id}")
async def websocket_endpoint(websocket: WebSocket, device_id: str) -> None:
    await websocket.accept()
    logger.info("WebSocket connected: %s", device_id)
    try:
        while True:
            try:
                state = await _get_live_state(device_id)
                await websocket.send_text(json.dumps(state))
            except HTTPException:
                await websocket.send_text(json.dumps({"error": "device offline"}))
            await asyncio.sleep(WS_PUSH_INTERVAL)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", device_id)
