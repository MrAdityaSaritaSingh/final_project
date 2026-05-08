import os
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from schemas.workbook import WorkbookCreateRequest, WorkbookEntityConfigRequest, WorkbookOut
from scrutiny.ingestor import SchemaError
from services.auth_service import AuthError, parse_token
from services.scrutiny_service import run_analysis, save_upload
from services.workbook_service import (
    WorkbookError,
    create_workbook_for_user,
    delete_workbook_for_user,
    get_workbook_for_user,
    list_workbooks_for_user,
    save_analysis_for_user,
    save_entity_config_for_user,
    query_transactions_for_user,
    to_public_workbook,
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


@router.get("", response_model=list[WorkbookOut])
def list_workbooks(user_id: str = Depends(_current_user_id)):
    try:
        rows = list_workbooks_for_user(user_id)
        return [WorkbookOut(**to_public_workbook(row, include_rows=False)) for row in rows]
    except WorkbookError as exc:
        detail = str(exc)
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.post("", response_model=WorkbookOut, status_code=201)
def create_workbook(payload: WorkbookCreateRequest, user_id: str = Depends(_current_user_id)):
    try:
        row = create_workbook_for_user(
            user_id=user_id,
            client_name=payload.client_name,
            financial_year=payload.financial_year,
            functional_currency=payload.functional_currency,
            engagement_type=payload.engagement_type,
            assessment_year=payload.assessment_year,
            industry_type=payload.industry_type,
            reporting_framework=payload.reporting_framework,
            tax_id=payload.tax_id,
            materiality_threshold=payload.materiality_threshold,
        )
        return WorkbookOut(**to_public_workbook(row, include_rows=False))
    except WorkbookError as exc:
        detail = str(exc)
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.get("/{workbook_id}", response_model=WorkbookOut)
def get_workbook(workbook_id: str, user_id: str = Depends(_current_user_id)):
    try:
        row = get_workbook_for_user(user_id, workbook_id)
        return WorkbookOut(**to_public_workbook(row, include_rows=False))
    except WorkbookError as exc:
        detail = str(exc)
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail) from exc
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.put("/{workbook_id}/entity-config", response_model=WorkbookOut)
def save_entity_config(
    workbook_id: str,
    payload: WorkbookEntityConfigRequest,
    user_id: str = Depends(_current_user_id),
):
    try:
        row = save_entity_config_for_user(user_id, workbook_id, payload.model_dump())
        return WorkbookOut(**to_public_workbook(row, include_rows=False))
    except WorkbookError as exc:
        detail = str(exc)
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail) from exc
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.post("/{workbook_id}/ingest")
async def ingest_workbook_file(
    workbook_id: str,
    file: UploadFile = File(...),
    use_ml: bool = Form(True),
    contamination: float = Form(0.05),
    user_id: str = Depends(_current_user_id),
):
    try:
        workbook = get_workbook_for_user(user_id, workbook_id)
    except WorkbookError as exc:
        detail = str(exc)
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail) from exc
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc

    if not workbook.get("entity_config"):
        raise HTTPException(
            status_code=400,
            detail="Entity configuration is required before ingestion.",
        )

    tmp_path = await save_upload(file)
    try:
        _, result = run_analysis(tmp_path, use_ml, contamination, workbook_id=workbook_id)
        save_analysis_for_user(
            user_id,
            workbook_id,
            summary=result.get("summary", {}),
            category_counts=result.get("category_counts", []),
            transaction_docs=result.get("transaction_docs", []),
        )
        # Remove massive row arrays from response to keep it lightweight
        if "transaction_docs" in result:
            del result["transaction_docs"]
        if "flagged_rows" in result:
            del result["flagged_rows"]
            
        return result
    except SchemaError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except WorkbookError as exc:
        detail = str(exc)
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

@router.delete("/{workbook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workbook(workbook_id: str, user_id: str = Depends(_current_user_id)):
    try:
        delete_workbook_for_user(user_id, workbook_id)
    except WorkbookError as exc:
        detail = str(exc)
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail) from exc
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.get("/{workbook_id}/transactions", response_model=list[dict])
def get_workbook_transactions(
    workbook_id: str,
    page: int = 1,
    limit: int = 100,
    transaction_type: str = "review",
    user_id: str = Depends(_current_user_id)
):
    try:
        skip = (page - 1) * limit
        rows = query_transactions_for_user(
            user_id=user_id,
            workbook_id=workbook_id,
            filters={},  # No filters for now
            transaction_type=transaction_type,
            skip=skip,
            limit=limit
        )
        return rows
    except WorkbookError as exc:
        detail = str(exc)
        if "not found" in detail.lower():
            raise HTTPException(status_code=404, detail=detail) from exc
        if _is_server_error(detail):
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc
