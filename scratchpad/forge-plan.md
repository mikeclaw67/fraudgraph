# Forge Plan: Backend Seeding — 5 Demo Fraud Rings

## What Exists
- DB models: LoanRecord, AlertRecord, Case, AuditEntry (no FraudRing)
- API uses in-memory stores (MVP pattern), not direct PG queries
- 6 detection rules, scoring engine, alert generator all working
- data/seed.py seeds raw loan records (from JSON) into PG
- Frontend expects /api/rings: id, name, type, status, riskScore, totalExposure, entityCount, createdAt

## Plan (6 files)

### 1. backend/db/models.py — Add FraudRing model
- FraudRing table: id, ring_id, name, type, status, risk_score, total_exposure, entity_count, created_at

### 2. backend/api/rings.py — New router
- GET /api/rings — list all rings (in-memory store, consistent with MVP pattern)
- GET /api/rings/{ring_id} — single ring with entities
- set_ring_store() for injection

### 3. backend/main.py — Register rings_router

### 4. data/seed_demo.py — Demo seeder (the core deliverable)
- 5 hardcoded rings with realistic entities and transactions
- Each ring generates LoanRecord dicts that trigger detection rules
- Runs detection pipeline → generates alerts
- Populates all in-memory stores (rings, alerts, entities, graph)
- Can also persist to PostgreSQL via existing seed.py
- Idempotent: clears and re-seeds

### 5. tests/test_seed_demo.py — Tests for seeding
- Ring data structure validation
- Detection rules fire correctly on seeded data
- API endpoint returns expected ring format

### 6. Wire into main.py lifespan — auto-seed on startup

## Risks
- None significant — in-memory MVP pattern is established
