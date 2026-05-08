import os
import tempfile
import pandas as pd
from fastapi import UploadFile

from scrutiny.ingestor import ingest, SchemaError, preview_schema_mapping
from scrutiny.engine import run_all_rules
from scrutiny.ml.model import train, predict
from scrutiny.exporter import export


def _read_uploaded_dataframe(path: str) -> pd.DataFrame:
    """Read uploaded file without renaming columns to preserve original structure for export."""
    if path.endswith(".xlsx") or path.endswith(".xls"):
        return pd.read_excel(path)
    return pd.read_csv(path)


def _build_export_dataframe(raw_df: pd.DataFrame, analyzed_df: pd.DataFrame) -> pd.DataFrame:
    """
    Keep uploaded columns exactly as-is and append generated scrutiny columns at the end.
    Row order is preserved from ingestion/analysis.
    """
    export_df = raw_df.copy().reset_index(drop=True)
    analyzed = analyzed_df.reset_index(drop=True)

    export_df["Anomaly_Type"] = analyzed["scrutiny_category"].fillna("")
    export_df["Reason"] = analyzed["scrutiny_reason"].fillna("")

    return export_df


async def save_upload(file: UploadFile) -> str:
    filename = (file.filename or "").lower()
    if filename.endswith(".xlsx"):
        suffix = ".xlsx"
    elif filename.endswith(".xls"):
        suffix = ".xls"
    else:
        suffix = ".csv"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    content = await file.read()
    tmp.write(content)
    tmp.close()
    return tmp.name


def _normalize_amounts(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series.astype(str).str.replace(r"[^0-9\.-]", "", regex=True), errors="coerce")


def _build_transaction_docs(raw_df: pd.DataFrame, analyzed_df: pd.DataFrame, workbook_id: str) -> list[dict]:
    import re
    docs = []
    # Ensure they are aligned
    raw_records = raw_df.reset_index(drop=True).to_dict(orient="records")
    norm_records = analyzed_df.reset_index(drop=True).to_dict(orient="records")
    
    for raw, norm in zip(raw_records, norm_records):
        # Generate metadata
        date_val = norm.get("date")
        amount = norm.get("amount", 0)
        
        # Quarter mapping
        quarter = None
        fin_year = None
        dt = None
        if pd.notnull(date_val):
            dt = pd.to_datetime(date_val)
            if pd.notnull(dt):
                q = (dt.month - 1) // 3 + 1
                quarter = f"q{q}"
                fin_year = str(dt.year)
                
        # searchable text (narration + ledger_name + voucher_type)
        search_parts = [
            str(norm.get("narration", "")),
            str(norm.get("ledger_name", "")),
            str(norm.get("voucher_type", ""))
        ]
        searchable_text = " ".join(filter(None, search_parts)).lower()
        
        # Extract account series
        ledger_name = str(norm.get("ledger_name", ""))
        account_series = ""
        match = re.match(r"^(\d+)", ledger_name)
        if match:
            account_series = match.group(1)
            
        doc = {
            "workbook_id": workbook_id,
            "type": "transaction",
            "is_flagged": bool(norm.get("scrutiny_flag")),
            "date": dt.strftime("%Y-%m-%d") if dt is not None else None,
            "financial_year": fin_year,
            "quarter": quarter,
            "ledger_type": ledger_name,
            "account_series": account_series,
            "voucher_type": str(norm.get("voucher_type", "")).lower(),
            "amount": float(amount) if pd.notnull(amount) else 0.0,
            "searchable_text": searchable_text,
            "category": norm.get("scrutiny_category", ""),
            "reason": norm.get("scrutiny_reason", ""),
            "data": raw
        }
        docs.append(doc)
    return docs


def run_analysis(tmp_path: str, use_ml: bool, contamination: float, workbook_id: str = "") -> tuple[pd.DataFrame, dict]:
    raw_df = _read_uploaded_dataframe(tmp_path)
    df = ingest(tmp_path)

    df = run_all_rules(df)
    rule_flagged = int(df["scrutiny_flag"].sum())

    ml_flagged = 0
    if use_ml:
        ml_pipeline = train(df, contamination=contamination)
        df = predict(df, ml_pipeline)

        ml_only = (df["ml_anomaly_flag"] == -1) & (~df["scrutiny_flag"])
        df.loc[ml_only, "scrutiny_flag"] = True
        df.loc[ml_only, "scrutiny_category"] = "ML Anomaly"
        df.loc[ml_only, "scrutiny_reason"] = (
            "Statistical outlier detected by Isolation Forest (score: "
            + df.loc[ml_only, "ml_anomaly_score"].round(4).astype(str)
            + ")"
        )
        ml_flagged = int(ml_only.sum())

    total_flagged = int(df["scrutiny_flag"].sum())
    flagged_df = df[df["scrutiny_flag"]].copy()

    # Category counts
    cat_counts = (
        flagged_df["scrutiny_category"]
        .str.split(", ")
        .explode()
        .value_counts()
        .reset_index()
    )
    cat_counts.columns = ["category", "count"]
    category_counts = cat_counts.to_dict(orient="records")

    # Serialize flagged rows
    flagged_df["date"] = flagged_df["date"].dt.strftime("%Y-%m-%d")
    flagged_df = flagged_df.fillna("")
    cols_to_drop = [c for c in ["scrutiny_flag"] if c in flagged_df.columns]
    flagged_rows = flagged_df.drop(columns=cols_to_drop).to_dict(orient="records")

    preview = preview_schema_mapping(tmp_path)
    health_summary = preview.get("health_summary", {})

    summary = {
        "total_entries": len(df),
        "rule_flagged": rule_flagged,
        "ml_flagged": ml_flagged,
        "total_flagged": total_flagged,
        "pct_flagged": round(total_flagged / len(df) * 100, 1) if len(df) > 0 else 0,
        "total_debit": health_summary.get("total_debit", 0),
        "total_credit": health_summary.get("total_credit", 0),
        "date_from": health_summary.get("date_from"),
        "date_to": health_summary.get("date_to"),
        "missing_narrations": health_summary.get("missing_narrations", 0),
        "duplicate_journal_ids": health_summary.get("duplicate_journal_ids", 0),
        "manual_entries": health_summary.get("manual_entries", 0),
        "unbalanced_entries": health_summary.get("unbalanced_entries", 0),
    }

    export_df = _build_export_dataframe(raw_df, df)
    
    # Build transaction docs for database persistence
    transaction_docs = _build_transaction_docs(raw_df, df, workbook_id)

    return export_df, {
        "summary": summary,
        "health_summary": health_summary,
        "category_counts": category_counts,
        "flagged_rows": flagged_rows,
        "transaction_docs": transaction_docs,
    }


def generate_report(df: pd.DataFrame) -> bytes:
    return export(df)


def preview_mapping(tmp_path: str) -> dict:
    return preview_schema_mapping(tmp_path)
