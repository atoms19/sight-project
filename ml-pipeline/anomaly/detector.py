"""
Sight Project – Anomaly Detection Engine
Phase 3: Compare live load against 7-day rolling average; trigger
automated load-shedding while respecting priority config and manual overrides.
"""

from __future__ import annotations

import json
import logging
import os
from collections import deque
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("sight.anomaly")

# ──────────────────────────────────────────────────────────────────────────────
# Default priority configuration
# Lower number  → higher priority (will NOT be shed first)
# critical: True → never auto-shed
# ──────────────────────────────────────────────────────────────────────────────
DEFAULT_PRIORITY_CONFIG: dict[str, dict] = {
    "esp32_meter_01": {"priority": 1, "critical": True,  "name": "Medical Equipment"},
    "esp32_meter_02": {"priority": 2, "critical": True,  "name": "Server Room"},
    "esp32_meter_03": {"priority": 3, "critical": False, "name": "HVAC Zone A"},
    "esp32_meter_04": {"priority": 4, "critical": False, "name": "Lighting Floor 2"},
    "esp32_meter_05": {"priority": 5, "critical": False, "name": "EV Charger"},
}

ANOMALY_THRESHOLD = float(os.getenv("ANOMALY_THRESHOLD", "1.5"))  # × rolling avg
ROLLING_WINDOW    = int(os.getenv("ROLLING_WINDOW",    str(7 * 24 * 3600)))  # seconds (7 days)
SHED_COOLDOWN_S   = int(os.getenv("SHED_COOLDOWN_S",  "300"))                # 5 min between sheds


class RollingAverage:
    """Time-aware rolling average over a configurable window (in seconds)."""

    def __init__(self, window_seconds: int = ROLLING_WINDOW) -> None:
        self._window = window_seconds
        # deque of (epoch_seconds, value)
        self._buf: deque[tuple[float, float]] = deque()
        self._running_sum = 0.0  # Track running sum for O(1) average

    def add(self, value: float, ts: float | None = None) -> None:
        now = ts if ts is not None else datetime.now(timezone.utc).timestamp()
        self._buf.append((now, value))
        self._running_sum += value  # Add new value to sum
        cutoff = now - self._window
        while self._buf and self._buf[0][0] < cutoff:
            _, popped_val = self._buf.popleft()
            self._running_sum -= popped_val  # Subtract old value from sum

    @property
    def average(self) -> float:
        if not self._buf:
            return 0.0
        return self._running_sum / len(self._buf)

    @property
    def count(self) -> int:
        return len(self._buf)


class AnomalyDetector:
    """
    Per-device anomaly detector with load-shedding capability.

    Attributes
    ----------
    priority_config : dict
        Mapping of device_id → {priority, critical, name}.
    overrides : dict
        Manual relay override flags persisted per device_id.
    """

    def __init__(
        self,
        priority_config: dict[str, dict] | None = None,
        threshold: float = ANOMALY_THRESHOLD,
    ) -> None:
        self.priority_config: dict[str, dict] = priority_config or DEFAULT_PRIORITY_CONFIG
        self.threshold = threshold
        self._rolling: dict[str, RollingAverage] = {}
        self._overrides: dict[str, bool] = {}          # device_id → manual relay state
        self._last_shed: dict[str, float] = {}         # device_id → epoch of last shed

    # ── Public API ────────────────────────────────────────────────────────────

    def ingest(self, device_id: str, power_w: float, ts: float | None = None) -> dict[str, Any]:
        """
        Record a live power reading and evaluate for anomaly / load-shed.

        Returns a result dict with keys:
            device_id, power_w, rolling_avg, ratio, anomaly, shed, reason
        """
        if device_id not in self._rolling:
            self._rolling[device_id] = RollingAverage()

        ra = self._rolling[device_id]
        ra.add(power_w, ts)
        avg   = ra.average
        ratio = (power_w / avg) if avg > 0 else 0.0

        anomaly = ratio >= self.threshold and ra.count > 10  # warm-up guard
        shed    = False
        reason  = ""

        if anomaly:
            shed, reason = self._evaluate_shed(device_id, ts)

        return {
            "device_id":   device_id,
            "power_w":     power_w,
            "rolling_avg": avg,
            "ratio":       ratio,
            "anomaly":     anomaly,
            "shed":        shed,
            "reason":      reason,
        }

    def set_override(self, device_id: str, relay: bool) -> None:
        """Record a manual relay override (disables auto-shed for this device)."""
        self._overrides[device_id] = relay
        logger.info("[override] %s relay=%s", device_id, relay)

    def clear_override(self, device_id: str) -> None:
        self._overrides.pop(device_id, None)
        logger.info("[override] %s cleared", device_id)

    def get_rolling_averages(self) -> dict[str, float]:
        return {did: ra.average for did, ra in self._rolling.items()}

    # ── Internal ──────────────────────────────────────────────────────────────

    def _evaluate_shed(self, device_id: str, ts: float | None) -> tuple[bool, str]:
        now = ts or datetime.now(timezone.utc).timestamp()

        # 1. Manual override prevents auto-shed
        if device_id in self._overrides:
            return False, "manual_override_active"

        # 2. Critical loads are never auto-shed
        cfg = self.priority_config.get(device_id, {})
        if cfg.get("critical", False):
            return False, "critical_load_protected"

        # 3. Cooldown guard
        last = self._last_shed.get(device_id, 0.0)
        if now - last < SHED_COOLDOWN_S:
            return False, f"cooldown ({SHED_COOLDOWN_S}s)"

        # 4. Approve shed
        self._last_shed[device_id] = now
        name = cfg.get("name", device_id)
        logger.warning("[SHED] Triggering load-shed for %s (%s)", device_id, name)
        return True, f"anomaly_threshold_exceeded (priority={cfg.get('priority', 99)})"
