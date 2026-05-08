# scrutiny/engine.py
# Rule Orchestrator — runs all 6 scrutiny rules and combines results.
# Each rule is independent; a row can trigger multiple rules simultaneously.
# Multi-rule rows have all categories comma-separated and all reasons semicolon-separated.

import pandas as pd

from rules_engine.r1_round_amount import check_round_amount
from rules_engine.r2_weekend import check_weekend
from rules_engine.r3_period_end import check_period_end
from rules_engine.r4_weak_narration import check_weak_narration
from rules_engine.r5_duplicate import check_duplicate
from rules_engine.r6_voucher_type import check_voucher_type

# Rule registry: label → (rule_function, plain-English reason)
RULES = {
    "Round Numbers": (
        check_round_amount,
        "Transaction amount is a multiple of 1,000/10,000.",
    ),
    "Weekend Entries": (
        check_weekend,
        "Transaction was posted on a Sunday.",
    ),
    "Period End": (
        check_period_end,
        "Entry made within the critical 5-day period-end window.",
    ),
    "Weak Narration": (
        check_weak_narration,
        "Narration is either too short or uses generic placeholder text.",
    ),
    "Duplicate Check": (
        check_duplicate,
        "Multiple entries found with the same date, ledger, and amount.",
    ),
    "Manual Journal": (
        check_voucher_type,
        "Manual Journal Voucher (JV) detected; requires source verification.",
    ),
}


def run_all_rules(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply all 6 scrutiny rules to every row of the GL DataFrame.

    Adds three new columns to the DataFrame:
    - scrutiny_flag     : True if any rule fired, False otherwise
    - scrutiny_category : comma-separated list of triggered category labels
    - scrutiny_reason   : semicolon-separated list of triggered reasons

    Args:
        df : clean GL DataFrame (output of ingestor.ingest())

    Returns:
        DataFrame with the three scrutiny columns appended
    """
    df = df.copy()

    # Run all rules once (vectorised) and store boolean Series
    rule_results = {
        label: rule_fn(df)
        for label, (rule_fn, _) in RULES.items()
    }

    # Build category and reason strings per row
    categories = []
    reasons    = []

    for i in range(len(df)):
        row_cats    = []
        row_reasons = []
        for label, (_, reason) in RULES.items():
            if rule_results[label].iloc[i]:
                row_cats.append(label)
                row_reasons.append(reason)
        categories.append(", ".join(row_cats))
        reasons.append("; ".join(row_reasons))

    df["scrutiny_flag"]     = [bool(c) for c in categories]
    df["scrutiny_category"] = categories
    df["scrutiny_reason"]   = reasons

    return df
