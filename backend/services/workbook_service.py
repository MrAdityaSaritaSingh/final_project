import math
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError


MONGO_URI = os.environ.get("MONGO_URI", "")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "auditdb")

_client: Optional[MongoClient] = None
_db = None


class WorkbookError(Exception):
    pass


def _get_db():
    global _client, _db

    if _db is not None:
        return _db

    if not MONGO_URI:
        raise WorkbookError("MONGO_URI is not configured on the server.")

    try:
        _client = MongoClient(
            MONGO_URI,
            maxPoolSize=20,
            minPoolSize=2,
            maxIdleTimeMS=300000,
            connectTimeoutMS=10000,
            serverSelectionTimeoutMS=5000,
            socketTimeoutMS=20000,
        )
        _db = _client[MONGO_DB_NAME]
        _db.command("ping")
        _db.workbooks.create_index([("owner_user_id", 1), ("updated_at", -1)])
        
        # Transaction collection indexes for filter/sort performance
        _db.transactions.create_index([("workbook_id", 1), ("is_flagged", 1)])
        _db.transactions.create_index([("workbook_id", 1), ("amount", -1)])
        _db.transactions.create_index([("workbook_id", 1), ("date", 1)])
        _db.transactions.create_index([("workbook_id", 1), ("voucher_type", 1)])
        _db.transactions.create_index([("workbook_id", 1), ("searchable_text", 1)])
        
        return _db
    except ServerSelectionTimeoutError as exc:
        raise WorkbookError(
            "Database is unreachable. Check MONGO_URI and Atlas IP allowlist/network settings."
        ) from exc
    except PyMongoError as exc:
        raise WorkbookError("Database connection failed. Check MongoDB credentials and URI.") from exc


def _workbooks_collection():
    return _get_db().workbooks


def _coerce_object_id(value: str) -> Optional[ObjectId]:
    try:
        return ObjectId(value)
    except Exception:
        return None


def create_workbook_for_user(
    user_id: str,
    client_name: str,
    financial_year: str,
    functional_currency: str,
    engagement_type: Optional[str],
    assessment_year: Optional[str] = None,
    industry_type: Optional[str] = None,
    reporting_framework: Optional[str] = None,
    tax_id: Optional[str] = None,
    materiality_threshold: Optional[float] = None,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    doc = {
        "owner_user_id": user_id,
        "client_name": client_name.strip(),
        "financial_year": financial_year.strip(),
        "functional_currency": functional_currency.strip(),
        "engagement_type": (engagement_type or "").strip(),
        "assessment_year": (assessment_year or "").strip(),
        "industry_type": (industry_type or "").strip(),
        "reporting_framework": (reporting_framework or "").strip(),
        "tax_id": (tax_id or "").strip(),
        "materiality_threshold": materiality_threshold,
        "status": "Draft",
        "risk_score": 0,
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = _workbooks_collection().insert_one(doc)
    except PyMongoError as exc:
        raise WorkbookError("Unable to save workbook. Database operation failed.") from exc

    doc["_id"] = result.inserted_id
    return doc


def list_workbooks_for_user(user_id: str) -> List[Dict[str, Any]]:
    try:
        return list(
            _workbooks_collection()
            .find({"owner_user_id": user_id, "is_deleted": {"$ne": True}})
            .sort("updated_at", -1)
        )
    except PyMongoError as exc:
        raise WorkbookError("Unable to fetch workbooks. Database operation failed.") from exc


def get_workbook_for_user(user_id: str, workbook_id: str) -> Dict[str, Any]:
    oid = _coerce_object_id(workbook_id)
    if not oid:
        raise WorkbookError("Invalid workbook id.")

    try:
        doc = _workbooks_collection().find_one(
            {"_id": oid, "owner_user_id": user_id, "is_deleted": {"$ne": True}}
        )
    except PyMongoError as exc:
        raise WorkbookError("Unable to fetch workbook. Database operation failed.") from exc

    if not doc:
        raise WorkbookError("Workbook not found.")
    return doc


def delete_workbook_for_user(user_id: str, workbook_id: str) -> None:
    oid = _coerce_object_id(workbook_id)
    if not oid:
        raise WorkbookError("Invalid workbook id.")

    now = datetime.now(timezone.utc)
    try:
        result = _workbooks_collection().update_one(
            {"_id": oid, "owner_user_id": user_id, "is_deleted": {"$ne": True}},
            {"$set": {"is_deleted": True, "deleted_at": now, "updated_at": now}},
        )
        if result.modified_count == 0:
            raise WorkbookError("Workbook not found.")
    except PyMongoError as exc:
        raise WorkbookError("Unable to delete workbook. Database operation failed.") from exc


def save_entity_config_for_user(user_id: str, workbook_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    doc = get_workbook_for_user(user_id, workbook_id)
    now = datetime.now(timezone.utc)

    entity_config = {
        "entity_name": payload.get("entity_name", "").strip(),
        "financial_year": payload.get("financial_year", "").strip(),
        "ledger_type": payload.get("ledger_type", "").strip(),
        "functional_currency": payload.get("functional_currency", "").strip(),
        "reporting_currency": (payload.get("reporting_currency") or "").strip(),
        "company_code": (payload.get("company_code") or "").strip(),
    }

    column_mappings = {}
    if isinstance(payload.get("column_mappings"), dict):
        column_mappings = {
            str(key): str(value) for key, value in payload.get("column_mappings", {}).items() if value is not None
        }

    header_row = payload.get("header_row")
    try:
        _workbooks_collection().update_one(
            {"_id": doc["_id"], "owner_user_id": user_id},
            {
                "$set": {
                    "entity_config": entity_config,
                    "column_mappings": column_mappings,
                    "header_row": int(header_row) if header_row is not None else None,
                    "status": "In Progress",
                    "updated_at": now,
                }
            },
        )
    except PyMongoError as exc:
        raise WorkbookError("Unable to save workbook configuration. Database operation failed.") from exc

    doc["entity_config"] = entity_config
    doc["column_mappings"] = column_mappings
    doc["header_row"] = int(header_row) if header_row is not None else None
    doc["status"] = "In Progress"
    doc["updated_at"] = now
    return doc


def save_analysis_for_user(
    user_id: str,
    workbook_id: str,
    summary: Dict[str, Any],
    category_counts: List[Dict[str, Any]],
    transaction_docs: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    doc = get_workbook_for_user(user_id, workbook_id)
    now = datetime.now(timezone.utc)

    total_flagged = int(summary.get("total_flagged", 0))
    total_entries = int(summary.get("total_entries", 0))
    risk_score = int(round((total_flagged / total_entries) * 100)) if total_entries > 0 else 0
    risk_score = max(0, min(risk_score, 100))

    latest_summary = {
        "total_entries": total_entries,
        "rule_flagged": int(summary.get("rule_flagged", 0)),
        "ml_flagged": int(summary.get("ml_flagged", 0)),
        "total_flagged": total_flagged,
        "pct_flagged": float(summary.get("pct_flagged", 0)),
    }

    try:
        # Clear existing transactions for this workbook
        _get_db().transactions.delete_many({"workbook_id": doc["_id"]})
        
        if transaction_docs:
            # Prepare docs for insertion (ensure workbook_id is ObjectId)
            for tdoc in transaction_docs:
                tdoc["workbook_id"] = doc["_id"]
            
            _get_db().transactions.insert_many(transaction_docs)

        _workbooks_collection().update_one(
            {"_id": doc["_id"], "owner_user_id": user_id},
            {
                "$set": {
                    "status": "Completed" if total_flagged == 0 else "In Progress",
                    "risk_score": risk_score,
                    "latest_summary": latest_summary,
                    "latest_category_counts": category_counts,
                    "updated_at": now,
                }
            },
        )
    except PyMongoError as exc:
        raise WorkbookError("Unable to save workbook analysis. Database operation failed.") from exc

    doc["status"] = "Completed" if total_flagged == 0 else "In Progress"
    doc["risk_score"] = risk_score
    doc["latest_summary"] = latest_summary
    doc["latest_category_counts"] = category_counts
    doc["updated_at"] = now
    
    # We leave the rows empty in the returned doc to avoid memory overhead
    # since it's just returning from the ingest endpoint
    doc["flagged_rows"] = []
    
    return doc


def _is_date_in_range(date_str: str, start_date: Optional[str], end_date: Optional[str]) -> bool:
    """Check if a date falls within a range."""
    try:
        if not date_str:
            return False
        row_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        if start_date:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            if row_date < start:
                return False
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
            if row_date > end:
                return False
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _is_amount_in_range(row: Dict[str, Any], min_amt: float, max_amt: float) -> bool:
    """Check if transaction amount is within range."""
    try:
        debit = float(row.get("debit", 0) or 0)
        credit = float(row.get("credit", 0) or 0)
        amount = debit or credit
        return min_amt <= amount <= max_amt
    except (ValueError, TypeError):
        return False


def query_transactions_for_user(
    user_id: str,
    workbook_id: str,
    filters: Dict[str, Any],
    transaction_type: str = "review",
    skip: int = 0,
    limit: int = 100,
    sort_by: str = "date",
    sort_order: int = 1
) -> tuple[List[Dict[str, Any]], int]:
    """Query and filter transactions from a workbook's analysis with pagination."""
    doc = get_workbook_for_user(user_id, workbook_id)
    
    # Build MongoDB query
    query: Dict[str, Any] = {"workbook_id": doc["_id"]}
    
    # If transaction_type is 'flagged', only return flagged items
    if transaction_type == "flagged":
        query["is_flagged"] = True
    
    # Apply filters to MongoDB query for performance
    if filters.get("financial_year"):
        query["financial_year"] = filters["financial_year"]
    
    if filters.get("quarter") and filters["quarter"] != "all":
        query["quarter"] = filters["quarter"]
        
    if filters.get("voucher_types"):
        query["voucher_type"] = {"$in": [v.lower() for v in filters["voucher_types"]]}
        
    if filters.get("account_series"):
        series_list = [s.strip() for s in filters["account_series"].split(",") if s.strip()]
        if len(series_list) == 1:
            query["account_series"] = {"$regex": f"^{series_list[0]}", "$options": "i"}
        elif len(series_list) > 1:
            patterns = "|".join(series_list)
            query["account_series"] = {"$regex": f"^({patterns})", "$options": "i"}
        
    if filters.get("ledger_type"):
        query["ledger_type"] = {"$regex": filters["ledger_type"], "$options": "i"}

    if filters.get("min_amount") is not None or filters.get("max_amount") is not None:
        amt_query = {}
        if filters.get("min_amount") is not None:
            amt_query["$gte"] = float(filters["min_amount"])
        if filters.get("max_amount") is not None:
            amt_query["$lte"] = float(filters["max_amount"])
        query["amount"] = amt_query

    if filters.get("search_text"):
        query["searchable_text"] = {"$regex": filters["search_text"].lower(), "$options": "i"}

    if filters.get("scrutiny_category"):
        query["category"] = {"$regex": filters["scrutiny_category"], "$options": "i"}

    if filters.get("amount_preset") == "above500k":
        if "amount" not in query:
            query["amount"] = {}
        # Take max of existing min_amount and 500k
        existing_min = query["amount"].get("$gte", 0)
        query["amount"]["$gte"] = max(existing_min, 500000.0)

    try:
        # Whitelist sort fields
        valid_sort_fields = {"date", "amount", "ledger_type", "voucher_type"}
        actual_sort_by = sort_by if sort_by in valid_sort_fields else "date"
        
        total = _get_db().transactions.count_documents(query)
        
        # Handle top10expenses preset
        actual_skip = skip
        actual_limit = limit
        if filters.get("amount_preset") == "top10expenses":
            actual_limit = math.ceil(total * 0.1)
            actual_skip = 0 # Top 10% ignore pagination skip
            actual_sort_by = "amount"
            sort_order = -1
            # Still cap by requested limit to prevent massive responses if not paginated
            if limit > 0 and actual_limit > limit:
                actual_limit = limit

        cursor = _get_db().transactions.find(query).sort(actual_sort_by, sort_order).skip(actual_skip).limit(actual_limit)
        # Combine the generated metadata and the raw data for the frontend
        results = []
        for txn_doc in cursor:
            row = txn_doc.get("data", {})
            # Ensure derived fields are included in the row if they're not there
            row["scrutiny_category"] = txn_doc.get("category", "")
            row["scrutiny_reason"] = txn_doc.get("reason", "")
            row["is_flagged"] = txn_doc.get("is_flagged", False)
            results.append(row)
        return results, total
    except Exception:
        return [], 0


def to_public_workbook(doc: Dict[str, Any], include_rows: bool = True) -> Dict[str, Any]:
    updated_at = doc.get("updated_at")
    if isinstance(updated_at, datetime):
        last_modified = updated_at.astimezone(timezone.utc).isoformat()
    else:
        last_modified = datetime.now(timezone.utc).isoformat()

    entity_config_raw = doc.get("entity_config") if isinstance(doc.get("entity_config"), dict) else None
    entity_config = None
    if entity_config_raw:
        entity_config = {
            "entity_name": str(entity_config_raw.get("entity_name", "")),
            "financial_year": str(entity_config_raw.get("financial_year", "")),
            "ledger_type": str(entity_config_raw.get("ledger_type", "")),
            "functional_currency": str(entity_config_raw.get("functional_currency", "")),
            "reporting_currency": str(entity_config_raw.get("reporting_currency", "")).strip() or None,
            "company_code": str(entity_config_raw.get("company_code", "")).strip() or None,
        }

    latest_summary_raw = doc.get("latest_summary") if isinstance(doc.get("latest_summary"), dict) else None
    analysis_summary = None
    if latest_summary_raw:
        analysis_summary = {
            "total_entries": int(latest_summary_raw.get("total_entries", 0)),
            "rule_flagged": int(latest_summary_raw.get("rule_flagged", 0)),
            "ml_flagged": int(latest_summary_raw.get("ml_flagged", 0)),
            "total_flagged": int(latest_summary_raw.get("total_flagged", 0)),
            "pct_flagged": float(latest_summary_raw.get("pct_flagged", 0)),
        }

    category_counts = []
    if isinstance(doc.get("latest_category_counts"), list):
        category_counts = doc.get("latest_category_counts", [])

    column_mappings = doc.get("column_mappings") if isinstance(doc.get("column_mappings"), dict) else {}
    
    return {
        "id": str(doc.get("_id", "")),
        "client_name": doc.get("client_name", ""),
        "financial_year": doc.get("financial_year", ""),
        "functional_currency": doc.get("functional_currency", ""),
        "engagement_type": doc.get("engagement_type", ""),
        "assessment_year": doc.get("assessment_year"),
        "industry_type": doc.get("industry_type"),
        "reporting_framework": doc.get("reporting_framework"),
        "tax_id": doc.get("tax_id"),
        "materiality_threshold": doc.get("materiality_threshold"),
        "status": doc.get("status", "Draft"),
        "last_modified": last_modified,
        "risk_score": int(doc.get("risk_score", 0)),
        "has_entity_config": bool(entity_config),
        "entity_config": entity_config,
        "column_mappings": column_mappings,
        "analysis_summary": analysis_summary,
        "category_counts": category_counts,
    }

def aggregate_workbook_kpis(user_id: str, workbook_id: str) -> Dict[str, Any]:
    """Run an aggregation pipeline to get KPIs, risk buckets, and controls."""
    doc = get_workbook_for_user(user_id, workbook_id)
    workbook_oid = doc["_id"]

    pipeline = [
        {"$match": {"workbook_id": workbook_oid, "is_flagged": True}},
        {
            "$facet": {
                "total_exposure": [
                    {"$group": {"_id": None, "total": {"$sum": {"$abs": "$amount"}}}}
                ],
                "risk_buckets": [
                    {
                        "$addFields": {
                            "bucket": {
                                "$cond": [
                                    {
                                        "$or": [
                                            {"$regexMatch": {"input": "$category", "regex": "ML Anomaly", "options": "i"}},
                                            {"$regexMatch": {"input": "$category", "regex": "Manual Journal", "options": "i"}},
                                            {"$gte": ["$amount", 100000]}
                                        ]
                                    },
                                    "high",
                                    {
                                        "$cond": [
                                            {
                                                "$or": [
                                                    {"$regexMatch": {"input": "$category", "regex": "Period End", "options": "i"}},
                                                    {"$regexMatch": {"input": "$category", "regex": "Weekend", "options": "i"}},
                                                    {"$regexMatch": {"input": "$category", "regex": "Duplicate", "options": "i"}},
                                                    {"$regexMatch": {"input": "$category", "regex": "Round Numbers", "options": "i"}}
                                                ]
                                            },
                                            "medium",
                                            "low"
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    {"$group": {"_id": "$bucket", "count": {"$sum": 1}, "exposure": {"$sum": {"$abs": "$amount"}}}}
                ],
                "controls": [
                    {"$project": {"category_list": {"$split": ["$category", ", "]}, "amount": 1}},
                    {"$unwind": "$category_list"},
                    {
                        "$group": {
                            "_id": "$category_list",
                            "count": {"$sum": 1},
                            "exposure": {"$sum": {"$abs": "$amount"}}
                        }
                    },
                    {"$project": {"category": "$_id", "_id": 0, "count": 1, "exposure": 1}}
                ]
            }
        }
    ]

    try:
        results = list(_get_db().transactions.aggregate(pipeline))
        if not results:
            return {"total_exposure": 0, "risk_buckets": {"high": {"count": 0, "exposure": 0}, "medium": {"count": 0, "exposure": 0}, "low": {"count": 0, "exposure": 0}}, "controls": []}

        data = results[0]
        total_exp = data["total_exposure"][0]["total"] if data["total_exposure"] else 0
        
        risk_buckets = {b["_id"]: {"count": b["count"], "exposure": b["exposure"]} for b in data["risk_buckets"]}
        # Ensure all buckets exist
        for b in ["high", "medium", "low"]:
            if b not in risk_buckets:
                risk_buckets[b] = {"count": 0, "exposure": 0}

        return {
            "total_exposure": total_exp,
            "risk_buckets": risk_buckets,
            "controls": data["controls"]
        }
    except Exception as exc:
        print(f"Aggregation failed: {exc}")
        return {"total_exposure": 0, "risk_buckets": {"high": {"count": 0, "exposure": 0}, "medium": {"count": 0, "exposure": 0}, "low": {"count": 0, "exposure": 0}}, "controls": []}

