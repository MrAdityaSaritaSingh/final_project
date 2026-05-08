import pandas as pd
import pytest

from scrutiny.ingestor import SchemaError, ingest


def test_ingest_accepts_standard_schema(tmp_path):
    file_path = tmp_path / 'standard.csv'
    pd.DataFrame(
        {
            'date': ['2025-04-01'],
            'ledger_name': ['Sales Revenue'],
            'amount': ['45,000'],
            'narration': ['Invoice posting'],
            'voucher_type': ['Payment'],
        }
    ).to_csv(file_path, index=False)

    df = ingest(str(file_path))

    assert list(df.columns)[:5] == ['date', 'ledger_name', 'amount', 'narration', 'voucher_type']
    assert float(df.loc[0, 'amount']) == 45000.0


def test_ingest_maps_tally_style_columns(tmp_path):
    file_path = tmp_path / 'tally.csv'
    pd.DataFrame(
        {
            'Date': ['15/04/2025', '16/04/2025'],
            'Particulars': ['Accounts Payable', 'Rent Expense'],
            'Vch Type': ['Journal', 'Payment'],
            'Narration': ['Monthly provision', 'Rent paid'],
            'Debit': ['12,500', '0'],
            'Credit': ['0', '2,000'],
        }
    ).to_csv(file_path, index=False)

    df = ingest(str(file_path))

    assert {'date', 'ledger_name', 'amount', 'narration', 'voucher_type'}.issubset(df.columns)
    assert df.loc[0, 'ledger_name'] == 'Accounts Payable'
    assert float(df.loc[0, 'amount']) == -12500.0
    assert float(df.loc[1, 'amount']) == 2000.0


def test_ingest_raises_when_date_is_missing(tmp_path):
    file_path = tmp_path / 'invalid.csv'
    pd.DataFrame(
        {
            'Particulars': ['Accounts Payable'],
            'Debit': ['5000'],
            'Credit': ['0'],
        }
    ).to_csv(file_path, index=False)

    with pytest.raises(SchemaError) as exc:
        ingest(str(file_path))

    assert "date" in str(exc.value).lower()


def test_ingest_maps_abbreviated_column_names(tmp_path):
    file_path = tmp_path / 'abbr.csv'
    pd.DataFrame(
        {
            'da': ['2025-04-10'],
            'accnt_name': ['Consulting Fees'],
            'dbt': ['0'],
            'crd': ['18,500'],
            'desc': ['Consulting payout'],
            'vtype': ['Journal'],
        }
    ).to_csv(file_path, index=False)

    df = ingest(str(file_path))

    assert {'date', 'ledger_name', 'amount', 'narration', 'voucher_type'}.issubset(df.columns)
    assert df.loc[0, 'ledger_name'] == 'Consulting Fees'
    assert float(df.loc[0, 'amount']) == 18500.0
