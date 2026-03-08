# Analytics API — 5 leadership dashboard endpoints.
# All endpoints read from in-memory stores (no DB for MVP).
# Aggregation logic lives in backend/detection/analytics_engine.py.

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from backend.api.rings import get_ring_store
from backend.api.cases import _case_store
from backend.detection.analytics_engine import (
    calculate_case_aging,
    calculate_dashboard,
    calculate_fraud_distribution,
    calculate_investigator_workload,
    calculate_outcomes,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
async def get_dashboard() -> dict[str, Any]:
    """KPI cards, exposure by type, weekly detections, pipeline funnel, geographic distribution."""
    return calculate_dashboard(get_ring_store(), _case_store)


@router.get("/outcomes")
async def get_outcomes() -> dict[str, Any]:
    """Outcomes & ROI — convictions, recovery forecast, ROI ratio."""
    return calculate_outcomes(get_ring_store(), _case_store)


@router.get("/fraud-distribution")
async def get_fraud_distribution() -> dict[str, Any]:
    """Fraud type distribution — exposure by domain + severity tiers."""
    return calculate_fraud_distribution(get_ring_store())


@router.get("/investigator-workload")
async def get_investigator_workload() -> dict[str, Any]:
    """Investigator workload — team capacity, cases per investigator, utilization %."""
    return calculate_investigator_workload(_case_store)


@router.get("/case-aging")
async def get_case_aging() -> dict[str, Any]:
    """Case aging / bottleneck analysis — time-bucket table + top aged cases."""
    return calculate_case_aging(_case_store)
