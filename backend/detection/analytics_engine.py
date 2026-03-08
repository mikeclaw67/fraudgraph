# Analytics Engine — aggregation logic for the Command Center dashboard.
# All functions read from in-memory _ring_store + _case_store (no DB).
# Calculations follow MVP assumptions from analytics_config.py.

from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Any

from backend.analytics_config import (
    CONVICTION_RATE,
    RECOVERY_RATE,
    ANNUAL_SALARY_PER_INVESTIGATOR,
    CASES_PER_INVESTIGATOR_MAX,
    INVESTIGATOR_ROLES,
)


def _parse_dt(iso_str: str | None) -> datetime:
    """Parse ISO timestamp string to datetime, fallback to epoch."""
    if not iso_str:
        return datetime(2024, 1, 1, tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, AttributeError):
        return datetime(2024, 1, 1, tzinfo=timezone.utc)


def calculate_dashboard(rings: list[dict], cases: list[dict]) -> dict[str, Any]:
    """Calculate all 5 existing chart data from real ring + case stores."""
    now = datetime.now(timezone.utc)

    # --- KPI Cards ---
    total_rings = len(rings)
    total_exposure = sum(r.get("total_exposure", r.get("totalExposure", 0)) or 0 for r in rings)
    referred = [c for c in cases if c.get("status") == "REFERRED_TO_DOJ"]
    cases_referred = len(referred)

    # Avg days to triage: ring created_at → first status change
    # Approximate: use rings that have been reviewed (status != NEW/ACTIVE)
    triage_days: list[float] = []
    for r in rings:
        status = r.get("status", "")
        if status not in ("NEW", "ACTIVE", "DETECTED"):
            created = _parse_dt(r.get("created_at", r.get("createdAt")))
            updated = _parse_dt(r.get("updated_at", r.get("updatedAt")))
            diff = (updated - created).total_seconds() / 86400
            if diff > 0:
                triage_days.append(diff)
    avg_days_triage = round(statistics.mean(triage_days), 1) if triage_days else 0.0

    # --- Exposure by Ring Type ---
    type_exposure: dict[str, float] = defaultdict(float)
    for r in rings:
        rtype = r.get("ring_type", "UNKNOWN")
        exp = r.get("total_exposure", r.get("totalExposure", 0)) or 0
        type_exposure[rtype] += exp

    # --- Weekly Detections (past 8 weeks) ---
    eight_weeks_ago = now - timedelta(weeks=8)
    # Build week buckets starting Monday
    week_start = eight_weeks_ago - timedelta(days=eight_weeks_ago.weekday())
    weekly: dict[str, int] = {}
    for i in range(8):
        wk = week_start + timedelta(weeks=i)
        weekly[wk.strftime("%Y-%m-%d")] = 0

    for r in rings:
        created = _parse_dt(r.get("created_at", r.get("createdAt")))
        if created >= eight_weeks_ago:
            # Find which week bucket
            wk_key = (created - timedelta(days=created.weekday())).strftime("%Y-%m-%d")
            if wk_key in weekly:
                weekly[wk_key] += 1

    weekly_detections = [{"week": k, "count": v} for k, v in weekly.items()]

    # --- Pipeline Funnel ---
    detected = total_rings
    reviewed = sum(1 for r in rings if r.get("status") not in ("NEW", "ACTIVE", "DETECTED", None))
    case_opened = sum(1 for c in cases if c.get("status") in ("OPEN", "IN_PROGRESS", "UNDER_REVIEW"))
    funnel_referred = cases_referred

    # --- Geographic Distribution ---
    geo: dict[str, dict[str, float | int]] = defaultdict(lambda: {"exposure": 0.0, "rings": 0})
    for r in rings:
        # Try to extract state from ring data
        loc = r.get("location", {})
        state = ""
        if isinstance(loc, dict):
            state = loc.get("state", "")
        if not state:
            # Fallback: parse from common_element (e.g. "... Miami FL 33131")
            ce = r.get("common_element", "") or ""
            parts = ce.split()
            for i, p in enumerate(parts):
                if len(p) == 2 and p.isalpha() and p.isupper() and i > 0:
                    state = p
                    break
        if state:
            exp = r.get("total_exposure", r.get("totalExposure", 0)) or 0
            geo[state]["exposure"] += exp
            geo[state]["rings"] += 1

    return {
        "kpi": {
            "totalRingsDetected": total_rings,
            "totalExposure": total_exposure,
            "casesReferred": cases_referred,
            "avgDaysToTriage": avg_days_triage,
        },
        "exposureByType": dict(type_exposure),
        "weeklyDetections": weekly_detections,
        "pipelineFunnel": {
            "detected": detected,
            "reviewed": reviewed,
            "caseOpened": case_opened,
            "referred": funnel_referred,
        },
        "geographicDistribution": {k: dict(v) for k, v in geo.items()},
    }


def calculate_outcomes(rings: list[dict], cases: list[dict]) -> dict[str, Any]:
    """Calculate Outcomes & ROI metrics for Congressional reporting."""
    referred = [c for c in cases if c.get("status") == "REFERRED_TO_DOJ"]

    convictions = int(len(referred) * CONVICTION_RATE)
    referred_exposure = sum(c.get("total_exposure", 0) or 0 for c in referred)
    expected_recoveries = referred_exposure * RECOVERY_RATE

    referral_rate = len(referred) / len(rings) if rings else 0

    open_cases = [c for c in cases if c.get("status") in ("OPEN", "IN_PROGRESS")]
    cost_per_case = (
        (len(INVESTIGATOR_ROLES) * ANNUAL_SALARY_PER_INVESTIGATOR) / max(len(open_cases), 1)
    )

    investigation_cost = len(INVESTIGATOR_ROLES) * ANNUAL_SALARY_PER_INVESTIGATOR
    roi = expected_recoveries / investigation_cost if investigation_cost > 0 else 0

    # Avg days to referral
    referral_days: list[float] = []
    for c in referred:
        created = _parse_dt(c.get("created_at"))
        updated = _parse_dt(c.get("updated_at"))
        diff = (updated - created).total_seconds() / 86400
        if diff > 0:
            referral_days.append(diff)
    avg_days_referral = round(statistics.mean(referral_days), 1) if referral_days else 0.0

    return {
        "convictions": convictions,
        "convictionRate": round(CONVICTION_RATE, 2),
        "expectedRecoveries": expected_recoveries,
        "referralRate": round(referral_rate, 3),
        "investigationCost": investigation_cost,
        "roi": round(roi, 1),
        "costPerCase": round(cost_per_case),
        "avgDaysToReferral": avg_days_referral,
        "period": "6_months",
        "assumptions": {
            "recoveryRate": RECOVERY_RATE,
            "convictionRate": CONVICTION_RATE,
            "annualPerInvestigatorCost": ANNUAL_SALARY_PER_INVESTIGATOR,
        },
    }


def calculate_fraud_distribution(rings: list[dict]) -> dict[str, Any]:
    """Calculate fraud type + severity distribution."""
    # By fraud domain: map ring_type to domain
    domain_map: dict[str, str] = {
        "ADDRESS_FARM": "PPP",
        "ACCOUNT_CLUSTER": "PPP",
        "EIN_RECYCLER": "PPP",
        "STRAW_COMPANY": "PPP",
        "THRESHOLD_GAMING": "PPP",
    }
    # Check for Medicaid/Procurement rings via common_element or fraud_type
    by_domain: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {"exposure": 0.0, "rings": 0}
    )
    for r in rings:
        rtype = r.get("ring_type", "UNKNOWN")
        domain = domain_map.get(rtype, "PPP")
        exp = r.get("total_exposure", r.get("totalExposure", 0)) or 0
        by_domain[domain]["exposure"] += exp
        by_domain[domain]["rings"] += 1

    # Calculate percentages
    total_exp = sum(d["exposure"] for d in by_domain.values())
    for d in by_domain.values():
        d["percentage"] = round(d["exposure"] / total_exp * 100, 1) if total_exp else 0

    # By severity (using triageTier)
    by_severity: dict[str, dict[str, float | int]] = {}
    for tier in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
        tier_rings = [r for r in rings if r.get("triageTier") == tier]
        tier_exp = sum(r.get("total_exposure", r.get("totalExposure", 0)) or 0 for r in tier_rings)
        by_severity[tier] = {
            "rings": len(tier_rings),
            "exposure": tier_exp,
        }

    return {
        "byType": {k: dict(v) for k, v in by_domain.items()},
        "bySeverity": by_severity,
    }


def calculate_investigator_workload(
    cases: list[dict],
) -> dict[str, Any]:
    """Calculate investigator workload + team capacity."""
    by_inv: dict[str, dict[str, Any]] = {}
    for c in cases:
        assignee = c.get("assigned_to")
        if not assignee:
            continue
        if assignee not in by_inv:
            by_inv[assignee] = {
                "name": assignee,
                "role": INVESTIGATOR_ROLES.get(assignee, "Unknown"),
                "openCases": 0,
                "totalExposure": 0.0,
                "caseReferrals": 0,
                "referralDays": [],
            }
        if c.get("status") in ("OPEN", "IN_PROGRESS", "UNDER_REVIEW"):
            by_inv[assignee]["openCases"] += 1
        by_inv[assignee]["totalExposure"] += c.get("total_exposure", 0) or 0
        if c.get("status") == "REFERRED_TO_DOJ":
            by_inv[assignee]["caseReferrals"] += 1
            created = _parse_dt(c.get("created_at"))
            updated = _parse_dt(c.get("updated_at"))
            diff = (updated - created).total_seconds() / 86400
            if diff > 0:
                by_inv[assignee]["referralDays"].append(diff)

    investigators = []
    for name, data in by_inv.items():
        recovery = data["totalExposure"] * RECOVERY_RATE
        roi = int(recovery / ANNUAL_SALARY_PER_INVESTIGATOR) if ANNUAL_SALARY_PER_INVESTIGATOR > 0 else 0
        avg_ref_days = (
            round(statistics.mean(data["referralDays"]), 1) if data["referralDays"] else 0
        )
        investigators.append({
            "name": name,
            "role": data["role"],
            "openCases": data["openCases"],
            "totalExposure": data["totalExposure"],
            "estimatedRoi": roi,
            "caseReferrals": data["caseReferrals"],
            "avgDaysToReferral": avg_ref_days,
        })

    # Sort by open cases descending
    investigators.sort(key=lambda x: x["openCases"], reverse=True)

    # Team capacity
    total_open = sum(inv["openCases"] for inv in investigators)
    max_capacity = len(INVESTIGATOR_ROLES) * CASES_PER_INVESTIGATOR_MAX
    utilization = round(total_open / max_capacity * 100, 1) if max_capacity > 0 else 0

    return {
        "investigators": investigators,
        "teamCapacity": {
            "used": total_open,
            "max": max_capacity,
            "utilizationPercent": utilization,
        },
    }


def calculate_case_aging(cases: list[dict]) -> dict[str, Any]:
    """Calculate case aging buckets + top blockers."""
    now = datetime.now(timezone.utc)

    open_buckets: dict[str, list[dict]] = {
        "under_7": [],
        "7_to_30": [],
        "30_to_60": [],
        "over_60": [],
    }
    review_buckets: dict[str, list[dict]] = {
        "under_7": [],
        "7_to_14": [],
        "over_14": [],
    }

    for c in cases:
        status = c.get("status", "")
        created = _parse_dt(c.get("created_at"))
        days_open = (now - created).days

        if status in ("OPEN", "IN_PROGRESS"):
            if days_open < 7:
                open_buckets["under_7"].append(c)
            elif days_open < 30:
                open_buckets["7_to_30"].append(c)
            elif days_open < 60:
                open_buckets["30_to_60"].append(c)
            else:
                open_buckets["over_60"].append(c)

        elif status == "UNDER_REVIEW":
            # Use updated_at as proxy for review_started_at
            review_start = _parse_dt(c.get("updated_at"))
            days_review = (now - review_start).days
            if days_review < 7:
                review_buckets["under_7"].append(c)
            elif days_review < 14:
                review_buckets["7_to_14"].append(c)
            else:
                review_buckets["over_14"].append(c)

    def _bucket_summary(cases_list: list[dict], severity: str) -> dict[str, Any]:
        total_exp = sum(c.get("total_exposure", 0) or 0 for c in cases_list)
        result: dict[str, Any] = {"count": len(cases_list), "severity": severity}
        if total_exp > 0:
            result["totalExposure"] = total_exp
        return result

    # Top blockers: longest-open cases (over_60 first, then over_30)
    blocker_pool = open_buckets["over_60"] + open_buckets["30_to_60"]
    blocker_pool.sort(
        key=lambda c: c.get("total_exposure", 0) or 0,
        reverse=True,
    )
    top_blockers = []
    for b in blocker_pool[:5]:
        created = _parse_dt(b.get("created_at"))
        top_blockers.append({
            "caseId": b.get("case_id", ""),
            "title": b.get("title", ""),
            "exposure": b.get("total_exposure", 0) or 0,
            "daysAged": (now - created).days,
            "reason": b.get("review_notes") or "Awaiting investigator action",
        })

    return {
        "byStatus": {
            "OPEN": {
                "under_7": _bucket_summary(open_buckets["under_7"], "on_track"),
                "7_to_30": _bucket_summary(open_buckets["7_to_30"], "watch"),
                "30_to_60": _bucket_summary(open_buckets["30_to_60"], "escalate"),
                "over_60": _bucket_summary(open_buckets["over_60"], "blocker"),
            },
            "UNDER_REVIEW": {
                "under_7": _bucket_summary(review_buckets["under_7"], "on_track"),
                "7_to_14": _bucket_summary(review_buckets["7_to_14"], "watch"),
                "over_14": _bucket_summary(review_buckets["over_14"], "blocker"),
            },
        },
        "topBlockers": top_blockers,
    }
