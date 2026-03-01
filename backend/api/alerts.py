# Alerts API — paginated, filterable alert queue for the investigator UI.
# GET /api/alerts returns risk-sorted alerts with severity/status filtering.
# This is the primary feed that drives the triage workflow in Workshop.

from __future__ import annotations

from enum import Enum
from typing import Any

from fastapi import APIRouter, Query

router = APIRouter(prefix="/alerts", tags=["alerts"])


class SeverityFilter(str, Enum):
    ALL = "ALL"
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class StatusFilter(str, Enum):
    ALL = "ALL"
    NEW = "NEW"
    REVIEWING = "REVIEWING"
    ESCALATED = "ESCALATED"
    DISMISSED = "DISMISSED"
    RESOLVED = "RESOLVED"


# In-memory alert store for MVP (replaced by PostgreSQL in production)
_alert_store: list[dict] = []


def set_alert_store(alerts: list[dict]) -> None:
    """Inject alerts into the store (called by detection pipeline or seeder)."""
    global _alert_store
    _alert_store = alerts


@router.get("")
async def get_alerts(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    severity: SeverityFilter = Query(SeverityFilter.ALL, description="Filter by severity"),
    status: StatusFilter = Query(StatusFilter.ALL, description="Filter by status"),
    sort_by: str = Query("risk_score", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
) -> dict[str, Any]:
    """Return paginated, filtered alerts sorted by risk score (default desc)."""
    filtered = _alert_store

    if severity != SeverityFilter.ALL:
        filtered = [a for a in filtered if a.get("severity") == severity.value]
    if status != StatusFilter.ALL:
        filtered = [a for a in filtered if a.get("status") == status.value]

    reverse = sort_order.lower() == "desc"
    filtered.sort(key=lambda a: a.get(sort_by, 0), reverse=reverse)

    total = len(filtered)
    start = (page - 1) * page_size
    end = start + page_size
    page_data = filtered[start:end]

    return {
        "alerts": page_data,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        },
    }


@router.get("/{alert_id}")
async def get_alert(alert_id: str) -> dict:
    """Return a single alert by ID."""
    for alert in _alert_store:
        if alert.get("alert_id") == alert_id:
            return {"alert": alert}
    return {"error": "Alert not found", "alert_id": alert_id}
