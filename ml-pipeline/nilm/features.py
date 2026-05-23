
from __future__ import annotations

import numpy as np
import pandas as pd


def extract_features(series: pd.Series, timestamp: pd.Timestamp | None = None) -> dict:
    """
    Compute NILM features from a 1-second window of power samples.

    Parameters
    ----------
    series : pd.Series
        Power readings (W) for the window (≥2 values required).
    timestamp : pd.Timestamp, optional
        Reference time for temporal context features.  Defaults to now.

    Returns
    -------
    dict with keys:
        mean, std, min, max, range,
        spike_count, transition_count,
        hour, day_of_week
    """
    if timestamp is None:
        timestamp = pd.Timestamp.now()

    arr = series.dropna().to_numpy(dtype=float)
    if len(arr) == 0:
        arr = np.array([0.0])

    mean  = float(np.mean(arr))
    std   = float(np.std(arr))
    vmin  = float(np.min(arr))
    vmax  = float(np.max(arr))
    vrange = vmax - vmin

    # Spikes: samples that deviate > 2σ from the mean
    spike_threshold = mean + 2.0 * std if std > 0 else mean * 1.5
    spike_count = int(np.sum(arr > spike_threshold))

    # Transitions: absolute step changes > 10% of mean
    if len(arr) > 1:
        diffs = np.abs(np.diff(arr))
        transition_threshold = max(mean * 0.10, 1.0)
        transition_count = int(np.sum(diffs > transition_threshold))
    else:
        transition_count = 0

    # Temporal context
    hour        = timestamp.hour
    day_of_week = timestamp.dayofweek  # 0 = Monday, 6 = Sunday

    return {
        "mean":             mean,
        "std":              std,
        "min":              vmin,
        "max":              vmax,
        "range":            vrange,
        "spike_count":      spike_count,
        "transition_count": transition_count,
        "hour":             hour,
        "day_of_week":      day_of_week,
    }


FEATURE_COLUMNS = [
    "mean",
    "std",
    "min",
    "max",
    "range",
    "spike_count",
    "transition_count",
    "hour",
    "day_of_week",
]


def features_to_vector(feature_dict: dict) -> np.ndarray:
    """Convert a feature dict to a 1-D numpy array in canonical column order."""
    return np.array([feature_dict[col] for col in FEATURE_COLUMNS], dtype=float)
