RALPH_DONE

## FraudGraph Sprint 1+2 — Complete

### What Was Built

**Backend Core (backend/)**
- `main.py` — FastAPI app with CORS, health endpoint, router registrations, lifespan management
- `config/settings.py` — Pydantic BaseSettings with all thresholds, DB URIs, risk weights (12-factor)
- `config/schemas/` — Three fraud schemas (PPP Loans, Medicaid, Procurement) demonstrating the Foundry generalization pattern

**Detection Engine (backend/detection/)**
- `rules.py` — 6 deterministic fraud rules (ADDR_REUSE, EIN_REUSE, STRAW_CO, THRESHOLD_GAME, ACCOUNT_SHARE, NEW_EIN) with cross-reference context builder and batch evaluation
- `scoring.py` — Composite risk scorer: `RiskScore = 0.4×rules + 0.35×ML + 0.25×graph`, with severity aggregation and score capping
- `alerts.py` — Alert generator with triage action recommendation (REVIEW_GRAPH, ESCALATE, etc.)

**Graph Layer (backend/graph/)**
- `neo4j_client.py` — Async Neo4j client with full ontology CRUD (Borrower, Business, LoanApplication, BankAccount, Address, Alert, Case), relationship operations, and Sigma.js-compatible subgraph queries

**Database Layer (backend/db/)**
- `models.py` — SQLAlchemy 2.0 models: LoanRecord, AlertRecord, Case, AuditEntry with proper relationships and UUID primary keys
- `migrations/env.py` — Alembic migration environment

**Queue Layer (backend/queue/)**
- `redis_client.py` — Celery app config with task routing, Redis connection pool, pub/sub helpers, risk score caching

**API Layer (backend/api/)**
- `alerts.py` — GET /api/alerts (paginated, filtered by severity/status, sorted)
- `entities.py` — GET /api/entity/:id (360 profile with attributes, alerts, connections)
- `graph.py` — GET /api/graph (nodes+edges for Sigma.js with type filtering)
- `cases.py` — POST/GET/PATCH /api/cases (case management with audit trail)

**Data Pipeline (data/)**
- `generate.py` — 50K record generator with 5 fraud archetypes (~5% fraud rate): address farms (8×50), EIN recyclers (100×3), straw companies, network clusters (35×10), threshold gamers
- `seed.py` — Async seeder for both Neo4j and PostgreSQL with batched commits

**ML Layer (ml/)**
- `isolation_forest.py` — Isolation Forest anomaly detector with feature extraction, 0-100 scoring, and evaluation metrics
- `community.py` — Louvain community detection via NetworkX, centrality-based graph scoring

**Tests (tests/)**
- `test_rules.py` — 21 tests covering all 6 rules with positive/negative cases, batch evaluation, address farm detection
- `test_scoring.py` — 14 tests covering rule score computation, weight application, clamping, batch scoring, fraud vs clean comparison
- **35/35 tests passing**

**Infrastructure**
- `docker-compose.yml` — PostgreSQL 16, Neo4j 5 (APOC), Redis 7, FastAPI backend with health checks
- `Dockerfile` — Python 3.12 production image
- `requirements.txt` — All dependencies pinned
- `README.md` — Architecture overview, quick start, API docs, configuration guide

### Decisions Made
1. Used in-memory stores for API layer MVP — designed for easy swap to SQLAlchemy/Neo4j queries in Sprint 3
2. `business_age_months` used as proxy for EIN registration date in NEW_EIN rule (exact date not in record schema)
3. Isolation Forest uses 3 numeric features (employee_count, business_age_months, loan_amount) as baseline — expandable in Sprint 5
4. Graph scoring combines 60% degree centrality + 40% community density for the 0-100 graph component
5. Data generator scales fraud counts proportionally when count != 50K (maintains archetype ratios)

### What Sprint 3 (API Layer) Needs to Know
- All 4 API routers are registered under `/api` prefix via `settings.api_prefix`
- In-memory stores (`_alert_store`, `_entity_store`, `_graph_data`, `_case_store`) need migration to async SQLAlchemy sessions
- Neo4j client is fully async — wire `get_subgraph()` and `get_full_graph()` into `api/graph.py`
- WebSocket support needed for real-time alert push (use Redis pub/sub channel `fraudgraph:alerts`)
- Case audit trail is in-memory list — move to `AuditEntry` PostgreSQL model
- CORS is wide open (`*`) — restrict in production
