import sys
import os
from datetime import datetime, timezone

# Add backend directory to import local modules when running main.py directly.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load local environment variables (e.g., MONGO_URI) for development runs.
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import scrutiny, auth, workbooks, clients

APP_VERSION = "2.0.0"

app = FastAPI(
    title="Ledger Scrutiny API",
    description=(
        "Backend API for the Audit Ledger Scrutiny platform.\n\n"
        "Provides automated anomaly detection on General Ledger data using "
        "a 6-rule engine (round amounts, weekend entries, period-end clustering, "
        "weak narrations, duplicate detection, manual journals) and an "
        "Isolation Forest ML model.\n\n"
        "**Modules:** Scrutiny (stateless analysis) · Auth (JWT) · "
        "Workbooks (persistent engagements) · Clients (CRM)"
    ),
    version=APP_VERSION,
    contact={"name": "Audit Ledger Scrutiny", "url": "https://github.com/Abhinaya54/audit_ledger_scrutiny"},
    license_info={"name": "Private"},
    openapi_tags=[
        {"name": "Health", "description": "Service health and readiness checks"},
        {"name": "Scrutiny", "description": "Stateless file upload → anomaly detection → export"},
        {"name": "Auth", "description": "User signup, login, and JWT token management"},
        {"name": "Workbooks", "description": "Persistent audit engagements with analysis history"},
        {"name": "Clients", "description": "Client record management (CRM)"},
    ],
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production set ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
# Falls back to ["*"] for local development, but in production must be explicitly configured.
_origins_env = os.environ.get("ALLOWED_ORIGINS", "").strip()
DEFAULT_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]
PRODUCTION_ORIGINS = [
    "https://audit-ledger-scrutiny.vercel.app",
    "https://www.audit-ledger-scrutiny.vercel.app",
]

if _origins_env and _origins_env != "*":
    ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]
    for origin in PRODUCTION_ORIGINS:
        if origin not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(origin)
elif _origins_env == "*":
    ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = DEFAULT_DEV_ORIGINS + ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Content-Type", "Content-Disposition"],
    max_age=3600,
)


# ── Health endpoint ───────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health():
    """Service health check. Returns status, version, and server timestamp."""
    return {
        "status": "ok",
        "version": APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": "Ledger Scrutiny API is running.",
    }


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(scrutiny.router, prefix="/api/scrutiny", tags=["Scrutiny"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(workbooks.router, prefix="/api/workbooks", tags=["Workbooks"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

