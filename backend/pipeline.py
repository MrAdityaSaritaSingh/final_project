# pipeline.py
# Master pipeline — wires Phase 1 (Generator) and Phase 2 (Scrutiny) together.
# Run this directly to go from raw GL file → Excel scrutiny report in one step.
#
# Usage:
#   python pipeline.py --input data/output/synthetic_gl.csv
#   python pipeline.py --input data/output/synthetic_gl.csv --no-ml

import argparse
import os
import time
import pandas as pd

from scrutiny.ingestor  import ingest, SchemaError
from scrutiny.engine    import run_all_rules
from scrutiny.exporter  import export
from scrutiny.ml.model  import train, predict, save_model


def run(input_path: str, output_path: str = None, use_ml: bool = True,
        contamination: float = 0.05) -> dict:
    """
    Full scrutiny pipeline.

    Phase 2a — Rule Engine (R1–R6):  flags known audit patterns
    Phase 2b — Isolation Forest:     flags statistical outliers

    Args:
        input_path    : path to GL .csv or .xlsx file
        output_path   : where to save the Excel report (optional)
        use_ml        : whether to also run Isolation Forest (default True)
        contamination : Isolation Forest contamination parameter

    Returns:
        dict with summary statistics
    """
    t_start = time.time()

    # ── Step 1: Ingest & validate ─────────────────────────────────────────────
    print(f"[1/4] Loading: {input_path}")
    df = ingest(input_path)
    print(f"      {len(df):,} rows loaded.")

    # ── Step 2: Rule-based detection (R1–R6) ──────────────────────────────────
    print("[2/4] Running rule engine (R1–R6) ...")
    df = run_all_rules(df)
    rule_flagged = df["scrutiny_flag"].sum()
    print(f"      {rule_flagged:,} rows flagged by rules.")

    # ── Step 3: ML anomaly detection (Isolation Forest) ───────────────────────
    if use_ml:
        print(f"[3/4] Training Isolation Forest (contamination={contamination}) ...")
        ml_pipeline = train(df, contamination=contamination)
        df = predict(df, ml_pipeline)
        save_model(ml_pipeline, "models/iforest.pkl")

        # Merge ML flags into scrutiny columns
        ml_only_mask = (df["ml_anomaly_flag"] == -1) & (~df["scrutiny_flag"])
        df.loc[ml_only_mask, "scrutiny_flag"] = True
        df.loc[ml_only_mask, "scrutiny_category"] = "ML Anomaly"
        df.loc[ml_only_mask, "scrutiny_reason"] = (
            "Statistical outlier detected by Isolation Forest (score: "
            + df.loc[ml_only_mask, "ml_anomaly_score"].round(4).astype(str)
            + ")"
        )
        ml_flagged = ml_only_mask.sum()
        print(f"      {ml_flagged:,} additional rows flagged by Isolation Forest.")
    else:
        print("[3/4] ML detection skipped (--no-ml).")

    # ── Step 4: Export ────────────────────────────────────────────────────────
    total_flagged = df["scrutiny_flag"].sum()
    output_path   = output_path or "data/output/scrutiny_report.xlsx"
    print(f"[4/4] Exporting {total_flagged:,} flagged rows -> {output_path}")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    export(df, output_path)

    elapsed = time.time() - t_start

    # ── Summary ───────────────────────────────────────────────────────────────
    summary = {
        "total_rows":     len(df),
        "rule_flagged":   int(rule_flagged),
        "ml_flagged":     int(ml_only_mask.sum()) if use_ml else 0,
        "total_flagged":  int(total_flagged),
        "pct_flagged":    round(total_flagged / len(df) * 100, 1),
        "elapsed_sec":    round(elapsed, 2),
        "output_path":    output_path,
    }

    print("\n-- Pipeline Summary -----------------------------------------")
    for k, v in summary.items():
        print(f"  {k:<18}: {v}")
    print("-------------------------------------------------------------\n")

    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the full audit scrutiny pipeline.")
    parser.add_argument("--input",         required=True, help="Path to GL .csv or .xlsx")
    parser.add_argument("--output",        default=None,  help="Output Excel report path")
    parser.add_argument("--no-ml",         action="store_true", help="Skip Isolation Forest")
    parser.add_argument("--contamination", type=float, default=0.05,
                        help="Isolation Forest contamination rate (default 0.05)")
    args = parser.parse_args()

    try:
        run(
            input_path=args.input,
            output_path=args.output,
            use_ml=not args.no_ml,
            contamination=args.contamination,
        )
    except SchemaError as e:
        print(f"\n[Schema Error] {e}")
