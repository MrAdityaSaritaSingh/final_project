# agents/detector_agent.py
# DetectorAgent — runs R1-R6 rule engine + Isolation Forest ML model.
# Responsibilities:
#   - Apply all 6 rule-based scrutiny checks
#   - Optionally run Isolation Forest for statistical outlier detection
#   - Merge ML flags into the unified scrutiny columns
#   - Return the flagged DataFrame with summary counts

from .base_agent import BaseAgent
from scrutiny.engine import run_all_rules
from scrutiny.ml.model import train, predict


class DetectorAgent(BaseAgent):
    """
    Stage 2 of the audit pipeline.

    Accepted payload keys:
        df (pd.DataFrame) : clean GL DataFrame from ValidatorAgent

    Returned payload keys (merged with incoming payload):
        df            (pd.DataFrame) : GL with scrutiny_flag, scrutiny_category,
                                       scrutiny_reason, ml_anomaly_flag (if ML used)
        rule_flagged  (int)          : rows flagged by R1-R6 rules
        ml_flagged    (int)          : rows flagged exclusively by Isolation Forest
        total_flagged (int)          : total rows flagged by either layer
    """

    def __init__(self, use_ml: bool = True, contamination: float = 0.05):
        """
        Args:
            use_ml        : whether to run Isolation Forest (default True)
            contamination : expected fraction of anomalies (default 0.05)
        """
        super().__init__("DetectorAgent")
        self.use_ml = use_ml
        self.contamination = contamination

    def _execute(self, payload: dict) -> dict:
        df = payload["df"]

        # ── Phase 2a: Rule engine (R1–R6) ─────────────────────────────────────
        self.log("Running rule engine (R1–R6) ...")
        df = run_all_rules(df)
        rule_flagged = int(df["scrutiny_flag"].sum())
        self.log(f"Rules flagged {rule_flagged:,} of {len(df):,} rows.")

        ml_flagged = 0

        # ── Phase 2b: Isolation Forest ─────────────────────────────────────────
        if self.use_ml:
            self.log(
                f"Training Isolation Forest (contamination={self.contamination}) ..."
            )
            ml_pipeline = train(df, contamination=self.contamination)
            df = predict(df, ml_pipeline)

            # Only promote ML flags for rows not already caught by rules
            ml_only_mask = (df["ml_anomaly_flag"] == -1) & (~df["scrutiny_flag"])
            df.loc[ml_only_mask, "scrutiny_flag"]     = True
            df.loc[ml_only_mask, "scrutiny_category"] = "ML Anomaly"
            df.loc[ml_only_mask, "scrutiny_reason"]   = (
                "Statistical outlier detected by Isolation Forest (score: "
                + df.loc[ml_only_mask, "ml_anomaly_score"].round(4).astype(str)
                + ")"
            )

            ml_flagged = int(ml_only_mask.sum())
            self.log(f"Isolation Forest flagged {ml_flagged:,} additional rows.")
        else:
            self.log("ML detection skipped (use_ml=False).")

        total_flagged = int(df["scrutiny_flag"].sum())
        pct = round(total_flagged / len(df) * 100, 1) if len(df) else 0
        self.log(f"Total flagged: {total_flagged:,} ({pct}%).")

        return {
            **payload,
            "df":            df,
            "rule_flagged":  rule_flagged,
            "ml_flagged":    ml_flagged,
            "total_flagged": total_flagged,
        }
