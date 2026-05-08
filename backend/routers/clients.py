from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from schemas.client import ClientRecord, ClientOut
from services.auth_service import AuthError, parse_token
from services.client_service import (
    ClientError,
    create_client_for_user,
    delete_client_for_user,
    get_client_for_user,
    list_clients_for_user,
    to_public_client,
    update_client_for_user,
)


router = APIRouter()
_security = HTTPBearer(auto_error=False)


def _is_server_error(detail: str) -> bool:
    lowered = detail.lower()
    return (
        "database" in lowered
        or "mongodb" in lowered
        or "mongo_uri" in lowered
        or "not configured" in lowered
        or "unreachable" in lowered
    )


def _current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> str:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    try:
        payload = parse_token(credentials.credentials)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    uid = payload.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token payload.")
    return str(uid)


@router.get("", response_model=list[ClientOut])
def list_clients(user_id: str = Depends(_current_user_id)):
    """List all clients for the current user"""
    try:
        rows = list_clients_for_user(user_id)
        return [ClientOut(**to_public_client(row)) for row in rows]
    except ClientError as exc:
        detail = str(exc)
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.post("", response_model=ClientOut, status_code=201)
def create_client(payload: ClientRecord, user_id: str = Depends(_current_user_id)):
    """Create a new client record"""
    try:
        row = create_client_for_user(
            user_id=user_id,
            client_name=payload.client_name,
            industry=payload.industry,
            contact_person=payload.contact_person,
            email=payload.email,
            last_audit_date=payload.last_audit_date,
            notes=payload.notes,
        )
        return ClientOut(**to_public_client(row))
    except ClientError as exc:
        detail = str(exc)
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: str, user_id: str = Depends(_current_user_id)):
    """Get a specific client"""
    try:
        row = get_client_for_user(user_id, client_id)
        return ClientOut(**to_public_client(row))
    except ClientError as exc:
        detail = str(exc)
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail) from exc
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: str,
    payload: ClientRecord,
    user_id: str = Depends(_current_user_id),
):
    """Update a client record"""
    try:
        row = update_client_for_user(
            user_id=user_id,
            client_id=client_id,
            client_name=payload.client_name,
            industry=payload.industry,
            contact_person=payload.contact_person,
            email=payload.email,
            last_audit_date=payload.last_audit_date,
            notes=payload.notes,
        )
        return ClientOut(**to_public_client(row))
    except ClientError as exc:
        detail = str(exc)
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail) from exc
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: str, user_id: str = Depends(_current_user_id)):
    """Delete a client record"""
    try:
        delete_client_for_user(user_id, client_id)
    except ClientError as exc:
        detail = str(exc)
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail) from exc
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc
