import os
import traceback
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import Response, JSONResponse

from services.scrutiny_service import save_upload, run_analysis, generate_report, preview_mapping
from scrutiny.ingestor import SchemaError

router = APIRouter()

CORS_HEADERS = {"Access-Control-Allow-Origin": "*"}


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    use_ml: bool = Form(True),
    contamination: float = Form(0.05),
):
    tmp_path = await save_upload(file)
    try:
        df, result = run_analysis(tmp_path, use_ml, contamination)
        return result
    except SchemaError as e:
        return JSONResponse(status_code=400, content={"detail": str(e)}, headers=CORS_HEADERS)
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)}, headers=CORS_HEADERS)
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@router.post("/schema-preview")
async def schema_preview(file: UploadFile = File(...)):
    tmp_path = await save_upload(file)
    try:
        return preview_mapping(tmp_path)
    except SchemaError as e:
        return JSONResponse(status_code=400, content={"detail": str(e)}, headers=CORS_HEADERS)
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)}, headers=CORS_HEADERS)
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@router.post("/export")
async def export_report(
    file: UploadFile = File(...),
    use_ml: bool = Form(True),
    contamination: float = Form(0.05),
    approved: bool = Form(False),
):
    if not approved:
        return JSONResponse(
            status_code=400,
            content={"detail": "Audit review is pending. Approve suspicious transactions before export."},
            headers=CORS_HEADERS,
        )

    tmp_path = await save_upload(file)
    try:
        df, _ = run_analysis(tmp_path, use_ml, contamination)
        excel_bytes = generate_report(df)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=scrutiny_report.xlsx",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except SchemaError as e:
        return JSONResponse(status_code=400, content={"detail": str(e)}, headers=CORS_HEADERS)
    except Exception as e:
        tb = traceback.format_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "trace": tb},
            headers=CORS_HEADERS,
        )
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
