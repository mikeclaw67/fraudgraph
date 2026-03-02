# Rings API — serves fraud ring data for the frontend dashboard.
# GET /api/rings returns all detected fraud rings with risk scores and entity counts.
# Follows the same in-memory store pattern as alerts/entities/cases for MVP.

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

router = APIRouter(prefix="/rings", tags=["rings"])

# In-memory ring store for MVP (seeded by data/seed_demo.py at startup)
_ring_store: list[dict] = []


def set_ring_store(rings: list[dict]) -> None:
    """Inject ring data into the store (called by the demo seeder)."""
    global _ring_store
    _ring_store = rings


def get_ring_store() -> list[dict]:
    """Return current ring store contents."""
    return _ring_store


@router.get("")
async def list_rings(
    status: str = Query("", description="Filter by status (ACTIVE, MONITORING, RESOLVED)"),
    sort_by: str = Query("riskScore", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
) -> dict[str, Any]:
    """Return all fraud rings sorted by risk score (default desc)."""
    filtered = _ring_store

    if status:
        filtered = [r for r in filtered if r.get("status") == status]

    reverse = sort_order.lower() == "desc"
    filtered = sorted(filtered, key=lambda r: r.get(sort_by, 0), reverse=reverse)

    return {
        "rings": filtered,
        "total": len(filtered),
    }


@router.get("/{ring_id}")
async def get_ring(ring_id: str) -> dict[str, Any]:
    """Return a single fraud ring with its entity details and members."""
    from backend.api.entities import _entity_store
    
    for ring in _ring_store:
        if ring.get("id") == ring_id:
            # Build members array from entity UUIDs
            members = []
            for entity_id in ring.get("entities", []):
                entity = _entity_store.get(entity_id)
                if entity:
                    members.append({
                        "member_id": entity.get("borrower_id"),
                        "business_name": entity.get("business_name", ""),
                        "ein": entity.get("ein", ""),
                        "borrower_name": entity.get("borrower_name", ""),
                        "loan_amount": entity.get("loan_amount", 0),
                        "loan_date": entity.get("loan_date", ""),
                        "lender": entity.get("lender_name", ""),
                        "status": "FUNDED",
                        "risk_score": entity.get("risk_score", 0),
                        "notes": None,
                        "red_flags": entity.get("red_flags", []),
                        "ssn_last4": entity.get("ssn_last4", ""),
                        "bank_account_last4": entity.get("bank_account", "")[-4:] if entity.get("bank_account") else "",
                        "program": entity.get("loan_program", "PPP"),
                        "employee_count": entity.get("employee_count", 0),
                        "business_age_months": entity.get("business_age_months", 0),
                        "all_businesses": [entity.get("business_name", "")],
                    })
            
            # Compute avg_risk_score from members
            avg_risk = 0
            if members:
                avg_risk = int(sum(m.get("risk_score", 0) for m in members) / len(members))
            
            # Enrich ring response with computed/default fields
            enriched_ring = {
                **ring,
                "member_count": len(members),
                "avg_risk_score": ring.get("avg_risk_score", avg_risk),
                "members": members,
            }
            
            # Ensure common_element field exists
            if "common_element" not in enriched_ring:
                enriched_ring["common_element"] = f"{len(members)} entities linked to {enriched_ring.get('name', 'fraud ring')}"
            if "common_element_detail" not in enriched_ring:
                enriched_ring["common_element_detail"] = f"Detected {enriched_ring.get('createdAt', 'recently')}"
            if "detected_at" not in enriched_ring:
                enriched_ring["detected_at"] = enriched_ring.get("createdAt", "2024-01-01T00:00:00Z")
            if "updated_at" not in enriched_ring:
                enriched_ring["updated_at"] = enriched_ring.get("createdAt", "2024-01-01T00:00:00Z")
            if "assigned_to" not in enriched_ring:
                enriched_ring["assigned_to"] = None
            
            return {"ring": enriched_ring}
    return {"error": "Ring not found", "ring_id": ring_id}



@router.post("/{ring_id}/case")
async def create_ring_case(ring_id: str) -> dict[str, Any]:
    """Create an investigation case for a ring."""
    from backend.api.cases import _case_store
    import uuid
    from datetime import datetime, timezone
    
    # Find the ring
    ring = None
    for r in _ring_store:
        if r.get("id") == ring_id:
            ring = r
            break
    
    if not ring:
        return {"error": "Ring not found", "ring_id": ring_id}
    
    # Create case
    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    case = {
        "case_id": case_id,
        "ring_id": ring_id,
        "title": f"Investigation: {ring.get('name', 'Unknown Ring')}",
        "description": f"Fraud ring with ${ring.get('total_exposure', 0):,.0f} exposure",
        "status": "OPEN",
        "priority": "HIGH",
        "assigned_to": None,
        "fraud_type": ring.get("ring_type", "UNKNOWN"),
        "alert_ids": [],
        "total_exposure": ring.get("total_exposure", 0),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "checklist": [
            {"key": "IDENTITY_VERIFIED", "label": "Identity verified", "status": "PENDING"},
            {"key": "ENTITY_CONFIRMED", "label": "Entity confirmed", "status": "PENDING"},
            {"key": "BANK_CONFIRMED", "label": "Bank account confirmed", "status": "PENDING"},
            {"key": "PAYROLL_REVIEWED", "label": "Payroll reviewed", "status": "PENDING"},
            {"key": "EXPOSURE_CONFIRMED", "label": "Exposure confirmed", "status": "PENDING"},
            {"key": "GRAPH_COMPLETE", "label": "Graph analysis complete", "status": "PENDING"},
            {"key": "RING_MEMBERS_ID", "label": "Ring members identified", "status": "PENDING"},
        ],
        "reviewer": None,
        "review_status": "NONE",
        "review_notes": None,
        "audit_trail": [
            {
                "action": "CASE_CREATED",
                "actor": "investigator",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "details": f"Case created for {ring.get('name', 'unknown ring')}",
            }
        ],
    }
    
    _case_store.append(case)
    return {"case": case}
