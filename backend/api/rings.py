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
            
            # Return ring with members
            return {"ring": {**ring, "members": members}}
    return {"error": "Ring not found", "ring_id": ring_id}
