# Entity 360 API — full profile view for any entity in the fraud graph.
# GET /api/entity/:id returns the entity's attributes, connected nodes,
# risk history, fired rules, and timeline — everything an investigator
# needs on a single screen without switching tools.

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

router = APIRouter(prefix="/entity", tags=["entities"])

# In-memory entity store for MVP
_entity_store: dict[str, dict] = {}
_alert_index: dict[str, list[dict]] = {}


def set_entity_store(records: list[dict]) -> None:
    """Index records by borrower_id for fast entity lookup."""
    global _entity_store, _alert_index
    for r in records:
        bid = r.get("borrower_id", "")
        _entity_store[bid] = r


def set_alert_index(alerts: list[dict]) -> None:
    """Index alerts by entity_id for 360 profile."""
    global _alert_index
    _alert_index.clear()
    for a in alerts:
        eid = a.get("entity_id", "")
        _alert_index.setdefault(eid, []).append(a)


@router.get("/{entity_id}")
async def get_entity_profile(entity_id: str) -> dict[str, Any]:
    """Return 360 profile for an entity: attributes, alerts, connections."""
    entity = _entity_store.get(entity_id)
    if not entity:
        return {"error": "Entity not found", "entity_id": entity_id}

    alerts = _alert_index.get(entity_id, [])

    # Build profile response
    profile = {
        "entity_id": entity_id,
        "entity_type": "Borrower",
        "attributes": {
            "borrower_name": entity.get("borrower_name"),
            "business_name": entity.get("business_name"),
            "ein": entity.get("ein"),
            "business_address": entity.get("business_address"),
            "business_city": entity.get("business_city"),
            "business_state": entity.get("business_state"),
            "employee_count": entity.get("employee_count"),
            "business_age_months": entity.get("business_age_months"),
            "loan_program": entity.get("loan_program"),
            "loan_amount": entity.get("loan_amount"),
            "loan_date": str(entity.get("loan_date", "")),
            "lender_name": entity.get("lender_name"),
            "naics_code": entity.get("naics_code"),
            "industry": entity.get("industry"),
        },
        "alerts": alerts,
        "alert_count": len(alerts),
        "connections": {
            "business_ein": entity.get("ein"),
            "bank_routing": entity.get("bank_routing"),
            "address": f"{entity.get('business_address', '')}, {entity.get('business_city', '')}, {entity.get('business_state', '')}",
        },
    }
    return {"entity": profile}


@router.get("")
async def search_entities(
    q: str = Query("", description="Search query (name, EIN, or business)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    """Search entities by name, EIN, or business name."""
    query_lower = q.lower()
    results = []

    for eid, entity in _entity_store.items():
        if not q:
            results.append({"entity_id": eid, **entity})
            continue
        searchable = " ".join([
            str(entity.get("borrower_name", "")),
            str(entity.get("business_name", "")),
            str(entity.get("ein", "")),
        ]).lower()
        if query_lower in searchable:
            results.append({"entity_id": eid, **entity})

    total = len(results)
    start = (page - 1) * page_size
    page_data = results[start:start + page_size]

    return {
        "entities": page_data,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        },
    }
