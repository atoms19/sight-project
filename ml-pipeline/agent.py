"""
Sight Project – ML Agent
Phase 3: Orchestrates NILM inference and anomaly detection in a continuous loop.
Reads live state from Redis, publishes shed commands via MQTT.
"""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import timezone, datetime
from concurrent.futures import ThreadPoolExecutor

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import paho.mqtt.publish as mqtt_publish
import redis

from anomaly.detector import AnomalyDetector
from nilm.features import extract_features
from nilm.classifier import predict, load_model

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("sight.agent")

REDIS_HOST    = os.getenv("REDIS_HOST", "redis")
REDIS_PORT    = int(os.getenv("REDIS_PORT", "6379"))
MQTT_HOST     = os.getenv("MQTT_HOST", "broker")
MQTT_PORT     = int(os.getenv("MQTT_PORT", "1883"))
LOOP_INTERVAL = float(os.getenv("AGENT_INTERVAL", "1.0"))  # seconds

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
detector     = AnomalyDetector()

# Cache for power series per device (last N readings for NILM)
_power_cache: dict[str, list[float]] = {}
NILM_WINDOW = 10  # samples


def _get_all_live_states() -> list[dict]:
    devices = redis_client.smembers("sight:devices")
    states  = []
    for did in devices:
        raw = redis_client.get(f"sight:live:{did}")
        if raw:
            states.append(json.loads(raw))
    return states


def _publish_shed(device_id: str) -> None:
    topic   = f"sight/meters/{device_id}/cmd"
    payload = json.dumps({"relay": False})
    try:
        mqtt_publish.single(topic, payload=payload, hostname=MQTT_HOST, port=MQTT_PORT, qos=1)
        logger.info("[SHED] Published relay=OFF to %s", device_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("MQTT publish error for %s: %s", device_id, exc)


def _check_override(device_id: str) -> bool:
    """Return True if a manual override is set for this device."""
    raw = redis_client.get(f"sight:override:{device_id}")
    if raw:
        override = json.loads(raw)
        return True  # Override exists
    return False


def _process_device(state: dict, nilm_model) -> None:
    try:
        device_id = state["device_id"]
        power_w   = float(state.get("power_w", 0))
        ts        = datetime.now(timezone.utc).timestamp()

        # ── NILM inference ────────────────────────────────────────────
        cache = _power_cache.setdefault(device_id, [])
        cache.append(power_w)
        if len(cache) > NILM_WINDOW:
            cache.pop(0)

        if nilm_model and len(cache) >= 2:
            series  = pd.Series(cache)
            feats   = extract_features(series)
            label   = predict(feats, nilm_model)
            # Store inference result in Redis
            redis_client.setex(
                f"sight:nilm:{device_id}",
                10,
                json.dumps({"appliance": label, "power_w": power_w}),
            )

        # ── Check for manual override ─────────────────────────────────
        if _check_override(device_id):
            detector.set_override(device_id, True)
        else:
            detector.clear_override(device_id)

        # ── Anomaly detection + load-shedding ─────────────────────────
        result = detector.ingest(device_id, power_w, ts)
        if result["anomaly"]:
            logger.warning(
                "[ANOMALY] %s power=%.2fW avg=%.2fW ratio=%.2f",
                device_id, power_w, result["rolling_avg"], result["ratio"],
            )
        if result["shed"]:
            _publish_shed(device_id)

        # Store anomaly result in Redis
        redis_client.setex(
            f"sight:anomaly:{device_id}",
            30,
            json.dumps({k: result[k] for k in ("anomaly", "ratio", "rolling_avg", "shed", "reason")}),
        )
    except Exception as exc:
        logger.error("Error processing device %s: %s", state.get("device_id", "unknown"), exc)

def main() -> None:
    logger.info("Sight ML Agent started")

    try:
        nilm_model = load_model()
        logger.info("Loaded NILM model from disk")
    except FileNotFoundError:
        nilm_model = None
        logger.warning("No NILM model found – NILM classification disabled")

    max_workers = int(os.getenv("MAX_WORKERS", "20"))
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        while True:
            try:
                states = _get_all_live_states()
                
                # Submit tasks for all devices to run in parallel
                futures = [executor.submit(_process_device, state, nilm_model) for state in states]
                
                # Wait for all tasks in this tick to complete
                for future in futures:
                    future.result()
                    
            except Exception as exc:  # noqa: BLE001
                logger.error("Agent loop error: %s", exc)

            time.sleep(LOOP_INTERVAL)


if __name__ == "__main__":
    main()
