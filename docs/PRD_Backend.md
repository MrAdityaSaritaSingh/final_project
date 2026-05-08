# Product Requirements Document — Ledger Scrutiny Backend

**Version:** 3.0
**Date:** May 4, 2026
**Status:** Draft
**Author:** Updated from Excel VBA tool audit + codebase audit

---

## Changelog

| Version | Date | Summary |
|---|---|---|
| 2.0 | May 4, 2026 | Initial PRD from codebase audit |
| 3.0 | May 4, 2026 | Full rule parity with Excel VBA tool (31 Ledger + 24 Voucher rules); gap analysis updated; architecture updated |

---

## 1. Product Overview

### 1.1 Purpose

The Ledger Scrutiny Backend is a FastAPI-based REST API that ingests General Ledger (GL) data from CSV/Excel files, applies rule-based and ML-based anomaly detection, and provides audit workbook management for chartered accountants and auditors.

### 1.2 Target Users

- **Statutory Auditors** performing substantive analytical procedures on GL data
- **Internal Audit Teams** monitoring for fraud indicators and control weaknesses
- **Audit Managers** overseeing multiple client engagements via workbooks

### 1.3 Business Context

Indian audit firms process thousands of GL entries per client engagement. Manual scrutiny is error-prone and time-consuming. This system automates detection of common audit red flags across two dimensions:

1. **Trial Balance (Ledger-level)** — 31 structural, balance anomaly, and TDS threshold rules evaluated against aggregated ledger data.
2. **Daybook (Transaction-level)** — 24 row-level rules covering general fraud indicators, Benford's Law, suspicious narrations, and TDS applicability per transaction.

The existing backend implements 6 of these 55 rules. This PRD defines the full target state.

---

## 2. System Architecture

### 2.1 Tech Stack

| Component | Technology | Version |
|---|---|---|
| Framework | FastAPI | ≥0.110.0 |
| Runtime | Python + Uvicorn | 3.11+ |
| Database | MongoDB Atlas | via PyMongo 4.10 |
| Auth | JWT (HS256) via python-jose | — |
| ML | scikit-learn IsolationForest | 1.4.2 |
| Data Processing | pandas / numpy | 2.1.4 / 1.26.4 |
| Export | openpyxl | 3.1.2 |

### 2.2 Module Map (Target State)

```
backend/
├── main.py                          # FastAPI app, CORS, router mounts
├── pipeline.py                      # CLI pipeline (standalone usage)
├── migrate_data.py                  # One-off DB seed script
├── routers/
│   ├── auth.py                      # /api/auth/*       (4 endpoints)
│   ├── scrutiny.py                  # /api/scrutiny/*   (3 endpoints)
│   ├── workbooks.py                 # /api/workbooks/*  (6 endpoints) ← +1 query endpoint
│   └── clients.py                   # /api/clients/*    (5 endpoints)
├── schemas/
│   ├── auth.py                      # Pydantic models: Signup, Login, UserOut
│   ├── client.py                    # Pydantic models: ClientRecord, ClientOut
│   ├── workbook.py                  # Pydantic models: WorkbookCreate, EntityConfig, WorkbookOut
│   └── trial_balance.py             # NEW: TrialBalanceRow, LedgerSummary
├── services/
│   ├── auth_service.py              # User CRUD, JWT, bcrypt hashing
│   ├── client_service.py            # Client CRUD (MongoDB)
│   ├── scrutiny_service.py          # Analysis orchestration (daybook)
│   ├── workbook_service.py          # Workbook CRUD, analysis persistence, transaction query
│   └── trial_balance_service.py     # NEW: Trial balance ingestion + ledger rule orchestration
├── scrutiny/
│   ├── ingestor.py                  # File parsing, schema detection, column mapping
│   ├── engine.py                    # Daybook rule orchestrator (V1–V24)
│   ├── tb_engine.py                 # NEW: Trial balance rule orchestrator (L1–L31)
│   ├── exporter.py                  # Excel export with formatting
│   └── ml/
│       ├── feature_engineering.py   # 13 numeric features for IsolationForest
│       └── model.py                 # Train / predict / save / load pipeline
├── rules_engine/
│   ├── daybook/                     # Transaction-level rules
│   │   ├── v1_sunday_entries.py     # V1: Sunday postings (non-bank)
│   │   ├── v2_suspicious_particulars.py  # V2: Suspense/CSR/penalty ledgers
│   │   ├── v3_suspicious_names.py   # V3: Suspicious ledger name keywords
│   │   ├── v4_benford_payments.py   # V4: Bank payments starting with '9'
│   │   ├── v5_benford_receipts.py   # V5: Bank receipts starting with '9'
│   │   ├── v6_cash_payments.py      # V6: Cash payment vouchers
│   │   ├── v7_cash_receipts.py      # V7: Cash receipt vouchers
│   │   ├── v8_journal_scrutiny.py   # V8: JV used for cash/bank/creditor entries
│   │   ├── v9_benford_purchases.py  # V9: Purchase entries starting with '9'
│   │   ├── v10_benford_sales.py     # V10: Sales entries starting with '9'
│   │   ├── v11_tds_192.py           # V11: Sec 192 employee benefits
│   │   ├── v12_tds_194.py           # V12: Sec 194 dividend
│   │   ├── v13_tds_194a_banks.py    # V13: Sec 194A interest income
│   │   ├── v14_tds_194a_others.py   # V14: Sec 194A interest paid
│   │   ├── v15_tds_194c_expense.py  # V15: Sec 194C contract expense
│   │   ├── v16_tds_194c_revenue.py  # V16: Sec 194C customer contracts
│   │   ├── v17_tds_194ib_expense.py # V17: Sec 194I(b) rent expense
│   │   ├── v18_tds_194ib_liab.py    # V18: Sec 194I(b) due for rent
│   │   ├── v19_tds_194jb_expense.py # V19: Sec 194J(b) professional services
│   │   ├── v20_tds_194jb_liab.py    # V20: Sec 194J(b) professional provisions
│   │   ├── v21_tds_194ja_expense.py # V21: Sec 194J(a) technical services
│   │   ├── v22_tds_194ja_liab.py    # V22: Sec 194J(a) technical provisions
│   │   ├── v23_weak_narration.py    # V23: Weak narration keywords
│   │   └── v24_missing_narration.py # V24: Blank narrations
│   └── trial_balance/               # NEW: Ledger-level rules
│       ├── l1_liability_debit.py    # L1: Liability with debit closing balance
│       ├── l2_asset_credit.py       # L2: Asset with credit closing balance
│       ├── l3_liability_no_payment.py  # L3: Liability with no payments
│       ├── l4_no_transactions.py    # L4: Ledger with no transactions
│       ├── l5_opening_credit_closing_debit.py
│       ├── l6_opening_debit_closing_credit.py
│       ├── l7_squared_off.py        # L7: Opening == Closing despite activity
│       ├── l8_revenue_debit.py      # L8: Revenue ledger with debit balance
│       ├── l9_expense_credit.py     # L9: Expense ledger with credit balance
│       ├── l10_inter_unit.py        # L10: Inter-unit unclosed balances
│       ├── l11_tds_192.py           # L11–L30: TDS threshold rules
│       ├── ...
│       ├── l30_tds_194h.py
│       └── l31_disallowed_expenses.py
```

### 2.3 Router Prefix Map

| Router | Prefix | Auth Required | Endpoints |
|---|---|---|---|
| `scrutiny` | `/api/scrutiny` | No | 3 |
| `auth` | `/api/auth` | Partial | 4 |
| `workbooks` | `/api/workbooks` | Yes (Bearer) | 6 |
| `clients` | `/api/clients` | Yes (Bearer) | 5 |

**Total: 18 endpoints**

---

## 3. Functional Requirements

### 3.1 Authentication Module (`/api/auth`)

| ID | Endpoint | Method | Auth | Description |
|---|---|---|---|---|
| AUTH-1 | `/api/auth/signup` | POST | No | Create user account, return JWT |
| AUTH-2 | `/api/auth/login` | POST | No | Authenticate, return JWT |
| AUTH-3 | `/api/auth/login` | GET | No | Informational help text |
| AUTH-4 | `/api/auth/me` | GET | Bearer | Return current user profile |

**Data Model — User:**

| Field | Type | Constraints |
|---|---|---|
| `name` | string | 2–100 chars |
| `email` | string | 5–320 chars, unique, normalised lowercase |
| `password_hash` | string | bcrypt, min 8 chars plaintext |
| `created_at` | datetime | UTC |

**JWT Payload:** `{ sub: email, uid: ObjectId, iat, exp }` — Default expiry: 720 minutes (12 hours).

---

### 3.2 Scrutiny Module (`/api/scrutiny`)

> This is the core stateless analysis engine. Upload a file, get results. No database persistence.

| ID | Endpoint | Method | Auth | Description |
|---|---|---|---|---|
| SCR-1 | `/api/scrutiny/schema-preview` | POST | No | Upload file → get column mapping preview |
| SCR-2 | `/api/scrutiny/analyze` | POST | No | Upload file → run rules + ML → return flagged rows |
| SCR-3 | `/api/scrutiny/export` | POST | No | Upload file → run analysis → return .xlsx download |

#### SCR-1: Schema Preview

**Input:** `multipart/form-data` with `file` (CSV/XLSX)

**Processing:**
1. Read file headers
2. Normalise column names (lowercase, strip symbols)
3. Match against canonical schema using alias tables + fuzzy matching (Levenshtein)
4. Compute health metrics (date range, debit/credit totals, missing narrations, duplicate journal IDs)

**Output:**
```json
{
  "original_columns": [...],
  "normalised_columns": [...],
  "mappings": [
    { "canonical": "date", "source_column": "date", "status": "mapped", "confidence": 1.0, "strategy": "exact" },
    { "canonical": "amount", "source_column": "total", "status": "mapped", "confidence": 1.0, "strategy": "exact" }
  ],
  "missing_required": [],
  "rows_detected": 21889,
  "columns_detected": 11,
  "sample_rows": [...],
  "health_summary": {
    "total_transactions": 21889,
    "total_debit": 0.0,
    "total_credit": 0.0,
    "date_from": "2024-04-01",
    "date_to": "2025-03-31",
    "missing_narrations": 15,
    "duplicate_journal_ids": 0,
    "manual_entries": 0
  }
}
```

#### SCR-2: Analyze

**Input:** `multipart/form-data`

| Field | Type | Required | Default |
|---|---|---|---|
| `file` | UploadFile | Yes | — |
| `use_ml` | bool | No | `true` |
| `contamination` | float | No | `0.05` |

**Processing Pipeline:**
1. **Ingest** → parse file, map columns, validate schema, parse dates & amounts
2. **Rule Engine** → apply V1–V24 (vectorised pandas operations)
3. **ML Engine** (if `use_ml=true`) → extract 13 features, fit IsolationForest, predict
4. **Merge** → combine rule + ML flags into unified scrutiny columns
5. **Build response** → summary stats, category counts, flagged rows, review rows

**Output:**
```json
{
  "summary": {
    "total_entries": 21889,
    "rule_flagged": 21889,
    "ml_flagged": 0,
    "total_flagged": 21889,
    "pct_flagged": 100.0
  },
  "category_counts": [
    { "category": "Weak Narration", "count": 21889 },
    { "category": "Period End", "count": 8562 }
  ],
  "flagged_rows": [...],
  "review_rows": [...]
}
```

#### SCR-3: Export

**Input:** Same as SCR-2 plus `approved: bool` (default `false`)

**Behaviour:**
- If `approved=false` → return `400` with message "Audit review is pending."
- If `approved=true` → run analysis, generate two-sheet Excel workbook:
  - **Sheet 1: Suspicious_Transactions** — flagged rows with `Anomaly_Type` and `Reason`
  - **Sheet 2: Summary** — category counts

**Response:** Binary `.xlsx` with `Content-Disposition: attachment`.

---

### 3.3 Daybook (Transaction-Level) Rule Engine — V1–V24

These 24 rules operate row-by-row on daybook/transaction data. They correspond to the Voucher Scrutiny rules from the Excel VBA tool.

**Output per row:** `scrutiny_flag` (bool), `scrutiny_category` (comma-separated rule names), `scrutiny_reason` (semicolon-separated human-readable reasons)

#### 3.3.1 General Audit Red Flags (V1–V10, V23–V24)

| Rule ID | Rule Name | Logic | Audit Purpose |
|---|---|---|---|
| **V1** | Sunday Entries | `day_of_week == 6` AND `voucher_type NOT IN (BANK PAYMENT, BANK RECEIPT)` AND `subgroup != INTER UNIT` | Why are manual entries passed on Sundays without banking activity? |
| **V2** | Suspicious Particulars | `ledger_name IN (SUSPENSE, CSR EXPENSE, Interest on Income Tax, Interest on TDS, Penalty, Fine, LATE FEE)` | Flag entries likely requiring disallowance or regulatory attention. |
| **V3** | Suspicious Ledger Names | `ledger_name` contains any of: `suspense, miscellaneous, adjustment, correction, dummy, test, write-off, gift, donation, entertainment, confidential, ceo account` | Why do transactions post to ledgers with inherently vague or high-risk names? |
| **V4** | Benford — Bank Payments | `voucher_type == BANK PAYMENT` AND `leading_digit(amount) == 9` AND `amount > 1,00,000` | Payments structured just below approval thresholds (Benford's Law anomaly). |
| **V5** | Benford — Bank Receipts | `voucher_type == BANK RECEIPT` AND `leading_digit(amount) == 9` AND `amount > 1,00,000` | Receipts structured to avoid reporting limits. |
| **V6** | Cash Payments | `voucher_type == CASH PAYMENT` | Why were cash payments made? (Duplicate particulars highlighted automatically.) |
| **V7** | Cash Receipts | `voucher_type == CASH RECEIPT` | Why were cash receipts accepted? |
| **V8** | Journal on Sensitive Ledgers | `voucher_type == JOURNAL` AND `subgroup IN (BORROWINGS, CASH & BANK, CREDITORS FOR GOODS, INVESTMENTS, LOANS & ADVANCES GIVEN)` | Why is a Journal Voucher used for entries that should flow through payment/receipt vouchers? |
| **V9** | Benford — Purchases | `voucher_type == PURCHASES` AND `leading_digit(amount) == 9` AND `amount > 1,00,000` | Purchase amounts clustering just below control thresholds. |
| **V10** | Benford — Sales | `voucher_type == SALES` AND `leading_digit(amount) == 9` AND `amount > 1,00,000` | Sales amounts clustering just below reporting or discount thresholds. |
| **V23** | Weak Narration | `narration` contains any of: `adjustment, correction, miscellaneous, unknown, n/a, as discussed, per instructions, do not disclose, confidential, manual entry, split, being, adj, trf, jv, ok, entry, per discussion, misc` | Poor documentation does not meet audit evidence standards. |
| **V24** | Missing Narration | `strip(narration) == ""` | Why are entries passed without any narration? |

> **Implementation note on V1 vs existing R2:** The existing R2 rule flags all Sunday postings. V1 is more precise — it excludes bank payment/receipt vouchers (which can legitimately process on Sundays via automated clearing) and inter-unit entries. V1 should replace R2.

> **Implementation note on V23 vs existing R4:** V23 uses an expanded keyword list. The old R4 keyword list (`being, adj, as discussed, adjustment, misc, trf, jv, ok, entry, per discussion`) should be merged with V23's list. V23 should supersede R4.

#### 3.3.2 TDS — Transaction-Level Rules (V11–V22)

These rules verify per-transaction TDS deduction applicability. They require the input file to carry a `tds_section` column (or equivalent mapping) and a `subgroup` column indicating the accounting classification.

| Rule ID | TDS Section | Category | Condition |
|---|---|---|---|
| **V11** | Sec 192 | Employee Benefits | `tds_section == 192` AND `subgroup IN (DIRECT EXPENSE, INDIRECT EXPENSE)` |
| **V12** | Sec 194 | Dividend | `tds_section == 194` AND `subgroup == RESERVES & SURPLUS` AND `amount > 5,000` |
| **V13** | Sec 194A (Banks) | Interest Income | `tds_section == 194A BANKS` AND `subgroup == INTEREST INCOME` AND `amount > 40,000` |
| **V14** | Sec 194A (Others) | Interest Paid | `tds_section == 194A OTHERS` AND `subgroup == FINANCE COST` AND `amount > 5,000` |
| **V15** | Sec 194C | Contract Expense | `tds_section == 194C` AND `subgroup IN (EXPENSE)` AND `amount > 30,000` |
| **V16** | Sec 194C | Customer Contracts | `tds_section == 194C` AND `subgroup IN (RECEIVABLES, REVENUE)` AND `amount > 30,000` |
| **V17** | Sec 194I(b) | Rent Expense | `tds_section == 194I(b)` AND `subgroup IN (EXPENSE)` AND `amount > 20,000` |
| **V18** | Sec 194I(b) | Due for Rent | `tds_section == 194I(b)` AND `subgroup == OTHER LIABILITIES` AND `amount > 20,000` |
| **V19** | Sec 194J(b) | Professional Services | `tds_section == 194J(b)` AND `subgroup IN (EXPENSE)` AND `amount > 30,000` |
| **V20** | Sec 194J(b) | Professional Provisions | `tds_section == 194J(b)` AND `subgroup == OTHER LIABILITIES` AND `amount > 30,000` |
| **V21** | Sec 194J(a) | Technical Services | `tds_section == 194J(a)` AND `subgroup IN (EXPENSE)` AND `amount > 30,000` |
| **V22** | Sec 194J(a) | Technical Provisions | `tds_section == 194J(a)` AND `subgroup == OTHER LIABILITIES` AND `amount > 30,000` |

**Required additional columns for TDS rules:**

| Canonical Field | Required For | Aliases (sample) |
|---|---|---|
| `tds_section` | V11–V22 | `tds`, `tds_code`, `section` |
| `subgroup` | V8, V11–V22 | `sub_group`, `account_subgroup`, `classification` |
| `voucher_type` | V1, V4–V10 | `vou_type`, `vch_type`, `transaction_type` |

These must be added to the ingestor's canonical schema and alias table.

---

### 3.4 Trial Balance (Ledger-Level) Rule Engine — L1–L31

> **This is a new capability.** The current backend has no trial balance ingestion or ledger-level analysis. It requires a separate input schema, ingestor, and rule engine.

Trial balance rules evaluate **aggregated ledger rows** (one row per ledger), not individual transactions. They are applicable when the client uploads a Trial Balance / Chart of Accounts extract alongside or instead of the daybook.

**Excluded subgroups (auto-skipped to avoid false positives):**
`Reserves & Surplus, Share Capital, Investments, Deposits, Deferred Tax, Depreciation, IND AS, DUTIES & TAXES, Inventories`

**Output per ledger row:** `rule_flag` (bool), `rule_ids` (list of triggered rule IDs), `rule_reasons` (list of human-readable reasons)

#### 3.4.1 Trial Balance Schema

| Canonical Field | Required | Description |
|---|---|---|
| `ledger_name` | Yes | Name of the ledger |
| `group` | Yes | Account group (e.g. NON CURRENT LIABILITIES) |
| `subgroup` | Yes | Account subgroup (e.g. BORROWINGS) |
| `component` | No | `BS` (Balance Sheet) or `PL` (Profit & Loss) |
| `opening_debit` | No | Opening debit balance |
| `opening_credit` | No | Opening credit balance |
| `current_debit` | Yes | Debit movement during the period |
| `current_credit` | Yes | Credit movement during the period |
| `closing_debit` | Yes | Closing debit balance |
| `closing_credit` | Yes | Closing credit balance |
| `tds_section` | No | Applicable TDS section code for TDS rules (L11–L31) |

#### 3.4.2 Structural & Balance Anomaly Rules (L1–L10)

| Rule ID | Rule Name | Condition | Audit Purpose |
|---|---|---|---|
| **L1** | Liability Ledger with Debit Closing Balance | `group IN (NON CURRENT LIABILITIES, CURRENT LIABILITIES)` AND `subgroup NOT IN (INTER UNIT, PPE)` AND `closing_debit > 1` | Why do liability ledgers carry a debit balance? Are these advances? When will they be recognised? |
| **L2** | Asset Ledger with Credit Closing Balance | `group IN (NON CURRENT ASSETS, CURRENT ASSETS)` AND `subgroup NOT IN (INTER UNIT, PPE)` AND `closing_credit > 1` | Why do asset ledgers carry a credit balance? Could these be unrecognised income? |
| **L3** | Liability Ledger with No Payments | `group IN (LIABILITIES)` AND `subgroup NOT IN (INTER UNIT, PPE)` AND `current_debit == 0` | Why were no payments made against this liability? If March payables, when will they be settled? |
| **L4** | Ledger with No Transactions | `current_debit + current_credit == 0` AND (ledger not already captured by L3) | Why does this ledger carry a balance with zero current-period activity? |
| **L5** | Opening Credit → Closing Debit | `opening_credit > 0` AND `closing_debit > 0` | What caused a major shift from a credit opening to a debit closing balance? |
| **L6** | Opening Debit → Closing Credit | `opening_debit > 0` AND `closing_credit > 0` | What caused a major shift from a debit opening to a credit closing balance? |
| **L7** | Squared-Off Ledger | `current_debit + current_credit > 1` AND `opening_debit == closing_debit` AND `opening_credit == closing_credit` | Why are opening and closing balances identical despite active transactions during the period? |
| **L8** | Revenue Ledger with Debit Balance | `component == PL` AND `group == REVENUE` AND `closing_debit > 1` | Why does a revenue ledger close with a debit balance? |
| **L9** | Expense Ledger with Credit Balance | `component == PL` AND `group == EXPENSE` AND `closing_credit > 1` | Why does an expense ledger close with a credit balance? |
| **L10** | Inter-Unit Unclosed Balances | `group IN (LIABILITIES)` AND `subgroup == INTER UNIT` AND `(closing_credit > 1 OR closing_debit > 1)` | Why do inter-unit ledgers carry unclosed balances at year-end? |

#### 3.4.3 TDS — Trial Balance Threshold Rules (L11–L31)

These rules flag ledgers that exceed statutory TDS deduction thresholds, indicating TDS may be applicable but may not have been deducted.

| Rule ID | TDS Section | Category | Threshold Condition |
|---|---|---|---|
| **L11** | Sec 192 | Employee Benefits | `tds_section == 192` AND `group == EXPENSE` |
| **L12** | Sec 194 | Dividend Declared | `tds_section == 194` AND `group == RESERVES & SURPLUS` AND `closing_credit > 5,000` |
| **L13** | Sec 194A (Banks) | Interest Income | `tds_section == 194A BANKS` AND `group == REVENUE` AND `closing_credit > 40,000` |
| **L14** | Sec 194A (Others) | Interest Paid | `tds_section == 194A OTHERS` AND `group == EXPENSE` AND `current_debit > 5,000` |
| **L15** | Sec 194C | Contract Expenses | `tds_section == 194C` AND `group == EXPENSE` AND `current_debit > 1,00,000` |
| **L16** | Sec 194C | Customer Contracts | `tds_section == 194C` AND `group == TRADE RECEIVABLES` AND `current_debit > 1,00,000` |
| **L17** | Sec 194Q | Sale of Goods | `tds_section == 194Q` AND `group == TRADE RECEIVABLES` AND `current_debit > 50,00,000` |
| **L18** | Sec 194I(b) | Rent Expense | `tds_section == 194I(b)` AND `group == EXPENSE` AND `closing_debit > 2,40,000` |
| **L19** | Sec 194I(b) | Due for Rent | `tds_section == 194I(b)` AND `group == OTHER LIABILITIES` AND `current_credit > 2,40,000` |
| **L20** | Sec 194IA | Loans for Property | `tds_section == 194IA` AND `group == LOANS & ADVANCES` AND `current_debit > 50,00,000` |
| **L21** | Sec 194IA | PPE Immovable Property | `tds_section == 194IA` AND `subgroup == PPE` AND `current_debit > 50,00,000` |
| **L22** | Sec 194J(b) | Professional Services | `tds_section == 194J(b)` AND `group == EXPENSE` AND `closing_debit > 30,000` |
| **L23** | Sec 194J(a) | Technical Services | `tds_section == 194J(a)` AND `group == EXPENSE` AND `closing_debit > 30,000` |
| **L24** | Sec 194J(b) | Professional Provisions | `tds_section == 194J(b)` AND `group == OTHER LIABILITIES` AND `current_credit > 30,000` |
| **L25** | Sec 194J(a) | Technical Provisions | `tds_section == 194J(a)` AND `group == OTHER LIABILITIES` AND `current_credit > 30,000` |
| **L26** | Sec 194N | Cash Withdrawal | `tds_section == 194N` AND `group == CASH & BANK` AND `current_debit > 1,00,00,000` |
| **L27** | Sec 194Q | Purchase of Goods | `tds_section == 194Q` AND `group == CREDITORS` AND `current_credit > 50,00,000` |
| **L28** | Sec 194Q | Capital Purchases | `tds_section == 194Q` AND `subgroup == PPE` AND `current_debit > 50,00,000` |
| **L29** | Sec 194Q | Purchase of Gold | `tds_section == 194Q` AND `group == CASH & BANK` AND `current_debit > 50,00,000` |
| **L30** | Sec 194H | Commission | `tds_section == 194H` AND `group == EXPENSE` AND `current_debit > 15,000` |
| **L31** | Disallowed Expenses | Disallowed Expenses | `subgroup == DISALLOWED EXPENSES` AND `current_debit > 1` |

---

### 3.5 ML Anomaly Detection (Daybook Only)

**Algorithm:** Isolation Forest (scikit-learn)
**Parameters:** `n_estimators=200`, `contamination=0.05` (configurable), `random_state=42`

**Feature Vector (13 features):**

| # | Feature | Description |
|---|---|---|
| 1 | `amount` | Raw transaction amount |
| 2 | `log_amount` | `log1p(abs(amount))` — reduces skew |
| 3 | `is_round_1000` | 1 if amount divisible by 1000 |
| 4 | `is_round_10000` | 1 if amount divisible by 10000 |
| 5 | `day_of_week` | 0=Mon … 6=Sun |
| 6 | `day_of_month` | 1–31 |
| 7 | `is_weekend` | 1 if Sat/Sun |
| 8 | `is_period_end` | 1 if day ≥ 26 |
| 9 | `month` | 1–12 |
| 10 | `narration_len` | Character count |
| 11 | `is_manual_journal` | 1 if JV/Journal |
| 12 | `account_freq` | Normalised ledger frequency |
| 13 | `amount_zscore` | Z-score within ledger group |

**Pipeline:** `StandardScaler → IsolationForest`
**Output:** `ml_anomaly_flag` (-1=anomaly, 1=normal), `ml_anomaly_score` (continuous)

> ML anomaly detection is not applicable to trial balance analysis (ledger-level data has too few rows for IsolationForest to be meaningful).

---

### 3.6 Ingestor — Column Mapping

The ingestor uses a 3-tier matching strategy to map uploaded columns to canonical fields.

| Priority | Strategy | Score | Example |
|---|---|---|---|
| 1 | Exact match | 1.0 | `date` → `date` |
| 2 | Prefix/partial | 0.90–0.94 | `vou_type` → `voucher_type` |
| 3 | Fuzzy (Levenshtein) | 0.75+ | `naration` → `narration` |

**Daybook Canonical Schema:**

| Canonical Field | Required | Aliases (sample) |
|---|---|---|
| `date` | Yes | `voucher_date`, `vch_date`, `transaction_date`, `posting_date` |
| `ledger_name` | Yes | `particulars`, `account`, `party_name`, `ledger` |
| `amount` | Yes | `amt`, `value`, `total`, `net_amount`, `gross_amount` |
| `narration` | No | `remarks`, `description`, `notes` |
| `voucher_type` | No | `vch_type`, `voucher`, `transaction_type`, `type` |
| `subgroup` | No | `sub_group`, `account_subgroup`, `classification` |
| `tds_section` | No | `tds`, `tds_code`, `section` |

**Trial Balance Canonical Schema:**

| Canonical Field | Required | Aliases (sample) |
|---|---|---|
| `ledger_name` | Yes | `account`, `ledger`, `particulars` |
| `group` | Yes | `account_group`, `major_group` |
| `subgroup` | Yes | `sub_group`, `account_subgroup`, `minor_group` |
| `component` | No | `bs_pl`, `financial_statement`, `type` |
| `opening_debit` | No | `op_dr`, `ob_debit`, `opening_dr` |
| `opening_credit` | No | `op_cr`, `ob_credit`, `opening_cr` |
| `current_debit` | Yes | `debit`, `dr`, `period_debit`, `movement_dr` |
| `current_credit` | Yes | `credit`, `cr`, `period_credit`, `movement_cr` |
| `closing_debit` | Yes | `cl_dr`, `closing_dr`, `balance_dr` |
| `closing_credit` | Yes | `cl_cr`, `closing_cr`, `balance_cr` |
| `tds_section` | No | `tds`, `tds_code`, `section` |

**Debit/Credit Derivation:** If no `amount` column is found in daybook files, the ingestor derives `amount = credit - debit`.

**Supported Date Formats:** `DD/MM/YYYY`, `YYYY-MM-DD`, `MM/DD/YYYY`, `DD-MM-YYYY`, `YYYY/MM/DD`, `DD Mon YYYY`

**Amount Parsing:** Handles commas (`1,45,000`), currency symbols (`₹`, `Rs`, `INR`), Dr/Cr suffixes, accounting negatives `(1000)`.

---

### 3.7 Workbooks Module (`/api/workbooks`)

Workbooks provide persistent, user-scoped audit engagements. They store entity configuration, analysis results, and flagged transactions in MongoDB.

| ID | Endpoint | Method | Auth | Description |
|---|---|---|---|---|
| WB-1 | `/api/workbooks` | GET | Bearer | List user's workbooks |
| WB-2 | `/api/workbooks` | POST | Bearer | Create new workbook |
| WB-3 | `/api/workbooks/{id}` | GET | Bearer | Get workbook details |
| WB-4 | `/api/workbooks/{id}/entity-config` | PUT | Bearer | Save entity configuration |
| WB-5 | `/api/workbooks/{id}/ingest` | POST | Bearer | Upload file, run analysis, persist results |
| WB-6 | `/api/workbooks/{id}/query` | POST | Bearer | Filter/query persisted transactions |

**Data Model — Workbook:**

| Field | Type | Description |
|---|---|---|
| `owner_user_id` | string | FK to user |
| `client_name` | string | 2–200 chars |
| `financial_year` | string | e.g. "FY 2024-25" |
| `functional_currency` | string | e.g. "INR" |
| `engagement_type` | string? | e.g. "Full Audit", "Review" |
| `status` | enum | `Draft` → `In Progress` → `Completed` |
| `risk_score` | int | 0–100, derived from flagged % |
| `entity_config` | object? | Entity name, ledger type, currencies |
| `column_mappings` | dict? | Manual column override map |
| `latest_summary` | object? | Last analysis summary |
| `latest_category_counts` | list? | Last category breakdown |
| `flagged_rows` | list? | All flagged transaction rows |
| `review_rows` | list? | Rows with anomaly annotations |
| `tb_flagged_rows` | list? | NEW: Flagged trial balance ledger rows |
| `tb_summary` | object? | NEW: Trial balance analysis summary |

**Workbook Lifecycle:**
1. **Create** (status=Draft, risk_score=0)
2. **Configure Entity** (status→In Progress)
3. **Ingest & Analyze** — daybook and/or trial balance (risk_score calculated, results persisted)
4. **Status** → Completed if total_flagged=0, else stays In Progress

---

### 3.8 Clients Module (`/api/clients`)

| ID | Endpoint | Method | Auth | Description |
|---|---|---|---|---|
| CL-1 | `/api/clients` | GET | Bearer | List user's clients |
| CL-2 | `/api/clients` | POST | Bearer | Create client record |
| CL-3 | `/api/clients/{id}` | GET | Bearer | Get client details |
| CL-4 | `/api/clients/{id}` | PUT | Bearer | Update client record |
| CL-5 | `/api/clients/{id}` | DELETE | Bearer | Delete client record |

**Data Model — Client:**

| Field | Type | Constraints |
|---|---|---|
| `client_name` | string | 2–200 chars |
| `industry` | string | 0–100 chars |
| `contact_person` | string | 0–100 chars |
| `email` | string | 0–320 chars |
| `last_audit_date` | string | 0–50 chars |
| `notes` | string | 0–2000 chars |

---

## 4. Rule Coverage Summary

### 4.1 Daybook Rules — Implementation Status

| Rule ID | Rule Name | Current Status |
|---|---|---|
| V1 | Sunday Entries | ⚠️ Partial — existing R2 covers Sunday but does not exclude bank vouchers or inter-unit |
| V2 | Suspicious Particulars | ❌ Not implemented |
| V3 | Suspicious Ledger Names | ❌ Not implemented |
| V4 | Benford — Bank Payments | ❌ Not implemented |
| V5 | Benford — Bank Receipts | ❌ Not implemented |
| V6 | Cash Payments | ❌ Not implemented |
| V7 | Cash Receipts | ❌ Not implemented |
| V8 | Journal on Sensitive Ledgers | ⚠️ Partial — existing R6 flags all JV/Journal types; does not check subgroup |
| V9 | Benford — Purchases | ❌ Not implemented |
| V10 | Benford — Sales | ❌ Not implemented |
| V11–V22 | TDS Transaction Rules (12 rules) | ❌ Not implemented |
| V23 | Weak Narration | ⚠️ Partial — existing R4 uses a narrower keyword list; should be expanded |
| V24 | Missing Narration | ⚠️ Partial — existing R4 checks length < 10; does not handle blank-only narrations separately |

**Daybook coverage: 4 of 24 rules (partial). 20 rules are missing or incomplete.**

### 4.2 Trial Balance Rules — Implementation Status

| Rule Group | Rules | Current Status |
|---|---|---|
| Structural anomalies | L1–L10 | ❌ Not implemented — no TB ingestor exists |
| TDS threshold rules | L11–L31 | ❌ Not implemented |

**Trial balance coverage: 0 of 31 rules. Entire TB pipeline is missing.**

### 4.3 Legacy Rules — Mapping

The following rules from the current v2 backend map to the new rule IDs:

| Old Rule | New Rule ID | Notes |
|---|---|---|
| R1 (Round Amounts) | — | Not present in Excel tool; retain as supplementary ML feature (feature #3/4). Consider keeping as V-series rule. |
| R2 (Weekend) | V1 | Refine to exclude bank vouchers and inter-unit |
| R3 (Period End) | — | Not present in Excel tool; retain as ML feature (#8). Consider keeping as supplementary rule. |
| R4 (Weak Narration) | V23 + V24 | Merge keyword lists; split blank check into V24 |
| R5 (Duplicate) | — | Not present in Excel tool; retain — it addresses PCAOB AS 2315 |
| R6 (Manual Journal) | V8 | Refine to add subgroup filter |

> R1, R3, and R5 should be retained as supplementary rules (they are valid audit procedures) even though they are not in the Excel VBA tool. They should be labelled clearly as supplementary in the category output.

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target |
|---|---|
| Schema preview — daybook (21K rows) | < 2s |
| Full daybook analysis with ML (21K rows) | < 10s |
| Excel export (21K rows) | < 15s |
| Trial balance analysis (up to 5K ledger rows) | < 3s |
| API cold start | < 3s |

### 5.2 Security

- JWT-based auth with bcrypt password hashing
- User-scoped data isolation (workbooks/clients filtered by `owner_user_id`)
- Temp files cleaned in `finally` blocks after processing
- CORS wildcard enabled (suitable for dev; restrict in production via `ALLOWED_ORIGINS`)

### 5.3 Data Isolation

All workbook and client queries are filtered by `owner_user_id`. A user cannot access another user's data even with valid ObjectIds.

---

## 6. Environment Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | Yes | — | MongoDB Atlas connection string |
| `MONGO_DB_NAME` | No | `auditdb` | Database name |
| `JWT_SECRET_KEY` | Yes | `change-this-in-production` | HMAC signing key |
| `JWT_EXPIRE_MINUTES` | No | `720` | Token lifetime |
| `ALLOWED_ORIGINS` | No | `*` | CORS origins (comma-separated) |

---

## 7. Error Handling Convention

All errors follow FastAPI's `HTTPException` pattern:

```json
{ "detail": "Human-readable error message" }
```

| Code | Usage |
|---|---|
| `400` | Bad input, schema validation failure, pipeline runtime error |
| `401` | Missing/invalid/expired JWT |
| `404` | Resource not found (workbook, client) |
| `422` | Pydantic validation failure (auto-generated by FastAPI) |
| `500` | Unhandled server error |
| `503` | Database unreachable / MONGO_URI not configured |

---

## 8. Gap Analysis — Current vs Target State

### 8.1 Rule Engine Gaps

| Gap | Priority | Effort |
|---|---|---|
| V1: Refine Sunday rule — exclude bank vouchers & inter-unit | P1 | Low |
| V2: Suspicious particulars rule | P1 | Low |
| V3: Suspicious ledger name keyword scan | P1 | Low |
| V4–V5: Benford's Law — bank payments/receipts | P1 | Low |
| V6–V7: Cash payment/receipt flagging | P1 | Low |
| V8: Refine Journal rule — add subgroup filter | P1 | Low |
| V9–V10: Benford's Law — purchases/sales | P1 | Low |
| V23: Expand weak narration keyword list | P1 | Low |
| V24: Separate blank narration rule | P1 | Low |
| V11–V22: TDS transaction-level rules (12 rules) | P2 | Medium — requires `tds_section` and `subgroup` in schema |
| L1–L10: Trial balance structural rules | P2 | High — requires new ingestor + engine |
| L11–L31: TDS trial balance threshold rules | P2 | High — requires TB pipeline |

### 8.2 Infrastructure Gaps

| Gap | Priority | Effort |
|---|---|---|
| `GET /health` endpoint | P1 | Trivial |
| Trial balance ingestor (`tb_ingestor.py`) | P2 | Medium |
| Trial balance rule engine (`tb_engine.py`) | P2 | Medium |
| `POST /api/scrutiny/analyze-tb` — stateless TB analysis endpoint | P2 | Low once engine exists |
| `POST /api/workbooks/{id}/ingest-tb` — persist TB results | P2 | Low once engine exists |
| `POST /api/workbooks/{id}/query` — transaction query endpoint | P2 | Low — service already exists |
| Multi-sheet Excel ingestion (`combine_sheets`) | P2 | Medium |
| Risk scoring v2 — weighted control scoring | P2 | Medium |
| Audit trail export endpoint | P2 | Medium |
| Control weights CRUD system | P3 | High |
| Plugin/dynamic rule loading | P3 | High |
| `X-Session-ID` response header | P3 | Low |
| Configurable per-rule thresholds | P3 | Medium |

---

## 9. Recommended Implementation Plan

### Phase 1 — Quick Wins (3–5 days)

1. **Health endpoint** — `GET /health` returning `{ status, version, timestamp }`
2. **Refine R2 → V1** — add `voucher_type` and `subgroup` exclusion conditions
3. **Refine R4 → V23 + V24** — expand keyword list, split blank check
4. **Refine R6 → V8** — add sensitive subgroup filter
5. **Add V2, V3, V4–V5, V6–V7, V9–V10** — all are simple column-value or string checks, < 10 lines of pandas each
6. **Expose WB-6 query endpoint** — wire existing `query_transactions_for_user` service to router
7. **Harden CORS** — replace wildcard with `ALLOWED_ORIGINS` env var

### Phase 2 — TDS & Schema Extension (1–2 weeks)

8. **Extend ingestor** — add `tds_section` and `subgroup` to daybook canonical schema and alias table
9. **Implement V11–V22** — TDS transaction-level rules using extended schema
10. **Trial balance ingestor** — new `tb_ingestor.py` for TB canonical schema with column mapping
11. **Implement L1–L10** — structural balance anomaly rules on aggregated ledger rows
12. **New stateless endpoint** — `POST /api/scrutiny/analyze-tb`
13. **Multi-sheet ingestion** — `combine_sheets` support for multi-tab Excel files

### Phase 3 — TDS Trial Balance & Scoring (2–3 weeks)

14. **Implement L11–L31** — TDS threshold rules on trial balance
15. **Workbook TB integration** — `POST /api/workbooks/{id}/ingest-tb` with MongoDB persistence
16. **Risk scoring v2** — weighted control scoring replacing simple flagged percentage
17. **Audit trail export** — dedicated `POST /api/scrutiny/export-audit-trail` endpoint

### Phase 4 — Advanced Features (2–4 weeks)

18. **Control weights system** — registry, CRUD profiles, validation
19. **Plugin rules** — dynamic rule loading from user-defined Python scripts
20. **Session tracking** — `X-Session-ID` response headers for audit trail continuity
21. **Configurable thresholds** — per-rule threshold overrides stored per-workbook

---

## 10. API Quick Reference

### Auth
```bash
# Signup
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Auditor","email":"a@b.com","password":"12345678"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"12345678"}'

# Get profile
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Scrutiny — Daybook (stateless)
```bash
# Schema preview
curl -X POST http://localhost:8000/api/scrutiny/schema-preview \
  -F "file=@ledger.csv"

# Analyze with ML (all V1–V24 rules)
curl -X POST http://localhost:8000/api/scrutiny/analyze \
  -F "file=@ledger.csv" -F "use_ml=True" -F "contamination=0.05"

# Export (approved)
curl -X POST http://localhost:8000/api/scrutiny/export \
  -F "file=@ledger.csv" -F "approved=True" --output report.xlsx
```

### Scrutiny — Trial Balance (stateless, Phase 2)
```bash
# Analyze trial balance (L1–L31 rules)
curl -X POST http://localhost:8000/api/scrutiny/analyze-tb \
  -F "file=@trial_balance.xlsx"
```

### Workbooks (authenticated)
```bash
# Create workbook
curl -X POST http://localhost:8000/api/workbooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"client_name":"ACME Ltd","financial_year":"FY 2024-25","functional_currency":"INR"}'

# Ingest daybook
curl -X POST http://localhost:8000/api/workbooks/<id>/ingest \
  -H "Authorization: Bearer <token>" \
  -F "file=@ledger.csv" -F "use_ml=True"

# Query transactions
curl -X POST http://localhost:8000/api/workbooks/<id>/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"rule_ids":["V4","V5"],"min_amount":100000}'
```

### Clients (authenticated)
```bash
# Create client
curl -X POST http://localhost:8000/api/clients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"client_name":"ACME Corp","industry":"Manufacturing","contact_person":"","email":"","last_audit_date":"","notes":""}'
```