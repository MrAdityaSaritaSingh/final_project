# tests/conftest.py
# Shared pytest fixtures used across all test modules.

import sys
import os
import pandas as pd
import pytest

# Ensure project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _make_gl(**overrides) -> pd.DataFrame:
    """
    Return a single-row GL DataFrame with valid default values.
    Any column can be overridden via keyword arguments.
    """
    defaults = {
        "voucher_no":   ["JV-2024-00001"],
        "date":         pd.to_datetime(["2024-06-15"]),   # Saturday, mid-month
        "ledger_name":  ["Sales Revenue"],
        "amount":       [45_000.0],
        "dr_cr":        ["Dr"],
        "narration":    ["Payment received for invoice 12345"],
        "voucher_type": ["Payment"],
        "posted_by":    ["Ravi Kumar"],
        "cost_center":  ["Finance"],
        "fiscal_year":  ["FY2024-25"],
    }
    defaults.update({k: [v] if not isinstance(v, list) else v for k, v in overrides.items()})
    return pd.DataFrame(defaults)


def _make_gl_n(n: int = 10, **overrides) -> pd.DataFrame:
    """Return an n-row GL DataFrame (same value in every row, or overrides as lists)."""
    base = _make_gl(**overrides)
    return pd.concat([base] * n, ignore_index=True)


@pytest.fixture
def single_row_gl():
    """A single clean GL row that should not trigger any rule."""
    return _make_gl()


@pytest.fixture
def make_gl():
    """Factory fixture: call make_gl(**kwargs) to get a 1-row GL DataFrame."""
    return _make_gl


@pytest.fixture
def make_gl_n():
    """Factory fixture: call make_gl_n(n, **kwargs) to get an n-row GL DataFrame."""
    return _make_gl_n
