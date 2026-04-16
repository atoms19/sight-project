"""
Tests for NILM feature extraction.
"""

import sys
import os

# Allow importing from ml-pipeline directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../ml-pipeline"))

import numpy as np
import pandas as pd
import pytest

from nilm.features import extract_features, features_to_vector, FEATURE_COLUMNS


class TestExtractFeatures:

    def test_basic_statistics(self):
        series = pd.Series([100.0, 110.0, 90.0, 105.0, 95.0])
        feats  = extract_features(series)

        assert feats["mean"] == pytest.approx(100.0, rel=1e-3)
        assert feats["min"]  == pytest.approx(90.0,  rel=1e-3)
        assert feats["max"]  == pytest.approx(110.0, rel=1e-3)
        assert feats["range"]== pytest.approx(20.0,  rel=1e-3)
        assert feats["std"]  >= 0

    def test_spike_detection(self):
        # Mean ≈ 100, std ≈ 5 → spike threshold ≈ 110
        values = [100.0] * 8 + [500.0]  # one clear spike
        series = pd.Series(values)
        feats  = extract_features(series)
        assert feats["spike_count"] >= 1

    def test_transition_detection(self):
        # Large step change between adjacent samples
        series = pd.Series([50.0, 200.0, 200.0, 200.0])
        feats  = extract_features(series)
        assert feats["transition_count"] >= 1

    def test_temporal_context(self):
        ts    = pd.Timestamp("2024-03-15 09:30:00")  # Friday 9:30
        feats = extract_features(pd.Series([100.0]), timestamp=ts)
        assert feats["hour"]        == 9
        assert feats["day_of_week"] == 4  # Friday = 4

    def test_single_value(self):
        """Single value should not raise."""
        feats = extract_features(pd.Series([42.0]))
        assert feats["mean"] == pytest.approx(42.0)
        assert feats["std"]  == pytest.approx(0.0)

    def test_empty_series_handled(self):
        """Empty series falls back gracefully to zeros."""
        feats = extract_features(pd.Series([], dtype=float))
        assert feats["mean"] == pytest.approx(0.0)

    def test_all_feature_keys_present(self):
        feats = extract_features(pd.Series([1.0, 2.0, 3.0]))
        for col in FEATURE_COLUMNS:
            assert col in feats, f"Missing feature key: {col}"

    def test_features_to_vector_shape(self):
        feats = extract_features(pd.Series([100.0, 200.0]))
        vec   = features_to_vector(feats)
        assert vec.shape == (len(FEATURE_COLUMNS),)
        assert vec.dtype == float

    def test_features_to_vector_order(self):
        feats = extract_features(pd.Series([100.0, 200.0]))
        vec   = features_to_vector(feats)
        for i, col in enumerate(FEATURE_COLUMNS):
            assert vec[i] == pytest.approx(feats[col])
