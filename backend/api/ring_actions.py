# backend/api/ring_actions.py
# Ring action endpoints: review, open-case, dismiss, refer, assign.
# All actions are guarded against terminal states and write to audit log.

from __future__ import annotations

import uuid
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rings", tags=["ring-actions"])

# ── In-memory stores (demo — production uses PostgreSQL) ─────────────────

# Ring status overrides keyed by ring_id
_ring_status: dict[str, dict[str, Any]] = {}

# Audit log rows
_ring_actions_log: list[dict[str, Any]] = []

TERMINAL_STATES = {"REFERRED", "CLOSED", "DISMISSED"}


# ── Request models ───────────────────────────────────────────────────────

class DismissRequest(BaseModel):
    reason: str = Field(..., min_length=1)


class AssignRequest(BaseModel):
    investigator_id: str = Field(..., min_length=1)


# ── Helpers ──────────────────────────────────────────────────────────────

def _get_ring_state(ring_id: str) -> dict[str, Any]:
    """Get current ring state (overrides or defaults)."""
    return _ring_status.get(ring_id, {"status": "NEW", "assignee_id": None, "referral_id": None})


def _set_ring_state(ring_id: str, **updates: Any) -> dict[str, Any]:
    """Merge updates into ring state and return full state."""
    state = _get_ring_state(ring_id)
    state.update(updates)
    _ring_status[ring_id] = state
    return state


def _audit(ring_id: str, action: str, user: str, payload: dict[str, Any] | None = None) -> None:
    """Write one row to the audit log."""
    _ring_actions_log.append({
        "ring_id": ring_id,
        "action": action,
        "user": user,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": payload or {},
    })


def _guard_terminal(ring_id: str) -> None:
    """Reject 409 if ring is in a terminal state."""
    state = _get_ring_state(ring_id)
    if state["status"] in TERMINAL_STATES:
        raise HTTPException(
            status_code=409,
            detail=f"Ring {ring_id} is in terminal state '{state['status']}' — no further actions allowed.",
        )


def _ring_response(ring_id: str) -> dict[str, Any]:
    """Build full ring response object."""
    state = _get_ring_state(ring_id)
    return {
        "ring_id": ring_id,
        "status": state["status"],
        "assignee_id": state.get("assignee_id"),
        "referral_id": state.get("referral_id"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("/{ring_id}/actions/review")
async def review_ring(ring_id: str) -> dict[str, Any]:
    """DETECTED/NEW → UNDER_REVIEW. Assigns to current user."""
    _guard_terminal(ring_id)
    state = _get_ring_state(ring_id)
    if state["status"] not in ("NEW", "DETECTED"):
        raise HTTPException(status_code=409, detail=f"Cannot review ring in state '{state['status']}'")
    _set_ring_state(ring_id, status="UNDER_REVIEW", assignee_id="current_user")
    _audit(ring_id, "review", "current_user")
    return _ring_response(ring_id)


@router.post("/{ring_id}/actions/open-case")
async def open_case(ring_id: str) -> dict[str, Any]:
    """UNDER_REVIEW → CASE_OPENED. Creates Case record."""
    _guard_terminal(ring_id)
    state = _get_ring_state(ring_id)
    if state["status"] != "UNDER_REVIEW":
        raise HTTPException(status_code=409, detail=f"Cannot open case from state '{state['status']}'")
    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    _set_ring_state(ring_id, status="CASE_OPENED", case_id=case_id)
    _audit(ring_id, "open-case", "current_user", {"case_id": case_id})
    return _ring_response(ring_id)


@router.post("/{ring_id}/actions/dismiss")
async def dismiss_ring(ring_id: str, body: DismissRequest) -> dict[str, Any]:
    """Any pre-REFERRED state → DISMISSED. Requires reason."""
    _guard_terminal(ring_id)
    _set_ring_state(ring_id, status="DISMISSED")
    _audit(ring_id, "dismiss", "current_user", {"reason": body.reason})
    return _ring_response(ring_id)


@router.post("/{ring_id}/actions/refer")
async def refer_to_doj(ring_id: str) -> dict[str, Any]:
    """CASE_OPENED → REFERRED. Generates referral ID."""
    _guard_terminal(ring_id)
    state = _get_ring_state(ring_id)
    if state["status"] != "CASE_OPENED":
        raise HTTPException(status_code=409, detail=f"Cannot refer from state '{state['status']}'")
    referral_id = f"DOJ-{uuid.uuid4().hex[:8].upper()}"
    _set_ring_state(ring_id, status="REFERRED", referral_id=referral_id)
    _audit(ring_id, "refer", "current_user", {"referral_id": referral_id})
    return _ring_response(ring_id)


@router.post("/{ring_id}/actions/assign")
async def assign_investigator(ring_id: str, body: AssignRequest) -> dict[str, Any]:
    """Assign investigator. Valid on any non-terminal state."""
    _guard_terminal(ring_id)
    _set_ring_state(ring_id, assignee_id=body.investigator_id)
    _audit(ring_id, "assign", "current_user", {"investigator_id": body.investigator_id})
    return _ring_response(ring_id)
