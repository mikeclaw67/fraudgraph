# Triage Engine — automated ring classification and investigator assignment.
# Classifies rings into CRITICAL/HIGH/MEDIUM/LOW tiers based on risk score
# and total exposure. CRITICAL rings automatically get cases created.
# S3: Sprint 8 implementation.

from __future__ import annotations

from typing import Any

from backend.detection.case_factory import auto_create_case_for_ring

# Triage tier thresholds — EM approved $1.5M for CRITICAL (2026-03-07)
TRIAGE_TIERS = {
    "CRITICAL": {"risk_min": 85, "exposure_min": 1_500_000},
    "HIGH":     {"risk_min": 65, "exposure_min": 500_000},
    "MEDIUM":   {"risk_min": 40, "exposure_min": 0},
    "LOW":      {"risk_min": 0,  "exposure_min": 0},
}

# Default investigator assignments by tier
ASSIGNEES = {
    "CRITICAL": "alice",   # Senior investigator
    "HIGH":     "bob",     # Mid-level
    "MEDIUM":   "carol",   # Junior
    "LOW":      None,      # Unassigned
}


def _classify(risk_score: float, total_exposure: float) -> str:
    """Classify a ring into a triage tier based on risk and exposure.
    
    CRITICAL requires BOTH risk >= 85 AND exposure >= $1.5M.
    HIGH requires risk >= 65 OR exposure >= $500K.
    MEDIUM requires risk >= 40.
    LOW is everything else.
    """
    if risk_score >= 85 and total_exposure >= 1_500_000:
        return "CRITICAL"
    if risk_score >= 65 or total_exposure >= 500_000:
        return "HIGH"
    if risk_score >= 40:
        return "MEDIUM"
    return "LOW"


def apply_ring_triage(rings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Apply automated triage to all rings.
    
    For each ring:
    1. Classify into CRITICAL/HIGH/MEDIUM/LOW
    2. Auto-assign investigator if not already assigned
    3. Auto-create case for CRITICAL rings
    
    Returns the mutated rings list with triage fields added:
    - triageTier: str
    - assignedTo: str | None
    - autoAssigned: bool
    - autoCaseId: str | None (only for CRITICAL)
    """
    for ring in rings:
        # Get risk score and exposure from ring — handle both naming conventions
        risk_score = ring.get("risk_score", ring.get("riskScore", 0)) or 0
        total_exposure = ring.get("total_exposure", ring.get("totalExposure", 0)) or 0
        
        # Classify
        tier = _classify(risk_score, total_exposure)
        ring["triageTier"] = tier
        
        # Auto-assign if not already assigned
        existing_assignee = ring.get("assigned_to") or ring.get("assignedTo")
        if existing_assignee:
            ring["assignedTo"] = existing_assignee
            ring["autoAssigned"] = False
        else:
            ring["assignedTo"] = ASSIGNEES[tier]
            ring["autoAssigned"] = True
        
        # Normalize the assigned_to field for API consistency
        ring["assigned_to"] = ring["assignedTo"]
        
        # Auto-create case for CRITICAL rings
        if tier == "CRITICAL":
            case = auto_create_case_for_ring(ring, ASSIGNEES["CRITICAL"])
            ring["autoCaseId"] = case["case_id"]
        else:
            ring["autoCaseId"] = None
    
    return rings


def get_triage_config() -> dict[str, Any]:
    """Return the current triage configuration for display in the UI."""
    return {
        "tiers": TRIAGE_TIERS,
        "assignees": ASSIGNEES,
    }
