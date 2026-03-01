# ITERATION_DONE: UI-05-RingActions

## Commits:
- Backend: c6c8826 (main) — /Users/mikeclaw/Projects/fraudgraph
- Frontend: ef3605c (sprint-frontend) — /Users/mikeclaw/Projects/fraudgraph-frontend
## Date: 2026-03-01 ~02:55 AM EST

---

## Backend: backend/api/ring_actions.py ✅

### 5 Endpoints
- POST /api/rings/{ring_id}/actions/review → NEW → UNDER_REVIEW
- POST /api/rings/{ring_id}/actions/open-case → UNDER_REVIEW → CASE_OPENED
- POST /api/rings/{ring_id}/actions/dismiss → any pre-terminal → DISMISSED (requires reason)
- POST /api/rings/{ring_id}/actions/refer → CASE_OPENED → REFERRED
- POST /api/rings/{ring_id}/actions/assign → sets assignee_id (any non-terminal)

### Guards
- Terminal state check: 409 if REFERRED/CLOSED/DISMISSED
- Dismiss: 400 if reason missing/empty
- State transition validation (e.g., can't review a CASE_OPENED ring)

### Audit
- Every action writes to in-memory audit log: ring_id, action, user, timestamp, payload

### Registration
- Router registered in main.py under api_prefix
- py_compile passes

---

## Frontend: Ring Queue Row Actions ✅

### Hover Actions
- 150ms opacity transition on row hover
- Contextual per status:
  - NEW/DETECTED: [REVIEW] [DISMISS]
  - UNDER_REVIEW: [OPEN CASE] [ASSIGN] [DISMISS]
  - CASE_OPENED: [REFER TO DOJ] [ASSIGN] [DISMISS]
  - Terminal: read-only badge, no buttons

### Button Spec (exact match)
- Height: 24px (h-6)
- Background: #1A1D27
- Border-radius: 0px (global * rule)
- Text: uppercase, 10px, font-semibold, tracking-wider

### Optimistic UI
- Status badge flips immediately on click
- API fires in background
- On error: reverts to prior state + inline red error toast (4s auto-clear)

### Input Flows
- Dismiss: inline text input replaces action buttons, Enter or OK to confirm
- Assign: inline investigator_id input, same pattern
- Escape to cancel

### Type Updates
- RingStatus expanded: NEW | DETECTED | UNDER_REVIEW | CASE_OPENED | REFERRED | CLOSED | DISMISSED
- STATUS_CONFIG expanded for all 7 states
- ring-data.ts status literal updated

## Build: ✅ npm run build passes (Next.js 16.1.6, 0 errors)
