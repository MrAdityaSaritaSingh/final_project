# scrutiny/rules/r6_voucher_type.py
# R6 — Manual Journal
# Flags transactions where the voucher type is 'Journal' or 'JV'.
# Rationale: Manual journal entries are the primary mechanism for
# management override of internal controls (ISA 240). Every manual
# JV requires auditor verification of the underlying business justification.

import pandas as pd

MANUAL_JOURNAL_TYPES = {"JOURNAL", "JV", "JOURNAL VOUCHER", "MANUAL JV"}


def check_voucher_type(df: pd.DataFrame) -> pd.Series:
    """
    Returns a boolean Series — True where voucher_type (case-insensitive)
    matches any value in MANUAL_JOURNAL_TYPES.

    Handles: mixed case ('Journal', 'jv', 'JV ENTRY'), leading/trailing spaces.
    """
    normalised = df["voucher_type"].fillna("").str.strip().str.upper()
    return normalised.isin(MANUAL_JOURNAL_TYPES)
