"""
Tests for the anomaly detection engine.
"""

import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../ml-pipeline"))

import pytest
from anomaly.detector import AnomalyDetector, RollingAverage, DEFAULT_PRIORITY_CONFIG


class TestRollingAverage:

    def test_empty_average(self):
        ra = RollingAverage(window_seconds=60)
        assert ra.average == 0.0
        assert ra.count   == 0

    def test_single_value(self):
        ra = RollingAverage(window_seconds=60)
        ra.add(100.0, ts=1000.0)
        assert ra.average == pytest.approx(100.0)
        assert ra.count   == 1

    def test_multiple_values(self):
        ra = RollingAverage(window_seconds=60)
        ra.add(100.0, ts=1000.0)
        ra.add(200.0, ts=1001.0)
        assert ra.average == pytest.approx(150.0)

    def test_window_expiry(self):
        ra = RollingAverage(window_seconds=10)
        ra.add(100.0, ts=0.0)
        ra.add(200.0, ts=15.0)  # first sample falls outside window
        assert ra.count   == 1
        assert ra.average == pytest.approx(200.0)

    def test_window_keeps_recent(self):
        ra = RollingAverage(window_seconds=5)
        for i in range(5):
            ra.add(float(i * 10), ts=float(i))
        # All within window
        assert ra.count == 5


class TestAnomalyDetector:

    def _warm_detector(self, detector: AnomalyDetector, device_id: str,
                       value: float = 100.0, n: int = 15) -> None:
        """Feed enough samples to pass the warm-up guard (uses real timestamps)."""
        for _ in range(n):
            detector.ingest(device_id, value)

    def test_no_anomaly_normal_load(self):
        det = AnomalyDetector(threshold=1.5)
        self._warm_detector(det, "dev1", value=100.0)
        result = det.ingest("dev1", 105.0)
        assert result["anomaly"] is False

    def test_anomaly_detected_on_spike(self):
        det = AnomalyDetector(threshold=1.5)
        self._warm_detector(det, "dev1", value=100.0)
        result = det.ingest("dev1", 300.0)  # 3× average
        assert result["anomaly"] is True

    def test_no_shed_for_critical_load(self):
        priority = {
            "critical_dev": {"priority": 1, "critical": True, "name": "Medical"},
        }
        det    = AnomalyDetector(priority_config=priority, threshold=1.5)
        self._warm_detector(det, "critical_dev", value=100.0)
        result = det.ingest("critical_dev", 300.0)
        assert result["anomaly"] is True
        assert result["shed"]    is False
        assert "critical" in result["reason"]

    def test_shed_triggered_for_non_critical(self):
        priority = {
            "non_critical": {"priority": 5, "critical": False, "name": "EV Charger"},
        }
        det = AnomalyDetector(priority_config=priority, threshold=1.5)
        self._warm_detector(det, "non_critical", value=100.0, n=15)
        result = det.ingest("non_critical", 300.0)
        assert result["anomaly"] is True
        assert result["shed"]    is True

    def test_manual_override_blocks_shed(self):
        priority = {
            "dev2": {"priority": 5, "critical": False, "name": "HVAC"},
        }
        det = AnomalyDetector(priority_config=priority, threshold=1.5)
        det.set_override("dev2", True)
        self._warm_detector(det, "dev2", value=100.0)
        result = det.ingest("dev2", 300.0)
        assert result["shed"]   is False
        assert "override" in result["reason"]

    def test_clear_override_allows_shed(self):
        priority = {
            "dev3": {"priority": 5, "critical": False, "name": "Lighting"},
        }
        det = AnomalyDetector(priority_config=priority, threshold=1.5)
        det.set_override("dev3", True)
        det.clear_override("dev3")
        self._warm_detector(det, "dev3", value=100.0, n=15)
        result = det.ingest("dev3", 300.0)
        assert result["shed"] is True

    def test_shed_cooldown_enforced(self):
        priority = {
            "dev4": {"priority": 5, "critical": False, "name": "Pump"},
        }
        det = AnomalyDetector(priority_config=priority, threshold=1.5)
        self._warm_detector(det, "dev4", value=100.0, n=15)
        r1 = det.ingest("dev4", 300.0)
        r2 = det.ingest("dev4", 300.0)  # immediately after
        assert r1["shed"] is True
        assert r2["shed"] is False  # cooldown active

    def test_rolling_averages_returned(self):
        det = AnomalyDetector()
        det.ingest("devX", 50.0)
        det.ingest("devX", 150.0)
        avgs = det.get_rolling_averages()
        assert "devX" in avgs
        assert avgs["devX"] == pytest.approx(100.0)

    def test_warm_up_guard(self):
        """Should NOT trigger anomaly before 10 samples."""
        det = AnomalyDetector(threshold=1.5)
        for i in range(9):
            result = det.ingest("dev5", 100.0, ts=float(i))
        result = det.ingest("dev5", 300.0, ts=9.0)
        assert result["anomaly"] is False
