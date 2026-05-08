# tests/test_rules.py  —  Mar 24 deliverable
# Unit tests for scrutiny/rules/ — one test class per rule (R1–R6).
# Strategy: build minimal DataFrames that should / should not trigger each rule
# and assert the boolean Series returned by the check_*() function.

import pytest
import pandas as pd
import numpy as np

from rules_engine.r1_round_amount   import check_round_amount
from rules_engine.r2_weekend        import check_weekend
from rules_engine.r3_period_end     import check_period_end
from rules_engine.r4_weak_narration import check_weak_narration
from rules_engine.r5_duplicate      import check_duplicate
from rules_engine.r6_voucher_type   import check_voucher_type


# ── Helpers ───────────────────────────────────────────────────────────────────

def _gl(amount=45_000, date="2024-06-15", narration="Payment for invoice 12345",
        voucher_type="Payment", ledger_name="Sales Revenue"):
    """Return a minimal single-row GL DataFrame."""
    return pd.DataFrame({
        "amount":       [float(amount)],
        "date":         pd.to_datetime([date]),
        "narration":    [narration],
        "voucher_type": [voucher_type],
        "ledger_name":  [ledger_name],
    })


def _flag(series, idx=0) -> bool:
    """Extract a Python bool from a boolean Series element."""
    return bool(series.iloc[idx])


# ══════════════════════════════════════════════════════════════════════════════
#  R1 — Round Numbers
# ══════════════════════════════════════════════════════════════════════════════

class TestR1RoundAmount:
    """check_round_amount() flags amounts that are exact multiples of 1,000."""

    def test_exact_1000_flagged(self):
        assert _flag(check_round_amount(_gl(amount=1_000)))

    def test_exact_5000_flagged(self):
        assert _flag(check_round_amount(_gl(amount=5_000)))

    def test_exact_100000_flagged(self):
        assert _flag(check_round_amount(_gl(amount=1_00_000)))

    def test_non_round_not_flagged(self):
        assert not _flag(check_round_amount(_gl(amount=45_673.50)))

    def test_amount_ending_in_500_not_flagged(self):
        """500 is not a multiple of 1000."""
        assert not _flag(check_round_amount(_gl(amount=500)))

    def test_zero_not_flagged(self):
        """Zero is excluded per the rule docstring."""
        assert not _flag(check_round_amount(_gl(amount=0)))

    def test_multiple_rows_mixed(self):
        """First row round, second not round."""
        df = pd.DataFrame({
            "amount": [10_000.0, 10_001.5],
            "date":   pd.to_datetime(["2024-06-15", "2024-06-15"]),
        })
        result = check_round_amount(df)
        assert _flag(result, 0)
        assert not _flag(result, 1)

    def test_returns_boolean_series(self):
        result = check_round_amount(_gl(amount=2_000))
        assert result.dtype == bool or result.dtype == np.bool_


# ══════════════════════════════════════════════════════════════════════════════
#  R2 — Weekend Entries
# ══════════════════════════════════════════════════════════════════════════════

class TestR2Weekend:
    """check_weekend() flags transactions posted on Sunday (dayofweek == 6)."""

    def test_sunday_flagged(self):
        assert _flag(check_weekend(_gl(date="2024-06-16")))   # Sunday

    def test_monday_not_flagged(self):
        assert not _flag(check_weekend(_gl(date="2024-06-17")))   # Monday

    def test_saturday_not_flagged_by_default(self):
        """Saturday is NOT flagged when INCLUDE_SATURDAY is False (default)."""
        assert not _flag(check_weekend(_gl(date="2024-06-15")))   # Saturday

    def test_friday_not_flagged(self):
        assert not _flag(check_weekend(_gl(date="2024-06-14")))   # Friday

    def test_multiple_sundays(self):
        sundays = ["2024-06-16", "2024-06-23", "2024-06-30"]
        df = pd.DataFrame({
            "date": pd.to_datetime(sundays),
            "amount": [1000.0, 2000.0, 3000.0],
        })
        assert check_weekend(df).all()

    def test_mixed_week_days(self):
        df = pd.DataFrame({
            "date": pd.to_datetime(["2024-06-16", "2024-06-17"]),  # Sun, Mon
            "amount": [1000.0, 2000.0],
        })
        result = check_weekend(df)
        assert _flag(result, 0)
        assert not _flag(result, 1)


# ══════════════════════════════════════════════════════════════════════════════
#  R3 — Period End
# ══════════════════════════════════════════════════════════════════════════════

class TestR3PeriodEnd:
    """check_period_end() flags dates in the last 5 days of their calendar month."""

    def test_last_day_of_month_flagged(self):
        assert _flag(check_period_end(_gl(date="2024-06-30")))

    def test_27th_flagged(self):
        assert _flag(check_period_end(_gl(date="2024-06-27")))

    def test_26th_flagged(self):
        assert _flag(check_period_end(_gl(date="2024-06-26")))

    def test_25th_not_flagged(self):
        """25th is NOT within the last 5 days of a 30-day month (last 5 = 26–30)."""
        assert not _flag(check_period_end(_gl(date="2024-06-25")))

    def test_mid_month_not_flagged(self):
        assert not _flag(check_period_end(_gl(date="2024-06-15")))

    def test_first_of_month_not_flagged(self):
        assert not _flag(check_period_end(_gl(date="2024-06-01")))

    def test_feb_last_days_flagged(self):
        """February 2024 has 29 days (leap year); 25th–29th should be flagged."""
        for day in [25, 26, 27, 28, 29]:
            df = _gl(date=f"2024-02-{day:02d}")
            assert _flag(check_period_end(df)), f"Feb {day} should be flagged"

    def test_mixed_period_end(self):
        df = pd.DataFrame({
            "date": pd.to_datetime(["2024-06-30", "2024-06-15"]),
            "amount": [1000.0, 2000.0],
        })
        result = check_period_end(df)
        assert _flag(result, 0)
        assert not _flag(result, 1)


# ══════════════════════════════════════════════════════════════════════════════
#  R4 — Weak Narration
# ══════════════════════════════════════════════════════════════════════════════

class TestR4WeakNarration:
    """check_weak_narration() flags short (<10 chars) or generic narrations."""

    def test_too_short_flagged(self):
        assert _flag(check_weak_narration(_gl(narration="adj")))

    def test_exactly_9_chars_flagged(self):
        assert _flag(check_weak_narration(_gl(narration="123456789")))

    def test_exactly_10_chars_not_flagged_if_good(self):
        """10 chars with no weak keyword — should NOT be flagged."""
        assert not _flag(check_weak_narration(_gl(narration="1234567890")))

    def test_keyword_being_adj_flagged(self):
        assert _flag(check_weak_narration(_gl(narration="Being adj for March 2024")))

    def test_keyword_as_discussed_flagged(self):
        assert _flag(check_weak_narration(_gl(narration="As discussed with management")))

    def test_keyword_misc_flagged(self):
        assert _flag(check_weak_narration(_gl(narration="Misc expense entry")))

    def test_keyword_jv_standalone_flagged(self):
        assert _flag(check_weak_narration(_gl(narration="JV for period end adjustment")))

    def test_keyword_ok_flagged(self):
        assert _flag(check_weak_narration(_gl(narration="OK processed entry")))

    def test_good_narration_not_flagged(self):
        assert not _flag(check_weak_narration(_gl(
            narration="Payment received against invoice INV-2024-1234 from Sharma Traders"
        )))

    def test_empty_narration_flagged(self):
        """Empty string has 0 chars < 10 → should be flagged."""
        assert _flag(check_weak_narration(_gl(narration="")))

    def test_case_insensitive_keyword(self):
        """Keyword matching is case-insensitive."""
        assert _flag(check_weak_narration(_gl(narration="BEING adjustment made")))

    def test_returns_boolean_series(self):
        result = check_weak_narration(_gl(narration="adj"))
        assert result.dtype == bool or result.dtype == np.bool_


# ══════════════════════════════════════════════════════════════════════════════
#  R5 — Duplicate Check
# ══════════════════════════════════════════════════════════════════════════════

class TestR5Duplicate:
    """check_duplicate() flags ALL rows with the same date+ledger+amount."""

    def test_exact_duplicate_both_flagged(self):
        """Original and duplicate row must both be True."""
        df = pd.DataFrame({
            "date":        pd.to_datetime(["2024-06-15", "2024-06-15"]),
            "ledger_name": ["Sales Revenue", "Sales Revenue"],
            "amount":      [45_000.0, 45_000.0],
        })
        result = check_duplicate(df)
        assert _flag(result, 0)
        assert _flag(result, 1)

    def test_unique_rows_not_flagged(self):
        """Rows with different amounts should not be flagged."""
        df = pd.DataFrame({
            "date":        pd.to_datetime(["2024-06-15", "2024-06-15"]),
            "ledger_name": ["Sales Revenue", "Sales Revenue"],
            "amount":      [45_000.0, 46_000.0],
        })
        result = check_duplicate(df)
        assert not _flag(result, 0)
        assert not _flag(result, 1)

    def test_different_ledger_not_flagged(self):
        """Same date+amount but different ledger_name → not a duplicate."""
        df = pd.DataFrame({
            "date":        pd.to_datetime(["2024-06-15", "2024-06-15"]),
            "ledger_name": ["Sales Revenue", "Rent Expense"],
            "amount":      [45_000.0, 45_000.0],
        })
        result = check_duplicate(df)
        assert not _flag(result, 0)
        assert not _flag(result, 1)

    def test_different_date_not_flagged(self):
        """Same ledger+amount but different date → not a duplicate."""
        df = pd.DataFrame({
            "date":        pd.to_datetime(["2024-06-15", "2024-06-16"]),
            "ledger_name": ["Sales Revenue", "Sales Revenue"],
            "amount":      [45_000.0, 45_000.0],
        })
        result = check_duplicate(df)
        assert not _flag(result, 0)
        assert not _flag(result, 1)

    def test_three_way_duplicate_all_flagged(self):
        """Three-way duplicates — all three rows must be flagged."""
        df = pd.DataFrame({
            "date":        pd.to_datetime(["2024-06-15"] * 3),
            "ledger_name": ["Sales Revenue"] * 3,
            "amount":      [10_000.0] * 3,
        })
        result = check_duplicate(df)
        assert result.all()

    def test_mixed_rows(self):
        """First two rows are duplicates; third row is unique."""
        df = pd.DataFrame({
            "date":        pd.to_datetime(["2024-06-15", "2024-06-15", "2024-06-20"]),
            "ledger_name": ["Sales Revenue", "Sales Revenue", "Rent Expense"],
            "amount":      [45_000.0, 45_000.0, 20_000.0],
        })
        result = check_duplicate(df)
        assert _flag(result, 0)
        assert _flag(result, 1)
        assert not _flag(result, 2)

    def test_single_row_not_flagged(self):
        """A single row can never be a duplicate of itself."""
        df = pd.DataFrame({
            "date":        pd.to_datetime(["2024-06-15"]),
            "ledger_name": ["Sales Revenue"],
            "amount":      [45_000.0],
        })
        result = check_duplicate(df)
        assert not _flag(result, 0)


# ══════════════════════════════════════════════════════════════════════════════
#  R6 — Manual Journal
# ══════════════════════════════════════════════════════════════════════════════

class TestR6VoucherType:
    """check_voucher_type() flags voucher_type in {Journal, JV, Journal Voucher, Manual JV}."""

    def test_journal_flagged(self):
        assert _flag(check_voucher_type(_gl(voucher_type="Journal")))

    def test_jv_flagged(self):
        assert _flag(check_voucher_type(_gl(voucher_type="JV")))

    def test_journal_voucher_flagged(self):
        assert _flag(check_voucher_type(_gl(voucher_type="Journal Voucher")))

    def test_manual_jv_flagged(self):
        assert _flag(check_voucher_type(_gl(voucher_type="Manual JV")))

    def test_case_insensitive(self):
        """Matching is case-insensitive."""
        for vt in ["journal", "JOURNAL", "jv", "jV"]:
            assert _flag(check_voucher_type(_gl(voucher_type=vt))), f"{vt!r} should be flagged"

    def test_payment_not_flagged(self):
        assert not _flag(check_voucher_type(_gl(voucher_type="Payment")))

    def test_receipt_not_flagged(self):
        assert not _flag(check_voucher_type(_gl(voucher_type="Receipt")))

    def test_contra_not_flagged(self):
        assert not _flag(check_voucher_type(_gl(voucher_type="Contra")))

    def test_empty_voucher_type_not_flagged(self):
        assert not _flag(check_voucher_type(_gl(voucher_type="")))

    def test_mixed_rows(self):
        """Journal flagged, Payment not flagged."""
        df = pd.DataFrame({
            "voucher_type": ["Journal", "Payment"],
            "date":         pd.to_datetime(["2024-06-15", "2024-06-15"]),
            "amount":       [1000.0, 2000.0],
        })
        result = check_voucher_type(df)
        assert _flag(result, 0)
        assert not _flag(result, 1)

    def test_returns_boolean_series(self):
        result = check_voucher_type(_gl(voucher_type="JV"))
        assert result.dtype == bool or result.dtype == np.bool_
