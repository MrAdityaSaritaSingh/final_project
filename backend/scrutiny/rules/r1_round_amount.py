# scrutiny/rules/r1_round_amount.py
# R1 — Round Numbers
# Flags transactions whose amount is an exact multiple of 1,000.
# Rationale: Round-dollar amounts are a primary fraud indicator
# (ACFE Fraud Examiners Manual). Legitimate amounts from invoices
# and bills rarely land on exact round numbers.

import pandas as pd


def check_round_amount(df: pd.DataFrame) -> pd.Series:
    """
    Returns a boolean Series — True where amount % 1000 == 0 AND amount != 0.

    Edge case: amount = 0 is excluded (zero entries are handled separately).
    """
    return (df["amount"] % 1000 == 0) & (df["amount"] != 0)
