# S2: Case Investigation Workflow Enhancements

Read CLAUDE.md first.

## Goal
Investigators currently open cases and change status, but have no structured workflow for referral. This adds:
1. An evidence checklist (10 standard items, required subset must be complete before referral unlocks)
2. A submit-for-review → approve/return loop (investigator → senior investigator)

Real SBA OIG guidance: a significant number of referrals were rejected as "unactionable due to insufficient data." This checklist prevents that.

## What to Build

### 1. Backend — DB Models

**New table: case_checklist_items** (add to backend/db/models.py)
```python
class CaseChecklistItem(Base):
    __tablename__ = "case_checklist_items"
    id: UUID (default uuid4)
    case_id: UUID  # FK → cases.id, ondelete CASCADE
    item_key: str  # e.g. "IDENTITY_VERIFIED"
    label: str     # human-readable
    required: bool
    status: str    # "PENDING" | "COMPLETE" | "NA"
    completed_by: str | None
    completed_at: datetime | None
    notes: str | None
    created_at: datetime (default now)
```

**Add to Case model:**
```python
reviewer: str | None = None
review_status: str = "NONE"  # "NONE" | "UNDER_REVIEW" | "APPROVED" | "RETURNED"
review_notes: str | None = None
sar_filed: bool = False
checklist_items: list[CaseChecklistItem] (relationship)
```

**Standard 10 checklist items** (seed on case creation):
```python
STANDARD_CHECKLIST = [
  ("IDENTITY_VERIFIED",  "Identity verified (borrower / EIN / SSN cross-checked)",   True),
  ("ENTITY_CONFIRMED",   "Business entity confirmed (state registration reviewed)",   True),
  ("BANK_CONFIRMED",     "Bank account confirmed (routing + account # tied to record)", True),
  ("PAYROLL_REVIEWED",   "Payroll records reviewed",                                  True),
  ("EXPOSURE_CONFIRMED", "Exposure estimate confirmed",                               True),
  ("GRAPH_COMPLETE",     "Graph analysis completed (ring connections documented)",    True),
  ("RING_MEMBERS_ID",    "Ring members identified (all connected entities listed)",   True),
  ("AGENT_RUN",          "Investigation agent run (AI findings logged)",              False),
  ("PRECEDENT_MATCHED",  "Legal precedent matched (comparable prosecution cited)",    False),
  ("SAR_DRAFTED",        "SAR drafted (Suspicious Activity Report)",                  False),
]
```

### 2. Backend — API Endpoints

Add to backend/api/cases.py:
- `GET /api/cases/{case_id}/checklist` → list checklist items
- `PATCH /api/cases/{case_id}/checklist/{item_key}` → update item status (body: `{status, notes, completed_by}`)
- `POST /api/cases/{case_id}/submit-review` → set case review_status = "UNDER_REVIEW", assign reviewer
- `POST /api/cases/{case_id}/approve` → set review_status = "APPROVED", status = "REFERRED_TO_DOJ"
- `POST /api/cases/{case_id}/return` → set review_status = "RETURNED", body: `{notes}`

All mutations → add AuditEntry (already exists on Case model).

### 3. Frontend — Evidence Checklist Panel

In `frontend/src/components/ring-detail.tsx` (or extracted to `frontend/src/components/case-checklist.tsx`):

**Panel layout (below case timeline, collapsible):**
```
Evidence Checklist                    7 / 10 complete
─────────────────────────────────────────────────────
☑  Identity verified                 ✓ alice @ 09:14
☑  Business entity confirmed         ✓ alice @ 09:22
☐  Bank account confirmed            [Mark Complete]
☐  Payroll records reviewed          [Mark Complete]
...
─────────────────────────────────────────────────────
Progress: 5/7 required items complete
[Submit for Review]   ← disabled until all 7 required done
```

**"Submit for Review" button:**
- Disabled until all `required=True` items are COMPLETE
- On click: calls POST /api/cases/{id}/submit-review
- Shows "Under Review" state with reviewer name after submit

**After submit — Reviewer panel:**
```
Review Request                         Submitted 09:45
─────────────────────────────────────────────────────
Reviewer: investigator_alice (Senior)
Checklist: 7/7 required ✓  Agent run: ✓
Exposure: $735,600  |  Members: 5  |  Risk: 91

[Approve & Refer]   [Return to Investigator]
```
Return requires a notes field.

### 4. Acceptance Criteria

1. Case creation auto-seeds 10 checklist items (status=PENDING)
2. Investigator can mark items COMPLETE or N/A via PATCH endpoint
3. "Submit for Review" button is disabled until all 7 required items complete
4. Submitting sets review_status = "UNDER_REVIEW" and adds AuditEntry
5. Approving sets review_status = "APPROVED" + case status = "REFERRED_TO_DOJ" + AuditEntry
6. Returning sets review_status = "RETURNED" + review_notes visible + AuditEntry
7. Checklist panel renders in Ring Detail (below case timeline), shows progress counter
8. `npm run build` exits 0, no TypeScript errors
9. No regressions: Ring Queue, Ring Detail graph, investigation agent, analytics unchanged

## Scope Boundaries

**In scope:**
- Case checklist (10 items, required subset gates submit)
- Submit-for-review → approve/return loop
- AuditEntry on all mutations

**Out of scope:**
- Real FinCEN SAR filing (track sar_filed bool only)
- Role-based access control (any user can review for demo)
- Email/notification on review actions (future)
- S3 alert triage (separate story)

## Done Condition
Write to progress.md: `FORGE_DONE: S2 Case Investigation Workflow — evidence checklist + submit-for-review loop live`
Then: `git add -A && git commit -m "feat: S2 case investigation workflow — evidence checklist + review loop" && git push origin main`
