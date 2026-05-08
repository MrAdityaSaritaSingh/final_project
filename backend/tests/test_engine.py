# tests/test_engine.py  —  Mar 25 deliverable
# Unit tests for scrutiny/engine.py — run_all_rules() function.
# Coverage: output columns, flag merging, multi-rule rows, no-flag rows.

import pytest
import pandas as pd
import numpy as np

from scrutiny.engine import run_all_rules

SCRUTINY_COLS = ["scrutiny_flag", "scrutiny_category", "scrutiny_reason"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean_row(
    amount=45_673.50,           # not a round number
    date="2024-06-14",          # Friday, mid-month
    narration="Payment received against invoice INV-2024-9999 from Sharma Traders",
    voucher_type="Payment",
    ledger_name="Sales Revenue",
    suffix="",                  # appended to ledger_name to ensure uniqueness for R5
) -> pd.DataFrame:
    """Return a single clean GL row that should NOT trigger any rule."""
    return pd.DataFrame({
        "voucher_no":   [f"JV-2024-00001{suffix}"],
        "date":         pd.to_datetime([date]),
        "ledger_name":  [f"{ledger_name}{suffix}"],
        "amount":       [float(amount)],
        "dr_cr":        ["Dr"],
        "narration":    [narration],
        "voucher_type": [voucher_type],
        "posted_by":    ["Ravi Kumar"],
        "cost_center":  ["Finance"],
        "fiscal_year":  ["FY2024-25"],
    })


def _unique_clean_rows(n: int) -> pd.DataFrame:
    """Return n truly unique clean rows (different non-round amounts) to avoid R1/R5."""
    rows = []
    for i in range(n):
        # 45_673.50 + i * 0.37 → never a multiple of 1,000
        rows.append(_clean_row(amount=45_673.50 + i * 0.37, suffix=str(i)))
    return pd.concat(rows, ignore_index=True)


def _flag(series, idx=0) -> bool:
    """Extract a Python bool from a boolean Series element."""
    return bool(series.iloc[idx])


# ── Output column structure ────────────────────────────────────────────────────

class TestOutputColumns:
    """run_all_rules() must add exactly the three scrutiny columns."""

    def test_adds_scrutiny_flag_column(self):
        df = run_all_rules(_clean_row())
        assert "scrutiny_flag" in df.columns

    def test_adds_scrutiny_category_column(self):
        df = run_all_rules(_clean_row())
        assert "scrutiny_category" in df.columns

    def test_adds_scrutiny_reason_column(self):
        df = run_all_rules(_clean_row())
        assert "scrutiny_reason" in df.columns

    def test_no_duplicate_columns(self):
        """Column names must be unique after run_all_rules()."""
        df = run_all_rules(_clean_row())
        assert len(df.columns) == len(set(df.columns))

    def test_original_columns_preserved(self):
        """Original GL columns are still present in output."""
        original = _clean_row()
        df = run_all_rules(original)
        for col in original.columns:
            assert col in df.columns

    def test_row_count_unchanged(self):
        """run_all_rules() must not add or remove rows."""
        original = _clean_row()
        df = run_all_rules(original)
        assert len(df) == len(original)

    def test_does_not_mutate_input(self):
        """The input DataFrame should not be modified in place."""
        original = _clean_row()
        cols_before = list(original.columns)
        _ = run_all_rules(original)
        assert list(original.columns) == cols_before

    def test_scrutiny_flag_is_boolean(self):
        df = run_all_rules(_clean_row())
        assert df["scrutiny_flag"].dtype == bool or df["scrutiny_flag"].dtype == np.bool_

    def test_scrutiny_category_is_string(self):
        df = run_all_rules(_clean_row())
        assert df["scrutiny_category"].dtype == object

    def test_scrutiny_reason_is_string(self):
        df = run_all_rules(_clean_row())
        assert df["scrutiny_reason"].dtype == object


# ── No-flag rows ──────────────────────────────────────────────────────────────

class TestCleanRows:
    """A row that triggers no rules must have flag=False and empty strings."""

    def test_clean_row_not_flagged(self):
        df = run_all_rules(_clean_row())
        assert not _flag(df["scrutiny_flag"])

    def test_clean_row_empty_category(self):
        df = run_all_rules(_clean_row())
        assert df["scrutiny_category"].iloc[0] == ""

    def test_clean_row_empty_reason(self):
        df = run_all_rules(_clean_row())
        assert df["scrutiny_reason"].iloc[0] == ""

    def test_all_unique_clean_rows_have_false_flag(self):
        """100 unique clean rows → none should be flagged."""
        df = _unique_clean_rows(100)
        result = run_all_rules(df)
        assert not result["scrutiny_flag"].any()


# ── Single-rule rows ───────────────────────────────────────────────────────────

class TestSingleRuleFlags:
    """Each rule fires independently on the correct trigger row."""

    def test_r1_round_amount_flagged(self):
        df = run_all_rules(_clean_row(amount=10_000))
        assert _flag(df["scrutiny_flag"])
        assert "Round Numbers" in df["scrutiny_category"].iloc[0]

    def test_r2_weekend_flagged(self):
        df = run_all_rules(_clean_row(date="2024-06-16"))  # Sunday
        assert _flag(df["scrutiny_flag"])
        assert "Weekend Entries" in df["scrutiny_category"].iloc[0]

    def test_r3_period_end_flagged(self):
        df = run_all_rules(_clean_row(date="2024-06-30"))  # last day of month
        assert _flag(df["scrutiny_flag"])
        assert "Period End" in df["scrutiny_category"].iloc[0]

    def test_r4_weak_narration_flagged(self):
        df = run_all_rules(_clean_row(narration="adj"))
        assert _flag(df["scrutiny_flag"])
        assert "Weak Narration" in df["scrutiny_category"].iloc[0]

    def test_r5_duplicate_flagged(self):
        """Two identical rows → both flagged with Duplicate Check."""
        row = _clean_row()
        dup = pd.concat([row, row], ignore_index=True)
        df  = run_all_rules(dup)
        assert _flag(df["scrutiny_flag"], 0)
        assert _flag(df["scrutiny_flag"], 1)
        assert "Duplicate Check" in df["scrutiny_category"].iloc[0]

    def test_r6_manual_journal_flagged(self):
        df = run_all_rules(_clean_row(voucher_type="Journal"))
        assert _flag(df["scrutiny_flag"])
        assert "Manual Journal" in df["scrutiny_category"].iloc[0]


# ── Multi-rule rows ────────────────────────────────────────────────────────────

class TestMultiRuleRows:
    """A row can trigger multiple rules simultaneously."""

    def test_r1_and_r6_combined(self):
        """Round amount + manual journal → both appear in scrutiny_category."""
        df = run_all_rules(_clean_row(amount=10_000, voucher_type="Journal"))
        cats = df["scrutiny_category"].iloc[0]
        assert "Round Numbers"  in cats
        assert "Manual Journal" in cats

    def test_r2_and_r3_combined(self):
        """2024-06-30 is a Sunday AND last day of month → both rules fire."""
        df = run_all_rules(_clean_row(date="2024-06-30"))
        cats = df["scrutiny_category"].iloc[0]
        assert "Weekend Entries" in cats
        assert "Period End"      in cats

    def test_multi_rule_category_comma_separated(self):
        """Multiple categories are joined with ', '."""
        df = run_all_rules(_clean_row(amount=10_000, voucher_type="Journal"))
        cats = df["scrutiny_category"].iloc[0]
        assert ", " in cats

    def test_multi_rule_reason_semicolon_separated(self):
        """Multiple reasons are joined with '; '."""
        df = run_all_rules(_clean_row(amount=10_000, voucher_type="Journal"))
        reason = df["scrutiny_reason"].iloc[0]
        assert "; " in reason

    def test_five_rules_combined(self):
        """
        A row that triggers R1 (round), R2 (Sunday), R3 (month-end),
        R4 (weak narration), R6 (journal) should have 5 categories.
        2024-06-30 is a Sunday AND last day of June.
        """
        df = run_all_rules(_clean_row(
            amount=10_000,
            date="2024-06-30",
            narration="adj",
            voucher_type="Journal",
        ))
        cats = df["scrutiny_category"].iloc[0].split(", ")
        assert "Round Numbers"   in cats
        assert "Weekend Entries" in cats
        assert "Period End"      in cats
        assert "Weak Narration"  in cats
        assert "Manual Journal"  in cats
        assert len(cats) == 5


# ── Mixed datasets ─────────────────────────────────────────────────────────────

class TestMixedDatasets:
    """run_all_rules() on a DataFrame with both clean and flagged rows."""

    def test_only_flagged_rows_are_true(self):
        """A clean row and a round-amount row: only the round-amount row should be flagged."""
        clean   = _clean_row(amount=45_673.50, ledger_name="Sales Revenue")
        flagged = _clean_row(amount=10_000.00, ledger_name="Rent Expense")
        df = pd.concat([clean, flagged], ignore_index=True)
        result = run_all_rules(df)
        assert not _flag(result["scrutiny_flag"], 0)
        assert _flag(result["scrutiny_flag"], 1)

    def test_total_flagged_count(self):
        """Exactly 3 of 5 rows should be flagged (R6 Journal), the others are clean."""
        rows = [
            _clean_row(amount=45_001, suffix="A"),   # clean
            _clean_row(amount=45_002, suffix="B", voucher_type="Journal"),   # R6
            _clean_row(amount=45_003, suffix="C"),   # clean
            _clean_row(amount=45_004, suffix="D", voucher_type="Journal"),   # R6
            _clean_row(amount=45_005, suffix="E", voucher_type="Journal"),   # R6
        ]
        df = pd.concat(rows, ignore_index=True)
        result = run_all_rules(df)
        assert result["scrutiny_flag"].sum() == 3

    def test_large_dataset_no_crash(self):
        """run_all_rules() should handle 1,000 rows without error."""
        big = _unique_clean_rows(1_000)
        result = run_all_rules(big)
        assert len(result) == 1_000
        assert "scrutiny_flag" in result.columns
