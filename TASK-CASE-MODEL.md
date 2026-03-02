# Case Model Implementation — Ring Detection → Case Investigation → Prosecution

This is a foundational architectural change. Ring stays (immutable detection). Case becomes the investigation object coordinating evidence, actions, and referral.

## What to build

### 1. Backend Schema + Migrations
- `cases` table: case_id, ring_id, created_by, status, investigation_findings JSONB, referral_package JSONB
- `case_actions` table: action_id, case_id, action_type ENUM, actor_id, content JSONB, created_at
- `rings` table: add case_id nullable foreign key
- Migrations in `backend/migrations/`

### 2. API Endpoints
- `POST /api/rings/{ringId}/case` — create case from ring
  - Returns: {case_id, created_at, status: OPEN}
- `GET /api/cases/{caseId}` — fetch case with all fields
- `POST /api/cases/{caseId}/actions` — log action
  - Body: {action_type, content}
  - Validates: case exists, status allows this action type
- `POST /api/cases/{caseId}/status` — update case status
  - Body: {status: OPEN|UNDER_REVIEW|REFERRED|CLOSED}
  - On REFERRED: generate referral_package (graph PNG + findings JSON)
- `GET /api/cases/{caseId}/referral-package` — download ZIP (graph PNG + case findings + checklist)

### 3. State Machine
- OPEN: allow ADD_NOTE, ADD_FLAG, REFER
- UNDER_REVIEW: allow ADD_NOTE, ADD_FLAG, REFER
- REFERRED: allow CLOSE only
- CLOSED: no actions

### 4. Investigation Findings Integration
When investigation agent completes → POST /api/cases/{caseId}/actions with type=INVESTIGATION_COMPLETE, content={findings JSON}
This rolls findings into case.investigation_findings

### 5. Referral Package Generation
When case status → REFERRED:
1. Take case.investigation_findings
2. Export graph as PNG (use existing exportGraph.ts logic)
3. Package: case metadata + findings + graph PNG + evidence checklist
4. Store as referral_package JSON + generate downloadable ZIP

## Files to create
- `backend/models/case.py` — SQLAlchemy Case model + ActionLog model
- `backend/migrations/004_add_cases_tables.py` — schema migration
- `backend/api/cases.py` — case API endpoints
- `backend/lib/case_utils.py` — state machine validation, referral package generation

## Files to update
- `backend/models/ring.py` — add case_id foreign key
- `backend/api/investigate.py` — when investigation completes, POST to /cases/{caseId}/actions
- `frontend/src/app/rings/[id]/page.tsx` — on mount, check if case exists; if not, show "Open Case" button; if yes, fetch case and use case data

## Acceptance Criteria
- [ ] POST /api/rings/ring_001/case → creates case, returns case_id
- [ ] GET /api/cases/{caseId} → returns full case with all fields
- [ ] Case status transitions work (OPEN→UNDER_REVIEW→REFERRED)
- [ ] Action log captures every action with timestamp + actor
- [ ] Investigation completion → automatically POSTs findings to case
- [ ] Case referral package exports as ZIP
- [ ] Frontend Ring Detail shows Case ID, Case Status, Case Timeline (action log)
- [ ] Clicking "Open Case" button creates case and transitions to case view
- [ ] Export button generates DOJ referral package (graph + findings + checklist)
- [ ] API tests pass for all 5 endpoints
- [ ] DB migrations apply cleanly

## Done
- All tests pass
- API endpoints operational
- Frontend wired to case data model
- git commit -m "feat: case model — ring detection + case investigation + action log"
- git push origin main

Write to progress.md: FORGE_DONE: Case model implemented. Rings now create cases. Cases track investigation toward referral.
