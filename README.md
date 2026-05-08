# Ledger Scrutiny

Ledger Scrutiny is a full-stack audit application for General Ledger review.
It provides:

- GL upload and ingestion
- Dynamic column detection for messy real-world headers
- Rule-based and ML-assisted anomaly detection
- Workbook-based review workflow
- Investigation and documentation workspace
- Report export support

## Project Layout

Repository root:

- `backend/` : FastAPI backend
- `frontend/` : React + Vite frontend

Backend key folders:

- `backend/main.py` : FastAPI app entrypoint
- `backend/routers/` : API routes (`/api/auth`, `/api/scrutiny`, `/api/workbooks`)
- `backend/services/` : business/service layer
- `backend/scrutiny/` : ingestion, rule engine, ML, export
- `backend/tests/` : pytest tests

Frontend key folders:

- `frontend/src/pages/` : page-level UI
- `frontend/src/components/` : reusable UI components
- `frontend/src/api/` : backend API clients
- `frontend/src/types/` : TypeScript models

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+

## Setup

From repository root (`audit`):

1. Create/activate virtual environment (optional but recommended)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install backend dependencies

```powershell
pip install -r backend/requirements.txt
```

3. Install frontend dependencies

```powershell
cd frontend
npm install
```

## Environment Variables (Backend)

Set these before running backend if you use auth/workbook persistence:

- `MONGO_URI` : MongoDB connection string
- `MONGO_DB_NAME` : MongoDB database name (default used in code if not set)
- `JWT_SECRET_KEY` : JWT signing key
- `ALLOWED_ORIGINS` : optional comma-separated CORS origins (defaults to `*`)

## How to Run

### Run Backend API

```powershell
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

API base URL:

- `http://127.0.0.1:8000`

### Run Frontend

Open a second terminal:

```powershell
cd frontend
npm run dev
```

Frontend dev URL:

- `http://127.0.0.1:5173`

## Build and Test

### Frontend build

```powershell
cd frontend
npm run build
```

### Backend tests

```powershell
cd backend
python -m pytest -q
```

## Upload File Requirements

Core required logical fields:

- `date`
- `ledger_name`
- `amount` source

Amount source rules:

- Use direct `amount` if detected
- If `amount` is missing, derive as: `amount = credit - debit`
- At least one amount source must exist (`amount` OR debit/credit)

Optional fields:

- `narration`
- `voucher_type`

The ingestion system supports normalized matching, synonyms, partial matching,
and fuzzy fallback for inconsistent headers.

## Deployment

### Vercel (Frontend)

1. Connect the GitHub repository `https://github.com/Abhinaya54/audit_ledger_scrutiny` to Vercel.
2. Vercel will auto-detect `vercel.json` and use:
   - Build command: `npm run vercel-build`
   - Output directory: `frontend/dist`
3. Update the `rewrites.destination` in `vercel.json` to point to your actual Render backend URL once it is deployed.
4. Deploy.

### Render (Backend)

1. Connect the same GitHub repository to Render.
2. Use the Blueprint option and select `render.yaml` — Render will auto-provision the web service.
3. Alternatively, create a manual **Web Service**:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `backend`
4. Set environment variables in the Render dashboard:
   - `MONGO_URI` — your MongoDB connection string
   - `MONGO_DB_NAME` — database name
   - `JWT_SECRET_KEY` — strong random secret for JWT signing
   - `ALLOWED_ORIGINS` — set to your Vercel frontend domain (or `*` for development)
5. Deploy.

### Post-Deployment

- Update `vercel.json` → `rewrites[0].destination` with the exact Render backend URL (e.g., `https://<your-service>.onrender.com/api/:path*`).
- Redeploy Vercel so the frontend proxies API calls to the live backend.

## Notes

- Frontend documentation editor uses Quill.
- PDF export is handled in frontend using `jspdf`.
- If you change frontend dependencies and hit Vite optimize cache errors,
  clear `frontend/node_modules/.vite` and restart `npm run dev`.
