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


class ClientError(Exception):
    pass


def _get_db():
    global _client, _db

    if _db is not None:
        return _db

    if not MONGO_URI:
        raise ClientError("MONGO_URI is not configured on the server.")

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
        _db.clients.create_index([("owner_user_id", 1), ("created_at", -1)])
        return _db
    except ServerSelectionTimeoutError as exc:
        raise ClientError(
            "Database is unreachable. Check MONGO_URI and Atlas IP allowlist/network settings."
        ) from exc
    except PyMongoError as exc:
        raise ClientError("Database connection failed. Check MongoDB credentials and URI.") from exc


def _clients_collection():
    return _get_db().clients


def _coerce_object_id(value: str) -> Optional[ObjectId]:
    try:
        return ObjectId(value)
    except Exception:
        return None


def create_client_for_user(
    user_id: str,
    client_name: str,
    industry: str,
    contact_person: str,
    email: str,
    last_audit_date: str,
    notes: str,
) -> Dict[str, Any]:
    """Create a new client record for a user"""
    now = datetime.now(timezone.utc)
    doc = {
        "owner_user_id": user_id,
        "client_name": client_name.strip(),
        "industry": industry.strip(),
        "contact_person": contact_person.strip(),
        "email": email.strip(),
        "last_audit_date": last_audit_date.strip(),
        "notes": notes.strip(),
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = _clients_collection().insert_one(doc)
    except PyMongoError as exc:
        raise ClientError("Unable to save client. Database operation failed.") from exc

    doc["_id"] = result.inserted_id
    return doc


def list_clients_for_user(user_id: str) -> List[Dict[str, Any]]:
    """List all clients for a user"""
    try:
        return list(_clients_collection().find({"owner_user_id": user_id}).sort("created_at", -1))
    except PyMongoError as exc:
        raise ClientError("Unable to fetch clients. Database operation failed.") from exc


def get_client_for_user(user_id: str, client_id: str) -> Dict[str, Any]:
    """Get a specific client for a user"""
    oid = _coerce_object_id(client_id)
    if not oid:
        raise ClientError("Invalid client id.")

    try:
        doc = _clients_collection().find_one({"_id": oid, "owner_user_id": user_id})
    except PyMongoError as exc:
        raise ClientError("Unable to fetch client. Database operation failed.") from exc

    if not doc:
        raise ClientError("Client not found.")
    return doc


def update_client_for_user(
    user_id: str,
    client_id: str,
    client_name: str,
    industry: str,
    contact_person: str,
    email: str,
    last_audit_date: str,
    notes: str,
) -> Dict[str, Any]:
    """Update a client record"""
    doc = get_client_for_user(user_id, client_id)
    now = datetime.now(timezone.utc)

    try:
        _clients_collection().update_one(
            {"_id": doc["_id"], "owner_user_id": user_id},
            {
                "$set": {
                    "client_name": client_name.strip(),
                    "industry": industry.strip(),
                    "contact_person": contact_person.strip(),
                    "email": email.strip(),
                    "last_audit_date": last_audit_date.strip(),
                    "notes": notes.strip(),
                    "updated_at": now,
                }
            },
        )
    except PyMongoError as exc:
        raise ClientError("Unable to update client. Database operation failed.") from exc

    doc["client_name"] = client_name.strip()
    doc["industry"] = industry.strip()
    doc["contact_person"] = contact_person.strip()
    doc["email"] = email.strip()
    doc["last_audit_date"] = last_audit_date.strip()
    doc["notes"] = notes.strip()
    doc["updated_at"] = now
    return doc


def delete_client_for_user(user_id: str, client_id: str) -> None:
    """Delete a client record"""
    doc = get_client_for_user(user_id, client_id)

    try:
        _clients_collection().delete_one({"_id": doc["_id"], "owner_user_id": user_id})
    except PyMongoError as exc:
        raise ClientError("Unable to delete client. Database operation failed.") from exc


def to_public_client(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert database document to public API response"""
    created_at = doc.get("created_at")
    if isinstance(created_at, datetime):
        created_at_iso = created_at.astimezone(timezone.utc).isoformat()
    else:
        created_at_iso = datetime.now(timezone.utc).isoformat()

    return {
        "id": str(doc["_id"]),
        "client_name": doc.get("client_name", ""),
        "industry": doc.get("industry", ""),
        "contact_person": doc.get("contact_person", ""),
        "email": doc.get("email", ""),
        "last_audit_date": doc.get("last_audit_date", ""),
        "notes": doc.get("notes", ""),
        "created_at": created_at_iso,
    }
