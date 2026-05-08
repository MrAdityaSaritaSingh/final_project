# scrutiny/rules/r2_weekend.py
# R2 — Weekend Entries
# Flags transactions posted on a Sunday.
# Rationale: Entries posted outside business hours/days indicate possible
# unauthorised access or rushed period-end manipulation (ISA 240).
# Default: flag Sundays only. Set INCLUDE_SATURDAY=True to also flag Saturdays.

import pandas as pd

INCLUDE_SATURDAY = False   # change to True to also flag Saturday postings


def check_weekend(df: pd.DataFrame) -> pd.Series:
    """
    Returns a boolean Series — True where the posting date falls on Sunday
    (or Saturday if INCLUDE_SATURDAY is True).

    dayofweek: 0=Monday … 5=Saturday, 6=Sunday
    """
    dow = pd.to_datetime(df["date"]).dt.dayofweek
    if INCLUDE_SATURDAY:
        return dow >= 5      # Saturday or Sunday
    return dow == 6          # Sunday only
