# Cases API — investigation case management for fraud analysts.
# POST /api/cases creates a new case from grouped alerts.
# GET /api/cases lists cases with status filtering.
# Cases are the output of the triage workflow — an investigator reviews
# alerts, groups related ones, and opens a formal case with audit trail.
# S2: Evidence checklist + submit-for-review / approve / return loop.

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/cases", tags=["cases"])

# In-memory case store for MVP
_case_store: list[dict] = []

# Standard 10 checklist items — seeded on case creation.
# (item_key, label, required)
STANDARD_CHECKLIST: list[tuple[str, str, bool]] = [
    ("IDENTITY_VERIFIED", "Identity verified (borrower / EIN / SSN cross-checked)", True),
    ("ENTITY_CONFIRMED", "Business entity confirmed (state registration reviewed)", True),
    ("BANK_CONFIRMED", "Bank account confirmed (routing + account # tied to record)", True),
    ("PAYROLL_REVIEWED", "Payroll records reviewed", True),
    ("EXPOSURE_CONFIRMED", "Exposure estimate confirmed", True),
    ("GRAPH_COMPLETE", "Graph analysis completed (ring connections documented)", True),
    ("RING_MEMBERS_ID", "Ring members identified (all connected entities listed)", True),
    ("AGENT_RUN", "Investigation agent run (AI findings logged)", False),
    ("PRECEDENT_MATCHED", "Legal precedent matched (comparable prosecution cited)", False),
    ("SAR_DRAFTED", "SAR drafted (Suspicious Activity Report)", False),
]


def _seed_checklist() -> list[dict]:
    """Return a fresh set of 10 checklist item dicts."""
    return [
        {
            "item_key": key,
            "label": label,
            "required": req,
            "status": "PENDING",
            "completed_by": None,
            "completed_at": None,
            "notes": None,
        }
        for key, label, req in STANDARD_CHECKLIST
    ]


def _audit(case: dict, action: str, actor: str, details: str) -> None:
    """Append an immutable audit entry to a case."""
    case.setdefault("audit_trail", []).append({
        "action": action,
        "actor": actor,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": details,
    })
    case["updated_at"] = datetime.now(timezone.utc).isoformat()


class CaseCreate(BaseModel):
    """Request body for creating a new investigation case."""
    title: str
    description: str | None = None
    priority: str = "MEDIUM"
    assigned_to: str | None = None
    fraud_type: str | None = None
    alert_ids: list[str] = []
    total_exposure: float = 0.0


class CaseUpdate(BaseModel):
    """Request body for updating a case."""
    status: str | None = None
    priority: str | None = None
    assigned_to: str | None = None
    description: str | None = None


class ChecklistUpdate(BaseModel):
    """Request body for updating a single checklist item."""
    status: str  # "COMPLETE" | "NA" | "PENDING"
    notes: str | None = None
    completed_by: str = "system"


class SubmitReview(BaseModel):
    """Request body for submitting a case for review."""
    reviewer: str = "senior_investigator"


class ReturnReview(BaseModel):
    """Request body for returning a case to the investigator."""
    notes: str


# ── CRUD ────────────────────────────────────────────────────────────────────


@router.post("")
async def create_case(body: CaseCreate) -> dict[str, Any]:
    """Create a new investigation case with auto-seeded evidence checklist."""
    now = datetime.now(timezone.utc).isoformat()
    case: dict[str, Any] = {
        "case_id": str(uuid.uuid4()),
        "title": body.title,
        "description": body.description,
        "status": "OPEN",
        "priority": body.priority,
        "assigned_to": body.assigned_to,
        "fraud_type": body.fraud_type,
        "alert_ids": body.alert_ids,
        "total_exposure": body.total_exposure,
        "created_at": now,
        "updated_at": now,
        "reviewer": None,
        "review_status": "NONE",
        "review_notes": None,
        "sar_filed": False,
        "checklist": _seed_checklist(),
        "audit_trail": [
            {
                "action": "CASE_CREATED",
                "actor": body.assigned_to or "system",
                "timestamp": now,
                "details": f"Case created with {len(body.alert_ids)} alerts",
            }
        ],
    }
    _case_store.append(case)
    return {"case": case}


@router.get("")
async def list_cases(
    status: str = Query("", description="Filter by status (OPEN, IN_PROGRESS, CLOSED)"),
    priority: str = Query("", description="Filter by priority"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    """List investigation cases with optional filters."""
    filtered = _case_store

    if status:
        filtered = [c for c in filtered if c.get("status") == status]
    if priority:
        filtered = [c for c in filtered if c.get("priority") == priority]

    total = len(filtered)
    start = (page - 1) * page_size
    page_data = filtered[start:start + page_size]

    return {
        "cases": page_data,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        },
    }


@router.get("/{case_id}")
async def get_case(case_id: str) -> dict:
    """Return a single case by ID."""
    for case in _case_store:
        if case.get("case_id") == case_id:
            return {"case": case}
    return {"error": "Case not found", "case_id": case_id}


@router.patch("/{case_id}")
async def update_case(case_id: str, body: CaseUpdate) -> dict:
    """Update case status, priority, or assignment."""
    for case in _case_store:
        if case.get("case_id") == case_id:
            if body.status:
                case["status"] = body.status
            if body.priority:
                case["priority"] = body.priority
            if body.assigned_to is not None:
                case["assigned_to"] = body.assigned_to
            if body.description is not None:
                case["description"] = body.description
            _audit(case, "CASE_UPDATED", body.assigned_to or "system",
                   f"Updated: {body.model_dump(exclude_none=True)}")
            return {"case": case}
    return {"error": "Case not found", "case_id": case_id}


# ── Checklist endpoints ─────────────────────────────────────────────────────


@router.get("/{case_id}/checklist")
async def get_checklist(case_id: str) -> dict:
    """Return the evidence checklist for a case."""
    for case in _case_store:
        if case.get("case_id") == case_id:
            return {"checklist": case.get("checklist", [])}
    return {"error": "Case not found", "case_id": case_id}


@router.patch("/{case_id}/checklist/{item_key}")
async def update_checklist_item(case_id: str, item_key: str, body: ChecklistUpdate) -> dict:
    """Update a single checklist item status."""
    for case in _case_store:
        if case.get("case_id") == case_id:
            checklist = case.get("checklist", [])
            for item in checklist:
                if item["item_key"] == item_key:
                    item["status"] = body.status
                    item["notes"] = body.notes
                    if body.status == "COMPLETE":
                        item["completed_by"] = body.completed_by
                        item["completed_at"] = datetime.now(timezone.utc).isoformat()
                    elif body.status == "PENDING":
                        item["completed_by"] = None
                        item["completed_at"] = None
                    _audit(case, "CHECKLIST_UPDATED", body.completed_by,
                           f"{item_key} → {body.status}")
                    return {"case": case}
            return {"error": "Checklist item not found", "item_key": item_key}
    return {"error": "Case not found", "case_id": case_id}


# ── Review loop endpoints ───────────────────────────────────────────────────


@router.post("/{case_id}/submit-review")
async def submit_for_review(case_id: str, body: SubmitReview) -> dict:
    """Submit a case for senior investigator review."""
    for case in _case_store:
        if case.get("case_id") == case_id:
            case["review_status"] = "UNDER_REVIEW"
            case["reviewer"] = body.reviewer
            _audit(case, "SUBMITTED_FOR_REVIEW", case.get("assigned_to", "system"),
                   f"Submitted for review by {body.reviewer}")
            return {"case": case}
    return {"error": "Case not found", "case_id": case_id}


@router.post("/{case_id}/approve")
async def approve_case(case_id: str) -> dict:
    """Approve a case and refer to DOJ."""
    for case in _case_store:
        if case.get("case_id") == case_id:
            case["review_status"] = "APPROVED"
            case["status"] = "REFERRED_TO_DOJ"
            _audit(case, "REVIEW_APPROVED", case.get("reviewer", "senior_investigator"),
                   "Case approved and referred to DOJ")
            return {"case": case}
    return {"error": "Case not found", "case_id": case_id}


@router.post("/{case_id}/return")
async def return_case(case_id: str, body: ReturnReview) -> dict:
    """Return a case to the investigator with notes."""
    for case in _case_store:
        if case.get("case_id") == case_id:
            case["review_status"] = "RETURNED"
            case["review_notes"] = body.notes
            _audit(case, "REVIEW_RETURNED", case.get("reviewer", "senior_investigator"),
                   f"Returned: {body.notes}")
            return {"case": case}
    return {"error": "Case not found", "case_id": case_id}
