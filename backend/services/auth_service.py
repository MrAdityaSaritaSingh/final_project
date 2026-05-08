import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError, ServerSelectionTimeoutError


MONGO_URI = os.environ.get("MONGO_URI", "")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "auditdb")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "720"))

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_client: Optional[MongoClient] = None
_db = None


class AuthError(Exception):
    pass


def _get_db():
    global _client, _db

    if _db is not None:
        return _db

    if not MONGO_URI:
        raise AuthError("MONGO_URI is not configured on the server.")

    try:
        # Render backend is a long-running web process; keep a moderate pre-warmed pool.
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
        # Ping forces an early connectivity/auth check so failures are explicit.
        _db.command("ping")
        _db.users.create_index("email", unique=True)
        return _db
    except ServerSelectionTimeoutError as exc:
        raise AuthError(
            "Database is unreachable. Check MONGO_URI and Atlas IP allowlist/network settings."
        ) from exc
    except PyMongoError as exc:
        raise AuthError("Database connection failed. Check MongoDB credentials and URI.") from exc


def _users_collection():
    return _get_db().users


def _normalise_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email,
        "uid": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_user(name: str, email: str, password: str) -> Dict[str, Any]:
    users = _users_collection()
    doc = {
        "name": name.strip(),
        "email": _normalise_email(email),
        "password_hash": hash_password(password),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = users.insert_one(doc)
    except DuplicateKeyError as exc:
        raise AuthError("An account with this email already exists.") from exc
    except PyMongoError as exc:
        raise AuthError("Unable to save user. Database operation failed.") from exc

    doc["_id"] = result.inserted_id
    return doc


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    users = _users_collection()
    try:
        user = users.find_one({"email": _normalise_email(email)})
    except PyMongoError as exc:
        raise AuthError("Unable to verify login. Database operation failed.") from exc

    if not user or not verify_password(password, user.get("password_hash", "")):
        raise AuthError("Invalid email or password.")
    return user


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    users = _users_collection()
    try:
        return users.find_one({"_id": _coerce_object_id(user_id)})
    except PyMongoError as exc:
        raise AuthError("Unable to fetch user profile. Database operation failed.") from exc


def _coerce_object_id(value: str):
    from bson import ObjectId

    try:
        return ObjectId(value)
    except Exception:
        return None


def parse_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if "uid" not in payload:
            raise AuthError("Invalid token payload.")
        return payload
    except JWTError as exc:
        raise AuthError("Invalid or expired token.") from exc


def to_public_user(user: Dict[str, Any]) -> Dict[str, str]:
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
    }