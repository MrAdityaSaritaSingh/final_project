# scrutiny/ml/model.py
# Isolation Forest anomaly detection model.
# Wraps sklearn's IsolationForest in a clean train/predict/save/load interface.
# Works alongside the rule-based engine (R1-R6) as a second detection layer
# that catches statistical anomalies the rules would miss.

import os
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from .feature_engineering import extract_features


def build_pipeline(contamination: float = 0.05) -> Pipeline:
    """
    Build a scikit-learn pipeline: StandardScaler → IsolationForest.

    Args:
        contamination : expected fraction of anomalies (0.0–0.5).
                        0.05 = 5% of rows expected to be anomalous.
                        Increase to 0.10 if you want more flags.
                        Decrease to 0.02 for a stricter filter.
    Returns:
        sklearn Pipeline (not yet fitted)
    """
    return Pipeline([
        ("scaler", StandardScaler()),
        ("iforest", IsolationForest(
            n_estimators=200,     # more trees → more stable scores
            contamination=contamination,
            max_samples="auto",   # auto = min(256, n_samples)
            max_features=1.0,     # use all 12 features
            bootstrap=False,
            random_state=42,
            n_jobs=-1,            # use all available CPU cores
        )),
    ])


def train(df: pd.DataFrame, contamination: float = 0.05) -> Pipeline:
    """
    Extract features from the GL DataFrame and fit the Isolation Forest.

    Args:
        df            : clean GL DataFrame (output of ingestor.ingest())
        contamination : expected fraction of anomalies

    Returns:
        Fitted sklearn Pipeline
    """
    X = extract_features(df)
    pipeline = build_pipeline(contamination)
    pipeline.fit(X)
    return pipeline


def predict(df: pd.DataFrame, pipeline: Pipeline) -> pd.DataFrame:
    """
    Run the fitted Isolation Forest on the GL DataFrame.

    Adds two columns to the DataFrame:
    - ml_anomaly_flag  : -1 = anomaly, 1 = normal
    - ml_anomaly_score : continuous score (more negative = more anomalous)

    Args:
        df       : clean GL DataFrame
        pipeline : fitted Pipeline from train()

    Returns:
        DataFrame with ml_anomaly_flag and ml_anomaly_score columns added
    """
    X = extract_features(df)
    df = df.copy()
    df["ml_anomaly_flag"]  = pipeline.predict(X)            # -1 or 1
    df["ml_anomaly_score"] = pipeline.decision_function(X)  # continuous score
    return df


def save_model(pipeline: Pipeline, path: str = "models/iforest.pkl") -> None:
    """Save a fitted pipeline to disk."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(pipeline, path)
    print(f"Model saved -> {path}")


def load_model(path: str = "models/iforest.pkl") -> Pipeline:
    """Load a previously saved pipeline from disk."""
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"No saved model found at '{path}'. "
            f"Run train() first and save the result with save_model()."
        )
    return joblib.load(path)
