# Cases API — investigation case management for fraud analysts.
# POST /api/cases creates a new case from grouped alerts.
# GET /api/cases lists cases with status filtering.
# Cases are the output of the triage workflow — an investigator reviews
# alerts, groups related ones, and opens a formal case with audit trail.

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/cases", tags=["cases"])

# In-memory case store for MVP
_case_store: list[dict] = []


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


@router.post("")
async def create_case(body: CaseCreate) -> dict[str, Any]:
    """Create a new investigation case."""
    case = {
        "case_id": str(uuid.uuid4()),
        "title": body.title,
        "description": body.description,
        "status": "OPEN",
        "priority": body.priority,
        "assigned_to": body.assigned_to,
        "fraud_type": body.fraud_type,
        "alert_ids": body.alert_ids,
        "total_exposure": body.total_exposure,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "audit_trail": [
            {
                "action": "CASE_CREATED",
                "actor": body.assigned_to or "system",
                "timestamp": datetime.now(timezone.utc).isoformat(),
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
            case["updated_at"] = datetime.now(timezone.utc).isoformat()
            case.setdefault("audit_trail", []).append({
                "action": "CASE_UPDATED",
                "actor": body.assigned_to or "system",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "details": f"Updated: {body.model_dump(exclude_none=True)}",
            })
            return {"case": case}
    return {"error": "Case not found", "case_id": case_id}
