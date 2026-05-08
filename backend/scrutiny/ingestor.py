# scrutiny/ingestor.py
# File ingestion and validation.
# Reads .csv or .xlsx, validates mandatory columns, normalises types.
# Returns a clean DataFrame ready for the detection engine.

import pandas as pd
import re
import logging
from typing import Optional


REQUIRED_COLUMNS = ["date", "ledger_name", "amount"]
OPTIONAL_COLUMNS = ["narration", "voucher_type"]
CANONICAL_SCHEMA_ORDER = ["date", "ledger_name", "amount", "narration", "voucher_type"]

logger = logging.getLogger(__name__)
JOURNAL_ID_ALIASES = [
    "journal_id",
    "journalid",
    "voucher_no",
    "voucher_number",
    "vch_no",
    "entry_no",
    "transaction_id",
    "ref_no",
]

COLUMN_ALIASES = {
    "date": [
        "date",
        "voucher_date",
        "vch_date",
        "transaction_date",
        "entry_date",
        "posting_date",
    ],
    "ledger_name": [
        "ledger_name",
        "particulars",
        "account",
        "name",
        "party_name",
        "account_name",
        "ledger",
        "ledger_account",
        "name_of_ledger",
    ],
    "narration": [
        "narration",
        "remarks",
        "remark",
        "description",
        "particular_narration",
        "notes",
    ],
    "voucher_type": [
        "voucher_type",
        "vch_type",
        "voucher",
        "voucher_category",
        "transaction_type",
        "type",
    ],
    "amount": [
        "amount",
        "amt",
        "value",
        "total",
        "net_amount",
        "transaction_amount",
        "gross_amount",
    ],
}

DEBIT_ALIASES = ["debit", "dr", "dr_amount", "debit_amount", "debit_amt"]
CREDIT_ALIASES = ["credit", "cr", "cr_amount", "credit_amount", "credit_amt"]

MATCH_ALIASES = {
    "date": COLUMN_ALIASES["date"] + ["da", "dt", "txn_date", "transactiondate"],
    "ledger_name": COLUMN_ALIASES["ledger_name"] + ["led", "ledgernm", "accounthead"],
    "narration": COLUMN_ALIASES["narration"] + ["desc", "descr", "particular"],
    "voucher_type": COLUMN_ALIASES["voucher_type"] + ["vch", "vtype"],
    "amount": COLUMN_ALIASES["amount"] + ["valueinr", "amountin", "amountout", "totalamount", "grandtotal"],
    "debit": [*DEBIT_ALIASES, "dbt", "amount_out", "outflow"],
    "credit": [*CREDIT_ALIASES, "crd", "amount_in", "inflow"],
    "balance": ["balance", "bal", "closing_balance", "available_balance", "closingbal"],
}

DATE_FORMATS = [
    "%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y",
    "%d-%m-%Y", "%Y/%m/%d", "%d %b %Y",
]


class SchemaError(Exception):
    """Raised when the uploaded GL file fails schema validation."""
    pass


def preview_schema_mapping(filepath: str) -> dict:
    """Return how uploaded columns map to the canonical scrutiny schema."""
    if filepath.endswith(".xlsx") or filepath.endswith(".xls"):
        df = pd.read_excel(filepath, dtype=str)
    elif filepath.endswith(".csv"):
        df = pd.read_csv(filepath, dtype=str)
    else:
        raise SchemaError("Unsupported file format. Please upload a .csv or .xlsx file.")

    if df.empty:
        raise SchemaError("Uploaded file is empty. Please upload a valid GL file.")

    original_columns = [str(c) for c in df.columns]
    normalised_columns = [_normalise_column_name(c) for c in original_columns]

    mapping = _detect_schema_mapping(normalised_columns)
    missing_required = [
        item["canonical"]
        for item in mapping
        if item["required"] and item["status"] == "missing"
    ]

    normalised_df = df.copy()
    normalised_df.columns = normalised_columns
    available = set(normalised_columns)

    debit_col = _first_existing_column(available, DEBIT_ALIASES)
    credit_col = _first_existing_column(available, CREDIT_ALIASES)
    date_col = _first_existing_column(available, COLUMN_ALIASES["date"])
    narration_col = _first_existing_column(available, COLUMN_ALIASES["narration"])
    journal_col = _first_existing_column(available, JOURNAL_ID_ALIASES)
    voucher_type_col = _first_existing_column(available, COLUMN_ALIASES["voucher_type"])

    debit_total = 0.0
    if debit_col:
        debit_series = _parse_optional_amounts(normalised_df[debit_col].astype(str))
        debit_total = float(debit_series.fillna(0).abs().sum())

    credit_total = 0.0
    if credit_col:
        credit_series = _parse_optional_amounts(normalised_df[credit_col].astype(str))
        credit_total = float(credit_series.fillna(0).abs().sum())

    date_from = None
    date_to = None
    if date_col:
        parsed_dates = pd.to_datetime(normalised_df[date_col].astype(str), errors="coerce", dayfirst=True)
        valid_dates = parsed_dates.dropna()
        if not valid_dates.empty:
            date_from = valid_dates.min().strftime("%Y-%m-%d")
            date_to = valid_dates.max().strftime("%Y-%m-%d")

    missing_narrations = 0
    if narration_col:
        narr = normalised_df[narration_col].fillna("").astype(str).str.strip()
        missing_narrations = int((narr == "").sum())

    duplicate_journal_ids = 0
    if journal_col:
        journal = normalised_df[journal_col].fillna("").astype(str).str.strip()
        non_blank = journal[journal != ""]
        duplicate_journal_ids = int(non_blank.duplicated(keep=False).sum())

    manual_entries = 0
    if voucher_type_col:
        vt = normalised_df[voucher_type_col].fillna("").astype(str)
        manual_entries = int(vt.str.contains(r"journal|manual", case=False, regex=True).sum())

    sample_rows = (
        df.head(5)
        .fillna("")
        .astype(str)
        .to_dict(orient="records")
    )

    return {
        "original_columns": original_columns,
        "normalised_columns": normalised_columns,
        "mappings": mapping,
        "missing_required": missing_required,
        "rows_detected": int(len(df)),
        "columns_detected": int(len(original_columns)),
        "sample_rows": sample_rows,
        "health_summary": {
            "total_transactions": int(len(df)),
            "total_debit": round(debit_total, 2),
            "total_credit": round(credit_total, 2),
            "debit_equals_credit": abs(debit_total - credit_total) < 0.01 if debit_col and credit_col else False,
            "date_from": date_from,
            "date_to": date_to,
            "missing_narrations": missing_narrations,
            "duplicate_journal_ids": duplicate_journal_ids,
            "manual_entries": manual_entries,
        },
        "debug_info": {
            "original_columns": original_columns,
            "normalised_columns": normalised_columns,
        },
    }


def ingest(filepath: str, manual_overrides: Optional[dict[str, str]] = None) -> pd.DataFrame:
    """
    Load and validate a GL file (.csv or .xlsx).

    Args:
        filepath : path to the uploaded file

    Returns:
        Clean, normalised pd.DataFrame

    Raises:
        SchemaError : with a specific message for every validation failure
    """
    # ── Load file ─────────────────────────────────────────────────────────────
    if filepath.endswith(".xlsx") or filepath.endswith(".xls"):
        df = pd.read_excel(filepath, dtype=str)
    elif filepath.endswith(".csv"):
        df = pd.read_csv(filepath, dtype=str)
    else:
        raise SchemaError("Unsupported file format. Please upload a .csv or .xlsx file.")

    if df.empty:
        raise SchemaError("Uploaded file is empty. Please upload a valid GL file.")

    # ── Normalise column names (lowercase, strip spaces/symbols) ─────────────
    df.columns = [_normalise_column_name(c) for c in df.columns]

    # ── Map source columns (including Tally exports) to canonical schema ─────
    df = _map_to_canonical_schema(df, manual_overrides=manual_overrides)

    # ── Check required columns ────────────────────────────────────────────────
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise SchemaError(
            f"Required column(s) missing from the uploaded file: {', '.join(missing)}"
        )

    for col in OPTIONAL_COLUMNS:
        if col not in df.columns:
            df[col] = ""

    # ── Parse dates ───────────────────────────────────────────────────────────
    df["date"] = _parse_dates(df["date"])

    # ── Parse amounts ─────────────────────────────────────────────────────────
    df["amount"] = _parse_amounts(df["amount"])

    # ── Handle null narrations ────────────────────────────────────────────────
    df["narration"] = (
        df["narration"]
        .fillna("")
        .replace("Null", "")
        .replace("null", "")
        .replace("NULL", "")
        .str.strip()
    )

    # ── Voucher type: strip + title-case ──────────────────────────────────────
    df["voucher_type"] = df["voucher_type"].fillna("").str.strip()

    return df.reset_index(drop=True)


def _normalise_column_name(value: str) -> str:
    normalised = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower())
    normalised = re.sub(r"_+", "_", normalised).strip("_")
    return normalised


def _normalise_for_match(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.strip().lower())


def _levenshtein_distance(left: str, right: str) -> int:
    if left == right:
        return 0
    if not left:
        return len(right)
    if not right:
        return len(left)

    previous = list(range(len(right) + 1))
    for i, char_left in enumerate(left, start=1):
        current = [i]
        for j, char_right in enumerate(right, start=1):
            insertion = current[j - 1] + 1
            deletion = previous[j] + 1
            substitution = previous[j - 1] + (char_left != char_right)
            current.append(min(insertion, deletion, substitution))
        previous = current
    return previous[-1]


def _score_alias_match(column_key: str, alias_key: str) -> tuple[float, str]:
    if not column_key or not alias_key:
        return 0.0, "none"

    if column_key == alias_key:
        return 1.0, "exact"

    if column_key.startswith(alias_key) or alias_key.startswith(column_key):
        return 0.94, "prefix"

    if alias_key in column_key or column_key in alias_key:
        return 0.9, "partial"

    max_len = max(len(column_key), len(alias_key))
    if max_len <= 2:
        return 0.0, "none"

    distance = _levenshtein_distance(column_key, alias_key)
    similarity = 1.0 - (distance / max_len)
    if similarity >= 0.74:
        return max(0.75, round(similarity, 3)), "fuzzy"

    return 0.0, "none"


def _find_best_column_match(
    columns: list[str],
    aliases: list[str],
    consumed: Optional[set[str]] = None,
    min_score: float = 0.75,
) -> tuple[Optional[str], float, str, list[dict]]:
    consumed = consumed or set()
    alias_keys = {_normalise_for_match(alias) for alias in aliases if alias}

    candidates: list[tuple[float, str, str]] = []
    for column in columns:
        if column in consumed:
            continue
        column_key = _normalise_for_match(column)
        best_score = 0.0
        best_strategy = "none"
        for alias_key in alias_keys:
            score, strategy = _score_alias_match(column_key, alias_key)
            if score > best_score:
                best_score = score
                best_strategy = strategy
        if best_score >= min_score:
            candidates.append((best_score, column, best_strategy))

    candidates.sort(key=lambda row: (row[0], len(_normalise_for_match(row[1]))), reverse=True)

    if not candidates:
        return None, 0.0, "none", []

    best_score, best_column, best_strategy = candidates[0]
    alternatives = [
        {
            "column": column,
            "score": round(score, 3),
            "strategy": strategy,
        }
        for score, column, strategy in candidates[:3]
    ]
    return best_column, round(best_score, 3), best_strategy, alternatives


def _first_existing_column(columns: set[str], candidates: list[str]) -> Optional[str]:
    for item in candidates:
        if item in columns:
            return item
    return None


def _map_to_canonical_schema(
    df: pd.DataFrame,
    manual_overrides: Optional[dict[str, str]] = None,
) -> pd.DataFrame:
    mapped = df.copy()
    available_columns = list(mapped.columns)
    available_set = set(available_columns)
    consumed: set[str] = set()
    manual_overrides = manual_overrides or {}

    logger.debug("Original columns for detection: %s", available_columns)
    logger.debug(
        "Normalized keys for detection: %s",
        {col: _normalise_for_match(col) for col in available_columns},
    )

    def resolve_source(canonical: str, aliases: list[str], threshold: float = 0.75) -> tuple[Optional[str], float, str, list[dict]]:
        override = manual_overrides.get(canonical)
        if override:
            override_norm = _normalise_column_name(override)
            if override_norm in available_set:
                consumed.add(override_norm)
                return override_norm, 1.0, "manual_override", [{"column": override_norm, "score": 1.0, "strategy": "manual_override"}]

        source, score, strategy, alternatives = _find_best_column_match(
            columns=available_columns,
            aliases=aliases,
            consumed=consumed,
            min_score=threshold,
        )
        if source:
            consumed.add(source)
        return source, score, strategy, alternatives

    for canonical in ["date", "ledger_name", "narration", "voucher_type"]:
        source, score, strategy, alternatives = resolve_source(canonical, MATCH_ALIASES[canonical])
        logger.debug(
            "Mapped canonical '%s' -> '%s' (score=%s, strategy=%s, alternatives=%s)",
            canonical,
            source,
            score,
            strategy,
            alternatives,
        )
        if source and canonical not in mapped.columns:
            mapped[canonical] = mapped[source]

    amount_source, score, strategy, alternatives = resolve_source("amount", MATCH_ALIASES["amount"]) 
    logger.debug(
        "Mapped canonical 'amount' -> '%s' (score=%s, strategy=%s, alternatives=%s)",
        amount_source,
        score,
        strategy,
        alternatives,
    )
    if amount_source and "amount" not in mapped.columns:
        mapped["amount"] = mapped[amount_source]

    if "amount" not in mapped.columns:
        debit_source, debit_score, debit_strategy, debit_alternatives = resolve_source("debit", MATCH_ALIASES["debit"])
        credit_source, credit_score, credit_strategy, credit_alternatives = resolve_source("credit", MATCH_ALIASES["credit"])

        logger.debug(
            "Derived amount from debit='%s' (score=%s, strategy=%s, alternatives=%s) and credit='%s' (score=%s, strategy=%s, alternatives=%s)",
            debit_source,
            debit_score,
            debit_strategy,
            debit_alternatives,
            credit_source,
            credit_score,
            credit_strategy,
            credit_alternatives,
        )

        if debit_source or credit_source:
            debit = _parse_optional_amounts(
                mapped[debit_source] if debit_source else pd.Series(["" for _ in range(len(mapped))])
            )
            credit = _parse_optional_amounts(
                mapped[credit_source] if credit_source else pd.Series(["" for _ in range(len(mapped))])
            )

            # Requirement: when direct amount is missing, derive signed amount as credit - debit.
            amount = credit.fillna(0) - debit.fillna(0)
            amount[(debit.isna()) & (credit.isna())] = pd.NA
            mapped["amount"] = amount

    return mapped


def _detect_schema_mapping(normalised_columns: list[str]) -> list[dict]:
    available = list(normalised_columns)
    consumed: set[str] = set()
    result = []

    def pick(canonical: str, aliases: list[str], threshold: float = 0.75) -> tuple[Optional[str], float, str, list[dict]]:
        source, score, strategy, alternatives = _find_best_column_match(
            columns=available,
            aliases=aliases,
            consumed=consumed,
            min_score=threshold,
        )
        if source:
            consumed.add(source)
        return source, score, strategy, alternatives

    for canonical in CANONICAL_SCHEMA_ORDER:
        required = canonical in REQUIRED_COLUMNS

        if canonical != "amount":
            source, score, strategy, alternatives = pick(canonical, MATCH_ALIASES[canonical])
            status = "mapped" if source else ("missing" if required else "defaulted")
            result.append(
                {
                    "canonical": canonical,
                    "source_column": source,
                    "required": required,
                    "status": status,
                    "confidence": score,
                    "strategy": strategy,
                    "alternatives": alternatives,
                }
            )
            continue

        amount_source, amount_score, amount_strategy, amount_alternatives = pick("amount", MATCH_ALIASES["amount"])
        if amount_source:
            result.append(
                {
                    "canonical": "amount",
                    "source_column": amount_source,
                    "required": True,
                    "status": "mapped",
                    "confidence": amount_score,
                    "strategy": amount_strategy,
                    "alternatives": amount_alternatives,
                }
            )
            continue

        debit_source, debit_score, debit_strategy, debit_alternatives = pick("debit", MATCH_ALIASES["debit"])
        credit_source, credit_score, credit_strategy, credit_alternatives = pick("credit", MATCH_ALIASES["credit"])

        if debit_source or credit_source:
            derived_sources = [value for value in [debit_source, credit_source] if value]
            result.append(
                {
                    "canonical": "amount",
                    "source_column": " + ".join(derived_sources),
                    "required": True,
                    "status": "derived",
                    "confidence": max(debit_score, credit_score),
                    "strategy": "derived",
                    "alternatives": {
                        "debit": debit_alternatives,
                        "credit": credit_alternatives,
                        "debit_strategy": debit_strategy,
                        "credit_strategy": credit_strategy,
                    },
                }
            )
        else:
            result.append(
                {
                    "canonical": "amount",
                    "source_column": None,
                    "required": True,
                    "status": "missing",
                    "confidence": 0.0,
                    "strategy": "none",
                    "alternatives": [],
                }
            )

    return result


def _parse_dates(series: pd.Series) -> pd.Series:
    """Try multiple date formats; raise SchemaError if none work."""
    series = series.str.strip()

    # Try pandas auto-detection first (handles most formats)
    parsed = pd.to_datetime(series, errors="coerce", dayfirst=True)

    # For rows that failed, try explicit formats
    failed_mask = parsed.isna()
    if failed_mask.any():
        for fmt in DATE_FORMATS:
            still_failed = parsed.isna()
            if not still_failed.any():
                break
            parsed[still_failed] = pd.to_datetime(
                series[still_failed], format=fmt, errors="coerce"
            )

    # Final check
    still_null = parsed.isna().sum()
    if still_null > 0:
        raise SchemaError(
            f"Column 'date' contains {still_null} unrecognised date value(s). "
            f"Accepted formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY."
        )
    return parsed


def _parse_amounts(series: pd.Series) -> pd.Series:
    """
    Parse amount column. Handles:
    - Plain numbers: '45000', '45000.50'
    - Comma-separated: '1,45,000'
    - Debit/Credit suffix: '45000 Dr', '45000 Cr'
    - Negative for credits: '-45000'
    """
    numeric = _parse_optional_amounts(series)
    bad = numeric.isna().sum()
    if bad > 0:
        raise SchemaError(
            f"Column 'amount' contains {bad} non-numeric value(s). "
            f"Please ensure all amounts are numbers."
        )
    return numeric


def _parse_optional_amounts(series: pd.Series) -> pd.Series:
    cleaned = series.fillna("").astype(str).str.strip()

    # Preserve sign semantics for Dr/Cr style values.
    dr_mask = cleaned.str.contains(r"\bdr\b\s*$", case=False, regex=True)
    cr_mask = cleaned.str.contains(r"\bcr\b\s*$", case=False, regex=True)
    sign = pd.Series(1.0, index=cleaned.index)
    sign[dr_mask] = -1.0
    sign[cr_mask] = 1.0

    # Remove commas and common currency markers.
    cleaned = cleaned.str.replace(",", "", regex=False)
    cleaned = cleaned.str.replace("₹", "", regex=False)
    cleaned = cleaned.str.replace("Rs", "", regex=False)
    cleaned = cleaned.str.replace("INR", "", regex=False)

    # Strip Dr/Cr suffix while preserving absolute value in ingestion.
    cleaned = cleaned.str.replace(r"\s*(Dr|CR|dr|cr|Cr)\s*$", "", regex=True)

    # Handle accounting-style negatives written as (1000).
    cleaned = cleaned.str.replace(r"^\((.*)\)$", r"-\1", regex=True)

    blank = cleaned.eq("")
    numeric = pd.to_numeric(cleaned.mask(blank, pd.NA), errors="coerce")
    numeric = numeric * sign

    invalid = (~blank) & numeric.isna()
    if invalid.any():
        raise SchemaError(
            f"Found {int(invalid.sum())} invalid amount value(s) in amount/debit/credit columns."
        )

    return numeric
