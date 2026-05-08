# scrutiny/rules/r4_weak_narration.py
# R4 — Weak Narration
# Flags transactions where the narration is too short (<10 chars) OR
# contains generic placeholder keywords like "Being", "Adj", "As discussed".
# Rationale: Every posting must have adequate documentation explaining
# the business purpose (ICAI Guidance Note on Audit of Expenses).

import re
import pandas as pd

MIN_LENGTH = 10    # narrations shorter than this are flagged

# Case-insensitive keywords that indicate a generic/placeholder narration
WEAK_KEYWORDS = re.compile(
    r"\b(?:being|adj|as\s+discussed|adjustment|misc|trf|jv|ok|entry|per\s+discussion)\b",
    re.IGNORECASE,
)


def check_weak_narration(df: pd.DataFrame) -> pd.Series:
    """
    Returns a boolean Series — True where:
    - narration length < MIN_LENGTH (10 chars), OR
    - narration contains a weak keyword

    Edge cases handled:
    - None / NaN narration → treated as empty string → flagged (length = 0)
    - 'Null' string → normalised to '' by ingestor → flagged
    - Exactly 10 characters → NOT flagged (boundary is strict <10)
    """
    narration = df["narration"].fillna("").astype(str).str.strip()

    too_short = narration.str.len() < MIN_LENGTH
    has_weak_keyword = narration.str.contains(
        r"\b(?:being|adj|as\s+discussed|adjustment|misc|trf|jv|ok|entry|per\s+discussion)\b",
        regex=True,
        case=False,
    )

    return too_short | has_weak_keyword
