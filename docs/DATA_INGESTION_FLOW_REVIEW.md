# Critical Review: Data Ingestion Flow — AI-Powered Ledger Scrutiny Platform

**Reviewer:** Senior Product Engineer + UX Systems Reviewer
**Specialization:** Audit-tech, fintech workflow products
**Date:** May 7, 2026
**Scope:** Frontend, backend, data model, UX, audit workflow alignment, explainability, scalability

---

## 1. Executive Summary

**Verdict: The current ingestion flow is designed like an ERP setup wizard, not an audit tool.** The architecture prioritizes database normalization and "clean architecture" over auditor time. Critical workflow missteps include forcing entity configuration as a prerequisite to upload, requiring workbook creation before file analysis, and a frontend-heavy data processing model that will collapse under real-world ledger sizes. The product fails to deliver "SonarQube for ledgers" and instead feels like a digital engagement letter generator.

**Core Problem:** The system confuses **engagement setup** (administrative overhead) with **analysis execution** (value-producing work). For a time-starved auditor, **every second before first flagged transaction is friction**.

---

## 2. Critical UX Problems

### 2.1 Create Workbook -> Entity Config -> Upload -> Map -> Ingest -> Analyze = 6 Steps Before Value

The current flow:

```
Create Workbook (9-field form)
  -> Entity Config (6 more fields)
    -> Upload File
      -> Column Mapping (9 manual mappings)
        -> Ingest Data (button click, artificial step)
          -> Data Health Summary (more reading)
            -> Run Analysis (FINALLY)
```

**This is catastrophic.**

- `CreateWorkbook.tsx` forces `client_name`, `financial_year`, `functional_currency`, `engagement_type`, `assessment_year`, `industry_type`, `reporting_framework`, `tax_id`, `materiality_threshold` before the user sees a single anomaly.
- `DataIngestionWorkspace.tsx` requires `entityName`, `financialYear`, `ledgerType`, `functionalCurrency`, `reportingCurrency`, `companyCode` **again** (entity config is duplicated across two screens).
- Auditors do not think "I need to configure a workbook entity before finding suspicious round-number transactions." They think "show me the red flags."

**Real audit behavior:** A senior auditor gets handed a 50MB GL export at 11 PM and needs to know "what's weird" by morning. The current flow would take 5-10 minutes of administrative work before producing any signal. In a Big 4 context, that is a rejected tool.

### 2.2 Cognitive Load is Backward

The system pushes low-value decisions **before** high-value decisions:

| Step | Required | Why Auditor Cares |
|------|----------|-----------------|
| Client name | Yes | Only for filing, not analysis |
| Financial year | Yes | Default assumption: current FY |
| Currency | Yes | Almost always INR for Indian firms |
| Reporting framework | No | Does nothing for anomaly detection |
| Materiality threshold | No | Should be defaulted based on revenue |
| Ledger type | Yes | System should detect this |
| Company code | No | Multi-entity use is edge case |
| Engagement type | No | Administrative only |

**The form has 9+ required/optional fields before a single row of data is visible.** This violates every UX principle for fast-path workflows.

### 2.3 The "Ingest Data" Button is a Fake Gate

In `DataIngestionWorkspace.tsx`:

```tsx
<button onClick={() => setDataIngested(true)} disabled={!uploadedFile}>
  Ingest Data
</button>
```

This button does **nothing but set a state flag**. It does not actually process data. The cognitive cost of "ingestion" as a separate user step with no visible progress or feedback is a pure friction creator.

### 2.4 Column Mapping is Manual When It Should Be Automatic

The `DataIngestionWorkspace.tsx` shows:

```tsx
const [columnMappings, setColumnMappings] = useState([
  { systemField: 'Date', mappedColumn: '', required: true },
  { systemField: 'Journal ID', mappedColumn: '', required: true },
  { systemField: 'Account Name', mappedColumn: '', required: true },
  // ...
]);
```

Yet the backend ingestor (`scrutiny/ingestor.py`) already has a full Levenshtein-based auto-mapping system (`_find_best_column_match`, `_score_alias_match`). The frontend has:
- **No access** to the backend auto-mapping confidence scores
- Forces every user to manually select 9 column mappings
- Wastes time on system fields that could be inferred with >90% confidence

### 2.5 Terminology is Filled with ERP Jargon

Users currently see:
- "Entity Configuration" — not "Ledger Details"
- "Functional Currency" — not "Currency"
- "Reporting Framework" — meaningless for anomaly detection
- "Data Ingestion Workspace" — sounds like a data engineering tool, not an audit cockpit

### 2.6 Perceived Intelligence is Zero Until Step 6

The only "smart" behavior the user sees before analysis is:
- A basic file drop zone
- Column select dropdowns
- Static form fields

There is no AI preview, no smart defaults from file content, no auto-detection of date ranges or currencies, no "we found 12,847 rows, estimating 3 rules will fire." The tool feels like a form with a spreadsheet uploader, not an AI assistant.

### 2.7 Empty States are Poorly Designed

The "No Data Ingested" state in `RiskIntelligenceDashboard.tsx` says: "Upload your financial ledger dataset to begin the risk intelligence analysis." This is **jargon-stacked** and does not explain the immediate value. A better empty state would show a one-click open file dialog with a large, obvious drag target that feels inviting.

---

## 3. Critical Backend Problems

### 3.1 Stateless `/api/scrutiny/analyze` is Hidden Behind Auth-required Workbooks

The best feature — the **immediate, stateless, no-login-required analysis** (`/api/scrutiny/analyze`) — is buried behind a workbook creation flow that requires:
- Login
- Client creation
- Workbook creation
- Entity config
- Then file upload

This is a massive product mistake. The fastest path to value (stateless analysis) should be the **default path**, with persistence as an opt-in.

### 3.2 Entity Config is Enforced Before Ingestion

In `workbooks.py` (`ingest_workbook_file`):

```python
if not workbook.get("entity_config"):
    raise HTTPException(
        status_code=400,
        detail="Entity configuration is required before ingestion.",
    )
```

This creates a hard dependency on metadata entry before data processing. The backend logic should:
1. Accept the file
2. Auto-detect metadata (date range, currency, row count)
3. Run analysis
4. Optionally attach to a workbook later

The current model treats the file as an afterthought to the engagement, not the primary value.

### 3.3 File is Parsed Entirely in Memory, Multiple Times

In `scrutiny_service.py`:

```python
df = ingest(tmp_path)
raw_df = _read_uploaded_dataframe(tmp_path)
# ...multiple copies created
review_rows = review_df.to_dict(orient="records")
flagged_rows = flagged_df.to_dict(orient="records")
```

For a 100K row file:
- `ingest()` reads once (pandas df)
- `run_all_rules()` copies the df
- `_read_uploaded_dataframe()` reads the same file AGAIN
- `_build_export_dataframe()` creates another copy
- `.to_dict(orient="records")` serializes **all rows** to dict

**Memory footprint for 100K rows:** 4-5x the file size in pandas DataFrames, plus dict serialization of every row. This will OOM on modest RAM (512MB-1GB) for large files.

### 3.4 No Chunking or Streaming

Both backend and frontend handle files atomically:
- `save_upload` saves entire file to `/tmp`
- `ingest` reads entire file into memory
- `run_all_rules` processes entire DataFrame in one pass
- `export` writes entire output file

For 100K+ rows, this will timeout on most serverless tiers (30s max) and nginx (30-60s timeout).

### 3.5 Transactions Stored as Embedded Documents Without Pagination

In `workbook_service.py`:

```python
flagged_docs = [{"workbook_id": doc["_id"], "type": "flagged", "data": r} for r in flagged_rows]
_get_db().transactions.insert_many(flagged_docs)
```

Flagged rows are stored as individual MongoDB documents with full embedded row data. For 100K rows with 5% flagged -> **5,000 documents inserted in a single batch**. MongoDB has practical write batch limits.

Additionally, `query_transactions_for_user`:

```python
cursor = _get_db().transactions.find(query)
all_rows = [c.get("data", {}) for c in cursor]  # Loads ALL rows into memory
```

**It fetches ALL rows from MongoDB, then filters in Python.** This does not scale. A large engagement with 200K rows will crash with `MemoryError`.

### 3.6 No Async Job Queue

The ingestion in `workbooks.py` runs synchronously:

```python
tmp_path = await save_upload(file)
_, result = run_analysis(tmp_path, use_ml, contamination)
save_analysis_for_user(...)
```

For a 21K row file, the PRD targets <10s. But for 100K+ rows with ML training (IsolationForest), this could block:
- The HTTP connection times out before ML completes
- The user sees a frozen browser
- A retry causes double-processing

**There is no job queue (Celery, RQ, SQS), no status endpoint, no progress feedback.**

### 3.7 Inconsistent State Management

`DataIngestionWorkspace.tsx` uses React state for entity fields and csvData. `WorkbookContext` stores csvData in **localStorage**:

```tsx
useState<WorkbookData | null>(() => {
  const stored = localStorage.getItem('workbookData');
  return stored ? JSON.parse(stored) : null;
});
```

This means:
- A large 50MB CSV could be stored in localStorage (browser dependent, typically 5-10MB limit)
- JSON parsing fails for localStorage overflow
- The context stores actual CSV row data, not metadata, creating sync issues

### 3.8 Workbook <-> Client Model is Muddled

You have:
1. `CreateWorkbook` with `client_name`
2. A separate `clients.py` with `client_name`, `industry`, etc.
3. But no connection between `client_id` in the workbook schema and the clients table

A workbook has a `client_name` string but **no FK to the clients table**. Two workbooks for the same client are disconnected entities. This makes:
- Historical analysis cross-workbook impossible
- Client master data changes do not propagate
- Duplicate client entries inevitable

---

## 4. Architectural Risks

### 4.1 Monolithic Analysis in HTTP Request

The `run_analysis` function in `scrutiny_service.py` does everything synchronously:
1. File I/O
2. Pandas parsing (blocking)
3. Rule engine (CPU-bound)
4. ML training (CPU-intensive)
5. DB writes

There is no separation into:
- Ingestion worker (file -> structured data)
- Rule worker (structured data -> anomalies)
- ML worker (anomaly features -> IsolationForest)
- Report worker (anomalies -> Excel/JSON)

This means:
- A 500-row file processes fast (no problem)
- A 500K row file crashes the server or timeouts
- No horizontal scaling possible (everything in one process)
- No partial failure recovery (if ML fails, all work is lost)

### 4.2 No Versioning of Analysis Results

The `latest_summary` and `latest_category_counts` in MongoDB get overwritten with every analysis run. There is:
- No audit trail of what was flagged or why
- No way to diff between runs
- No "analysis session" concept

For an auditor, this is critical: "The system flagged this in March but cleared it in April" is impossible to answer.

### 4.3 Risk Score is Naive

In `workbook_service.py`:

```python
risk_score = int(round((total_flagged / total_entries) * 100))
```

**This is mathematically and professionally wrong.** A ledger with 100K entries and 500 flagged (0.5% flagged) gets a risk score of 1. One with 100 entries and 10 flagged (10%) gets 10. In audit reality, the 100K-entry ledger has FAR more risk surface. The risk score should be:
- Weighted by materiality
- Normalized for ledger size
- Categorized by anomaly severity (duplicate INR 1,00,000 > duplicate INR 100)
- Time-weighted (recent anomalies vs. historical)

### 4.4 ML Feature Engineering Has No Domain Knowledge

The PRD lists 13 features for IsolationForest (amount, day_of_week, is_round, etc.) but:
- No accounting-specific features (e.g., "entries just after cutoff date", "user who posted most manual JVs")
- No Benford's Law as a feature (critical for financial anomalies)
- No account group outlier detection

---

## 5. Workflow Mismatches With Real Audits

### 5.1 Auditors Do Not Create "Workbooks" First

The mental model of the current product:

```
Create Workbook -> Configure Entity -> Upload -> Map -> Analyze
```

**Real auditor workflow:**

```
Get GL/GST/TDS data -> Open in SAP/Tally/Excel -> Sort by amount/narration -> Eyeball anomalies
```

The tool imposes a heavy organizational step that does not align with how audit data is consumed. Firms maintain client folders in physical files and digital folders. A "workbook" per engagement is an artificial construct that forces cognitive overhead.

### 5.2 Column Mapping is Not Client-Specific

Tally export formats are client-specific but stable per client. The current system:
1. Has each workbook (engagement) remember column mappings
2. But schema changes are handled per-file per-engagement

A client who uses Tally always exports the same format. The system should:
- Learn mappings per-client, not per-workbook
- Suggest "Last time you mapped 'Vch_Date' -> 'Date', apply same?"

### 5.3 No Support for Re-analysis or Delta Analysis

Auditors re-run analysis frequently:
- "Re-run without the R1 round-number rule"
- "Show me what changed from last month"
- "What if I change the contamination to 0.01?"

The current flow treats analysis as a **one-way, irreversible gate**. The `isReplaceMode` does not address iterative refinement.

### 5.4 The "Data Health Summary" is Distracting

After upload, `DataIngestionWorkspace.tsx` shows:
- "Total Transactions"
- "Total Debit / Credit"
- "Missing Narrations"
- "Duplicate Journal IDs"

These are **structural concerns, not audit concerns**. An auditor does not care if 15 narrations are missing out of 50,000. They care if 15 high-value manual JVs have no narration. The "health" step is a false sense of security that creates a checkpoint before the actual analysis.

---

## 6. MVP Simplifications

### 6.1 Default to the Stateless Path

The **fastest** path should be:

```
Home Page -> Drop File -> Analysis Results (30s)
```

No login required for first analysis. No workbook. No entity config.

### 6.2 Defer: Workbook Creation

Current flow forces everything into a "workbook" abstraction. For MVP:
- Allow anonymous/guest analysis
- Offer "Save to Workbook" as a post-analysis step
- Workbook only needs: name, financial year (both defaultable from file metadata)

### 6.3 Defer: Entity Configuration

These fields should be **entirely auto-detected** or **post-hoc fillable**:
- `entityName` -> from filename or cell content
- `financialYear` -> from min/max dates in file
- `functionalCurrency` -> default INR with override
- `ledgerType` -> detected from column presence (date + debit + credit + narration = general ledger)
- `reportingCurrency` -> not needed for MVP
- `companyCode` -> not needed for MVP

### 6.4 Defer: Manual Column Mapping

Use backend `preview_schema_mapping` for auto-mapping with >85% confidence. Only show mapping UI for unmatched columns. For MVP, allow 1-click "accept defaults" and "upload and fix later."

### 6.5 Defer: Advanced Settings

- Sensitivity slider -> not needed for MVP
- AI toggle -> always on, deep in settings
- ML contamination -> set to 0.05, rarely needs changing

---

## 7. Recommended New Flow

### 7.1 Option A: Guest-to-Engagement Model (Recommended)

```
+---------------------------------------------------------+
|  1. LANDING: Drop ledger file here                       |
|     [Drop zone takes 80% of first view]                  |
|     "Upload your Tally/Excel export, get risk analysis"  |
|                                                          |
|  2. (IMMEDIATE) Backend auto-maps columns,               |
|      runs rules, returns anomalies in <10s (background)  |
|     -> Show: "Found 23 suspicious transactions in 8K rows" |
|                                                          |
|  3. Show results in dashboard (SonarQube style)           |
|     - Risk score at top                                  |
|     - Rules grid (what fired)                            |
|     - Transaction list with filtering                    |
|                                                          |
|  4. BOTTOM CTA: "Save as Engagement" (optional)            |
|     -> Only then ask: Client Name, FY, Date              |
|     -> Save to MongoDB for audit trail and re-analysis   |
+---------------------------------------------------------+
```

### 7.2 Option B: Preserved Engagement Model (for returning clients)

```
+---------------------------------------------------------+
|  HOME SCREEN:                                            |
|  +--------------+  +--------------+  +--------------+  |
|  | Client A     |  | Client B     |  | New Drop     |  |
|  | FY 2024-25   |  | FY 2023-24   |  | (Quick Start)|  |
|  +--------------+  +--------------+  +--------------+  |
|                                                          |
|  [Work from recent engagements OR analyze new file now]  |
+---------------------------------------------------------+
```

### 7.3 Data Flow Architecture (Recommended)

**Frontend:**
```
FileDrop -> POST /api/scrutiny/guest-analyze (no auth)
  -> ServerSideEvent/Socket progress (0-100%)
  -> Show results dashboard
  -> User clicks "Save Audit" -> POST /api/workbooks/{id}/attach-session
```

**Backend:**
```
POST /api/scrutiny/guest-analyze
  -> Queue job (Celery/RQ)
  -> Return job_id
  -> Worker: ingest -> rules -> ml -> save to Redis/session
  -> Status endpoint: GET /api/scrutiny/jobs/{job_id}/status
  -> Result endpoint: GET /api/scrutiny/jobs/{job_id}/result
```

---

## 8. Backend Refactor Recommendations

### 8.1 Immediate (Critical)

**1. Remove entity config dependency in ingestion**

```python
# DELETE from workbooks.py:
if not workbook.get("entity_config"):
    raise HTTPException(...)
```

**2. Create a stateless, auth-optional analysis endpoint**

```python
@router.post("/guest-analyze")
async def guest_analyze(file: UploadFile = File(...)):
    # Returns a session_id, does not require login
```

**3. Add async job execution**

```python
# Use Celery with Redis:
@celery_app.task
def run_analysis_job(tmp_path: str, session_id: str):
    result = run_pipeline(tmp_path)
    cache.set(f"session:{session_id}", result, ttl=3600)
```

**4. Fix transaction pagination**

```python
# Use MongoDB aggregation with $skip/$limit server-side
db.transactions.aggregate([
    {"$match": {"workbook_id": workbook_id}},
    {"$skip": skip},
    {"$limit": limit},
    {"$project": {"data": 1}}
])
```

### 8.2 Short-term (High Impact)

**5. Implement file streaming / chunked processing**

```python
# Process 10K rows at a time
chunk_iterator = pd.read_csv(path, chunksize=10000)
```

**6. Auto-map columns server-side**

```python
# Return from POST /api/scrutiny/schema-preview
{
  "auto_mapped": {"date": "Vch_Date", "amount": "Net_Amt"},
  "confidence": {"date": 1.0, "amount": 0.92},
  "unmapped": ["Custom_Field_1"],
  "ready_to_analyze": True
}
```

**7. Add analysis versioning**

```python
# Each run creates a new session document
db.analysis_sessions.insert_one({
  "workbook_id": id,
  "timestamp": datetime.now(),
  "ruleset_version": "3.0",
  "results": summary,
  "diff_from_previous": None
})
```

**8. Implement real explainability**
- For each flagged row: link to the specific rule function
- Show the threshold values (e.g., "INR 50,000 threshold for 194C rule")
- Generate a "defensible" JSON report that lists: row_id, rule_id, condition_met, threshold, severity

### 8.3 Long-term (Strategic)

**9. Decouple rules into a plugin architecture**

**10. Add trial balance ingestion as a separate pipeline**

**11. Implement incremental delta analysis (only changed rows)**

**12. Add user-defined custom rules**

---

## 9. Quick Wins (1 Week)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1 | **Remove entity config as a requirement** for file upload | High | 2h |
| 2 | **Default column mappings in frontend** from `preview_schema_mapping` output | High | 4h |
| 3 | **Move ingestion + analysis into a single API call** | High | 4h |
| 4 | **Remove the fake "Ingest Data" button** (make it real or remove it) | Medium | 1h |
| 5 | **Auto-fill FY from file dates** in CreateWorkbook | Medium | 2h |
| 6 | **Add a guest/anonymous analysis endpoint** | High | 4h |
| 7 | **Fix transaction pagination to use DB cursors** | High | 4h |
| 8 | **Rename "Data Ingestion Workspace" to "Analyze Ledger"** | Med | 1h |
| 9 | **Cache schema preview results per file hash** | Med | 3h |
| 10 | **Add job status endpoint + polling in frontend** | High | 6h |

---

## 10. Long-Term Scalable Architecture

### Target State: Event-Driven Pipeline

```
+---------+    +----------+    +---------+    +----------+    +---------+
|  File   | -> |  Upload  | -> |  Ingest | -> |  Rules  | -> |   ML    |
|  Drop   |    | Handler  |    | Worker  |    |  Worker |    | Worker  |
+---------+    +----------+    +-----+---+    +----+-----+    +---+-----+
                                     |             |             |
                                     v             v             v
                              +----------+    +----------+    +----------+
                              | Parquet  |    | Results  |    | Results  |
                              | Store    |    |  Cache   |    |  Queue   |
                              +----------+    +----------+    +----------+
```

### Key Architectural Decisions

**Storage:**
- Raw uploaded files: S3/R2 (not local disk)
- Processed row data: Parquet (not MongoDB embedded documents)
- Results + metadata: MongoDB (lightweight)

**Processing:**
- Small files (<100K rows): synchronous HTTP
- Large files (>100K rows): Celery/Redis Queue with progress
- ML: separate microservice or GPU-accelerated batch jobs

**API Design:**
- `POST /api/analyze` returns `job_id` (always async)
- `GET /api/analyze/{job_id}/status` for progress
- `GET /api/analyze/{job_id}/result` for complete payload
- `GET /api/analyze/{job_id}/preview` for quick preview (first 100 rows)

**Frontend:**
- Virtualized tables (react-window) for 100K+ rows
- Server-side pagination/cursor for transaction lists
- WebSocket or SSE for real-time progress on large jobs
- Client-side state only for UI interaction, never for data

---

## 11. Final Word

Your current product is a **well-intentioned, engineering-heavy groundwork** that respects "proper architecture" but **fails the core user**: the audit professional who needs suspicious transactions in seconds, not a correctly configured workspace in minutes. The database schema is clean but the user workflow is filthy.

The architecture needs a fundamental correction: **file-first, analysis-centric, persistence-optional**. Everything else is decoration.

Pick the 1-week quick wins. Ship them. Then build the async pipeline. The market for slow audit tools is zero.
