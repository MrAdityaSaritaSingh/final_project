# scrutiny/ml/feature_engineering.py
# Feature engineering for the Isolation Forest ML model.
# Extracts 12 numeric features from the GL DataFrame that capture
# the statistical characteristics most relevant for anomaly detection.

import numpy as np
import pandas as pd


FEATURE_COLUMNS = [
    "amount",
    "log_amount",
    "is_round_1000",
    "is_round_10000",
    "day_of_week",
    "day_of_month",
    "is_weekend",
    "is_period_end",
    "month",
    "narration_len",
    "is_manual_journal",
    "account_freq",
    "amount_zscore",
]


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract 12 numeric features from a GL DataFrame.
    All output columns are numeric — ready for StandardScaler + Isolation Forest.

    Feature descriptions:
    - amount           : raw transaction amount
    - log_amount       : log1p(amount) — reduces right-skew
    - is_round_1000    : 1 if amount % 1000 == 0
    - is_round_10000   : 1 if amount % 10000 == 0
    - day_of_week      : 0=Monday … 6=Sunday
    - day_of_month     : 1–31 (high values = period-end risk)
    - is_weekend       : 1 if Saturday or Sunday
    - is_period_end    : 1 if day_of_month >= 26 (last ~5 days)
    - month            : 1–12
    - narration_len    : character count (low = weak narration risk)
    - is_manual_journal: 1 if voucher_type in ['Journal','JV']
    - account_freq     : how common this ledger account is (rare = higher risk)
    - amount_zscore    : z-score of amount within each ledger account group
    """
    dates     = pd.to_datetime(df["date"])
    narration = df["narration"].fillna("").astype(str)
    vt        = df["voucher_type"].fillna("").str.strip().str.upper()

    features = pd.DataFrame(index=df.index)

    # ── Amount features ───────────────────────────────────────────────────────
    features["amount"]        = df["amount"]
    features["log_amount"]    = np.log1p(df["amount"].abs())
    features["is_round_1000"] = ((df["amount"] % 1000 == 0) & (df["amount"] != 0)).astype(int)
    features["is_round_10000"]= ((df["amount"] % 10000 == 0) & (df["amount"] != 0)).astype(int)

    # ── Date features ─────────────────────────────────────────────────────────
    features["day_of_week"]   = dates.dt.dayofweek
    features["day_of_month"]  = dates.dt.day
    features["is_weekend"]    = (dates.dt.dayofweek >= 5).astype(int)
    features["is_period_end"] = (dates.dt.day >= 26).astype(int)
    features["month"]         = dates.dt.month

    # ── Narration features ────────────────────────────────────────────────────
    features["narration_len"] = narration.str.len()

    # ── Voucher type ──────────────────────────────────────────────────────────
    features["is_manual_journal"] = vt.isin({"JOURNAL", "JV", "JOURNAL VOUCHER"}).astype(int)

    # ── Account frequency (rare account = unusual = higher anomaly risk) ──────
    acct_freq = df["ledger_name"].value_counts(normalize=True)
    features["account_freq"] = df["ledger_name"].map(acct_freq).fillna(0.0)

    # ── Amount z-score within each ledger account ─────────────────────────────
    acct_mean = df.groupby("ledger_name")["amount"].transform("mean")
    acct_std  = df.groupby("ledger_name")["amount"].transform("std").fillna(1.0)
    acct_std  = acct_std.replace(0, 1.0)
    features["amount_zscore"] = (df["amount"] - acct_mean) / acct_std

    result = features[FEATURE_COLUMNS].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    return result
