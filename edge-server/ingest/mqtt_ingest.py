"""
Sight Project – MQTT Ingest Service
Phase 2: Subscribe to MQTT telemetry, write to InfluxDB (90-day retention)
and update Redis live-state cache.
"""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt
import redis
from dotenv import load_dotenv
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

load_dotenv()

logger = logging.getLogger("sight.ingest")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────
MQTT_HOST   = os.getenv("MQTT_HOST", "broker")
MQTT_PORT   = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC  = os.getenv("MQTT_TOPIC", "sight/meters/+/telemetry")
MQTT_CLIENT = "sight_ingest"

INFLUX_URL    = os.getenv("INFLUX_URL",    "http://influxdb:8086")
INFLUX_TOKEN  = os.getenv("INFLUX_TOKEN",  "sight-super-secret-token")
INFLUX_ORG    = os.getenv("INFLUX_ORG",    "sight")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "telemetry")

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_TTL  = int(os.getenv("REDIS_TTL",  "10"))   # seconds – live-state expiry

# ──────────────────────────────────────────────────────────────────────────────
# Clients
# ──────────────────────────────────────────────────────────────────────────────
influx_client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
write_api     = influx_client.write_api(write_options=SYNCHRONOUS)

redis_client  = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


def _ensure_retention_policy() -> None:
    """Create 90-day retention policy bucket if it doesn't exist yet."""
    buckets_api = influx_client.buckets_api()
    for _ in range(12):
        try:
            existing = [b.name for b in buckets_api.find_buckets().buckets]
            if INFLUX_BUCKET not in existing:
                from influxdb_client.domain.bucket_retention_rules import BucketRetentionRules
                rule = BucketRetentionRules(type="expire", every_seconds=90 * 24 * 3600)
                buckets_api.create_bucket(
                    bucket_name=INFLUX_BUCKET,
                    retention_rules=rule,
                    org=INFLUX_ORG,
                )
                logger.info("Created bucket '%s' with 90-day retention", INFLUX_BUCKET)
            return
        except Exception as e:
            logger.warning("Could not connect to InfluxDB, retrying in 5s... (%s)", e)
            time.sleep(5)
    logger.error("Failed to connect to InfluxDB after retries.")


# ──────────────────────────────────────────────────────────────────────────────
# Message handler
# ──────────────────────────────────────────────────────────────────────────────
def on_message(client: mqtt.Client, userdata: None, msg: mqtt.MQTTMessage) -> None:  # noqa: ARG001
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except json.JSONDecodeError as exc:
        logger.warning("Bad JSON on %s: %s", msg.topic, exc)
        return

    device_id   = payload.get("device_id", "unknown")
    irms        = float(payload.get("irms_a",    0))
    vrms        = float(payload.get("vrms_v",    0))
    power_w     = float(payload.get("power_w",   0))
    energy_wh   = float(payload.get("energy_wh", 0))
    relay_state = bool(payload.get("relay_state", False))
    ts          = datetime.now(timezone.utc)

    # ── InfluxDB write ────────────────────────────────────────────────────────
    point = (
        Point("power_telemetry")
        .tag("device_id", device_id)
        .field("irms_a",    irms)
        .field("vrms_v",    vrms)
        .field("power_w",   power_w)
        .field("energy_wh", energy_wh)
        .field("relay",     int(relay_state))
        .time(ts, WritePrecision.S)
    )
    try:
        write_api.write(bucket=INFLUX_BUCKET, record=point)
    except Exception as exc:  # noqa: BLE001
        logger.error("InfluxDB write failed: %s", exc)

    # ── Redis live-state update ───────────────────────────────────────────────
    live_state = {
        "device_id":   device_id,
        "irms_a":      irms,
        "vrms_v":      vrms,
        "power_w":     power_w,
        "energy_wh":   energy_wh,
        "relay_state": int(relay_state),
        "updated_at":  ts.isoformat(),
    }
    key = f"sight:live:{device_id}"
    try:
        redis_client.setex(key, REDIS_TTL, json.dumps(live_state))
        # Also add device to known-devices set
        redis_client.sadd("sight:devices", device_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("Redis write failed: %s", exc)

    logger.info("[%s] P=%.2fW relay=%s", device_id, power_w, relay_state)


# ──────────────────────────────────────────────────────────────────────────────
# MQTT client setup
# ──────────────────────────────────────────────────────────────────────────────
def on_connect(client: mqtt.Client, userdata: None, flags: dict, rc: int) -> None:  # noqa: ARG001
    if rc == 0:
        logger.info("Connected to MQTT broker %s:%d", MQTT_HOST, MQTT_PORT)
        client.subscribe(MQTT_TOPIC, qos=1)
        logger.info("Subscribed to %s", MQTT_TOPIC)
    else:
        logger.error("MQTT connection failed: rc=%d", rc)


def on_disconnect(client: mqtt.Client, userdata: None, rc: int) -> None:  # noqa: ARG001
    if rc != 0:
        logger.warning("Unexpected MQTT disconnect rc=%d – will reconnect", rc)


def main() -> None:
    _ensure_retention_policy()

    client = mqtt.Client(client_id=MQTT_CLIENT, clean_session=True)
    client.on_connect    = on_connect
    client.on_message    = on_message
    client.on_disconnect = on_disconnect

    while True:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            client.loop_forever()
        except Exception as exc:  # noqa: BLE001
            logger.error("MQTT connection error: %s – retry in 5 s", exc)
            time.sleep(5)


if __name__ == "__main__":
    main()
