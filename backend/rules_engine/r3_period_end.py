# scrutiny/rules/r3_period_end.py
# R3 — Period End
# Flags transactions posted in the last 5 days of any calendar month,
# OR in the last 5 days of the fiscal year-end month.
# Rationale: Period-end pressure increases management's incentive to
# manipulate entries to meet targets (ISA 560 — Subsequent Events).

import pandas as pd
from calendar import monthrange

# Change to match your company's fiscal year-end month (default: March = 3)
FISCAL_YEAR_END_MONTH = 3


def check_period_end(df: pd.DataFrame) -> pd.Series:
    """
    Returns a boolean Series — True where the date falls within
    the last 5 days of its calendar month.
    """
    dates = pd.to_datetime(df["date"])

    # Number of days in each row's month
    days_in_month = dates.apply(lambda d: monthrange(d.year, d.month)[1])

    # Flag if day >= (last_day - 4), i.e. within 5 days of month end
    return dates.dt.day >= (days_in_month - 4)
