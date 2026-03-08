# Case Factory — auto-create investigation cases for CRITICAL rings.
# Called by triage_engine when a ring is classified as CRITICAL.
# Writes directly to in-memory stores to avoid circular imports with FastAPI.
# S3: Sprint 8 implementation.

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from backend.api.cases import _case_store, _seed_checklist


def auto_create_case_for_ring(ring: dict[str, Any], assigned_to: str) -> dict[str, Any]:
    """Auto-create an investigation case for a CRITICAL ring.
    
    Args:
        ring: The fraud ring dict with id, name, totalExposure, riskScore, type
        assigned_to: The investigator to assign the case to
        
    Returns:
        The created case dict with case_id set
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Get ring fields — handle both naming conventions
    ring_id = ring.get("id") or ring.get("ring_id")
    ring_name = ring.get("name", "Unknown Ring")
    total_exposure = ring.get("total_exposure", ring.get("totalExposure", 0)) or 0
    risk_score = ring.get("risk_score", ring.get("riskScore", 0)) or 0
    ring_type = ring.get("ring_type", ring.get("type", "UNKNOWN"))
    
    case: dict[str, Any] = {
        "case_id": str(uuid.uuid4()),
        "title": f"AUTO: {ring_name} — ${total_exposure:,.0f} exposure",
        "description": f"Auto-created case for CRITICAL fraud ring. Risk score: {risk_score}.",
        "status": "OPEN",
        "priority": "HIGH",
        "assigned_to": assigned_to,
        "fraud_type": ring_type,
        "total_exposure": total_exposure,
        "ring_id": ring_id,
        "alert_ids": [],
        "created_at": now,
        "updated_at": now,
        "reviewer": None,
        "review_status": "NONE",
        "review_notes": None,
        "sar_filed": False,
        "checklist": _seed_checklist(),
        "audit_trail": [{
            "action": "AUTO_CASE_CREATED",
            "actor": "triage_engine",
            "timestamp": now,
            "details": f"Auto-created for CRITICAL ring (risk={risk_score}, exposure=${total_exposure:,.0f})",
        }],
    }
    
    _case_store.append(case)
    return case
