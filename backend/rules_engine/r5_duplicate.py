# scrutiny/rules/r5_duplicate.py
# R5 — Duplicate Check
# Flags ALL rows where the combination of (date, ledger_name, amount)
# appears more than once in the dataset.
# Rationale: Duplicate payments are a primary target of substantive
# procedures (PCAOB AS 2315). Both the original and the duplicate
# are flagged so the auditor can compare both rows.

import pandas as pd


def check_duplicate(df: pd.DataFrame) -> pd.Series:
    """
    Returns a boolean Series — True for EVERY row that shares an identical
    (date, ledger_name, amount) combination with at least one other row.

    keep=False ensures both the original AND the duplicate are flagged.

    Edge case: 3-way or 4-way duplicates — all occurrences are flagged.
    """
    return df.duplicated(
        subset=["date", "ledger_name", "amount"],
        keep=False,
    )
