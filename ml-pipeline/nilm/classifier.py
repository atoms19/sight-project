"""
Sight Project – NILM Random Forest Classifier
Phase 3: Train and infer appliance type from NILM feature vectors.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from nilm.features import FEATURE_COLUMNS, extract_features, features_to_vector

logger = logging.getLogger("sight.nilm")

MODEL_PATH = Path(os.getenv("MODEL_PATH", "/models/nilm_rf.pkl"))

# Appliance classes – extend as needed
APPLIANCE_LABELS = [
    "idle",
    "lighting",
    "hvac",
    "refrigerator",
    "washing_machine",
    "ev_charger",
    "unknown",
]


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])


def train(
    df: pd.DataFrame,
    label_col: str = "appliance",
    test_size: float = 0.2,
) -> Pipeline:
    """
    Train the NILM classifier.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain FEATURE_COLUMNS + label_col.
    label_col : str
        Column name for ground-truth appliance labels.
    test_size : float
        Fraction held out for evaluation.

    Returns
    -------
    Trained Pipeline.
    """
    X = df[FEATURE_COLUMNS].to_numpy(dtype=float)
    y = df[label_col].to_numpy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=42
    )

    pipe = build_pipeline()
    pipe.fit(X_train, y_train)

    accuracy = pipe.score(X_test, y_test)
    logger.info("NILM classifier trained – test accuracy=%.4f", accuracy)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, MODEL_PATH)
    logger.info("Model saved to %s", MODEL_PATH)

    return pipe


def load_model() -> Pipeline:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained NILM model not found at {MODEL_PATH}. "
            "Run train() first or provide a pre-trained model."
        )
    return joblib.load(MODEL_PATH)


def predict(feature_dict: dict, pipeline: Pipeline | None = None) -> str:
    """
    Classify the current load appliance from a feature dict.

    Parameters
    ----------
    feature_dict : dict
        Output of nilm.features.extract_features().
    pipeline : Pipeline, optional
        Pass a pre-loaded pipeline to avoid disk I/O per call.

    Returns
    -------
    str – predicted appliance label.
    """
    if pipeline is None:
        pipeline = load_model()

    vec = features_to_vector(feature_dict).reshape(1, -1)
    label = pipeline.predict(vec)[0]
    return str(label)
