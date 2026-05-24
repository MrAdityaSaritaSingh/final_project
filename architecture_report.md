# Ledger Scrutiny Architecture Report

## 1. Executive Summary
Ledger Scrutiny is a modern, full-stack web application designed for General Ledger audit and analysis. The system is built to ingest financial datasets, map inconsistent schema columns, apply a multi-layered anomaly detection process (rule-based + machine learning), and provide an interactive workspace for auditors to review and document findings.

Overall, the architecture follows best practices with a clear separation of concerns between the client interface (React/Vite) and the server backend (FastAPI/MongoDB). The system is highly modular, well-organized, and relies on robust modern frameworks.

## 2. High-Level Architecture

The architecture consists of three main tiers:
- **Presentation Layer (Frontend):** A Single Page Application (SPA) built with React, Vite, and Tailwind CSS.
- **Application Layer (Backend):** A RESTful API built with FastAPI (Python) that handles business logic, security, and the core scrutiny engine.
- **Data Layer (Database):** A MongoDB database for persistent storage of users, clients, workbooks (audit engagements), and processed transactions.

## 3. Component Analysis

### 3.1. Frontend Architecture
- **Framework & Build:** React 18 with Vite provides a fast development server and optimized production builds. TypeScript is used for type safety.
- **State Management:** Context API (`AuthContext`, `WorkbookContext`, `EvidenceContext`) is used for global state management, which is appropriate given the relatively isolated nature of the domains.
- **Routing:** React Router v7 handles client-side navigation. The application uses a protected route wrapper to secure authenticated pages (`Home`, `Workbook`, `Dashboard`, etc.).
- **API Communication:** A custom, centralized `apiClient.ts` wrapper built on top of the native `fetch` API. It handles token injection, basic error parsing, and JWT expiration detection.
- **Styling & UI:** Tailwind CSS is used extensively for utility-first styling. The project also incorporates Radix UI primitives for accessible, customizable components (e.g., Dialogs, Selects, Tooltips) and Framer Motion for animations.
- **Strengths:**
  - Clean component hierarchy.
  - Good use of modern React features (hooks, context).
  - Use of accessible UI primitives.
- **Areas for Improvement:**
  - The custom `fetch` wrapper handles basic token expiration but could benefit from a more robust interceptor pattern (like Axios) for automatic token refresh if refresh tokens are implemented.
  - The error handling in UI components often catches `any` (e.g., `catch (error: any)`), which defeats some benefits of TypeScript.

### 3.2. Backend Architecture
- **Framework:** FastAPI is a strong choice. It provides automatic OpenAPI documentation, data validation via Pydantic, and high performance.
- **Routing & Controllers:** Routes are logically grouped under `backend/routers/` (`auth.py`, `clients.py`, `workbooks.py`, `scrutiny.py`). Each router delegates complex logic to the service layer.
- **Service Layer:** `backend/services/` (`auth_service.py`, `client_service.py`, `workbook_service.py`, `scrutiny_service.py`) encapsulates business logic and database interactions. This prevents "fat controllers" and makes the logic reusable and testable.
- **Scrutiny Engine:** Located in `backend/scrutiny/`. This is the core intellectual property of the app.
  - **Ingestor (`ingestor.py`):** Handles file uploads (CSV/Excel), robust column mapping (handling synonyms and missing headers), and data cleaning.
  - **Rules Engine (`engine.py`, `rules/`):** Applies deterministic checks (R1-R6) for known fraud indicators (e.g., round amounts, weekend entries, manual journals). Uses Pandas for vectorized, high-performance execution.
  - **Machine Learning (`ml/model.py`):** Utilizes `scikit-learn`'s `IsolationForest` to detect statistical outliers (anomalies) that rule-based checks might miss.
- **Natural Language Query Parsing:** `backend/services/query_parser.py` implements a clever deterministic parser using regex to translate user NLP queries (e.g., "show entries above 5 lakh in Q1") into MongoDB filters.
- **Strengths:**
  - Excellent separation of concerns (Routers -> Services -> Engine).
  - Use of Pandas for fast, vectorized data processing during ingestion and rule checking.
  - Good test coverage for the rules engine (`backend/tests/test_rules.py`).
- **Areas for Improvement:**
  - The NLP query parser is currently heavily regex-based. While deterministic and fast, it may prove fragile as users try more complex or ambiguous phrasing.
  - MongoDB connection management in services (e.g., `_get_db()`) uses global variables. While acceptable for typical FastAPI deployments, using FastAPI's dependency injection system for database sessions is generally preferred for testing and lifecycle management.

### 3.3. Data Architecture (MongoDB)
- **Collections:** The database uses distinct collections for `users`, `clients`, `workbooks`, and `transactions`.
- **Transactions Model:** The `transactions` collection stores individual ledger entries linked to a `workbook_id`. This allows for efficient querying and pagination of large ledgers without loading the entire file into memory.
- **Aggregations:** The backend leverages MongoDB's aggregation pipeline (`aggregate_workbook_kpis`) to efficiently compute risk buckets and exposure metrics directly on the database server.
- **Strengths:** MongoDB's flexible schema is well-suited for storing varied transaction data that might have different columns depending on the client.
- **Areas for Improvement:** The application lacks explicit database migrations or schema versioning. While MongoDB is schemaless, the application code expects certain structures. A tool like Alembic (for SQL) or a NoSQL equivalent might be needed as the app evolves.

## 4. Security Considerations
- **Authentication:** Standard JWT-based authentication using `python-jose` and `passlib[bcrypt]` for password hashing.
- **Authorization:** Endpoint security is enforced via FastAPI dependencies (e.g., `Depends(_current_user_id)`). Ownership checks are performed at the service level (e.g., querying `{"_id": oid, "owner_user_id": user_id}`).
- **CORS:** Handled via FastAPI's `CORSMiddleware` with configurable allowed origins.

## 5. Summary and Recommendations
Ledger Scrutiny is a well-architected, mature prototype or early-stage enterprise application. The choice of technologies (React, FastAPI, Pandas, MongoDB) is excellent for a data-intensive audit application.

**Key Recommendations for Next Steps:**
1. **Refactor DB Connection:** Move MongoDB connection management to FastAPI Dependency Injection (`Yield` dependencies) to improve testability and ensure clean connection lifecycle management.
2. **Enhance NLP Parser:** Consider integrating an LLM or an embedding-based semantic router alongside the regex parser to handle edge cases in natural language queries gracefully.
3. **Type Safety in Frontend:** Improve error typing in catch blocks across the React application.
4. **Testing:** Expand backend tests beyond the rules engine to cover the REST endpoints and service logic. Add frontend testing (using the configured Vitest) for critical UI components.
