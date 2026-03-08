# Alert Generator — transforms RiskScore outputs into actionable Alert objects
# that feed the investigator queue. Alerts are the bridge between the detection
# engine and the case management UI. Each alert captures the entity, risk score,
# fired rules, and recommended triage action.

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from backend.detection.scoring import RiskScore


class AlertStatus(str, Enum):
    """Lifecycle status of an alert in the investigation queue."""
    NEW = "NEW"
    REVIEWING = "REVIEWING"
    ESCALATED = "ESCALATED"
    DISMISSED = "DISMISSED"
    RESOLVED = "RESOLVED"


class TriageAction(str, Enum):
    """Recommended initial action for an investigator."""
    REVIEW_GRAPH = "REVIEW_GRAPH"
    CHECK_DOCUMENTS = "CHECK_DOCUMENTS"
    CROSS_REFERENCE = "CROSS_REFERENCE"
    ESCALATE = "ESCALATE"
    AUTO_DISMISS = "AUTO_DISMISS"


@dataclass
class Alert:
    """A single investigator-facing fraud alert."""
    alert_id: str
    entity_id: str
    entity_type: str
    risk_score: float
    severity: str
    fired_rules: list[str]
    status: AlertStatus
    triage_action: TriageAction
    created_at: str
    details: dict[str, Any] = field(default_factory=dict)
    assigned_to: str | None = None
    case_id: str | None = None

    def to_dict(self) -> dict:
        return {
            "alert_id": self.alert_id,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "risk_score": round(self.risk_score, 2),
            "severity": self.severity,
            "fired_rules": self.fired_rules,
            "status": self.status.value,
            "triage_action": self.triage_action.value,
            "created_at": self.created_at,
            "details": self.details,
            "assigned_to": self.assigned_to,
            "case_id": self.case_id,
        }


def _recommend_triage(risk_score: RiskScore) -> TriageAction:
    """Determine recommended triage action based on risk signals."""
    if risk_score.severity == "CRITICAL":
        return TriageAction.ESCALATE
    if risk_score.total_score >= 70:
        return TriageAction.REVIEW_GRAPH
    if risk_score.total_score >= 40:
        return TriageAction.CROSS_REFERENCE
    if risk_score.total_score >= 20:
        return TriageAction.CHECK_DOCUMENTS
    return TriageAction.AUTO_DISMISS


def generate_alert(
    risk_score: RiskScore,
    entity_type: str = "Borrower",
    score_threshold: float = 15.0,
) -> Alert | None:
    """Generate an alert from a risk score if it exceeds the threshold.

    Returns None if the score is below threshold (no alert warranted).
    """
    if risk_score.total_score < score_threshold:
        return None

    return Alert(
        alert_id=str(uuid.uuid4()),
        entity_id=risk_score.entity_id,
        entity_type=entity_type,
        risk_score=risk_score.total_score,
        severity=risk_score.severity,
        fired_rules=risk_score.fired_rules,
        status=AlertStatus.NEW,
        triage_action=_recommend_triage(risk_score),
        created_at=datetime.now(timezone.utc).isoformat(),
        details=risk_score.details,
    )


def generate_alerts_batch(
    risk_scores: list[RiskScore],
    entity_type: str = "Borrower",
    score_threshold: float = 15.0,
) -> list[Alert]:
    """Generate alerts for all risk scores above threshold."""
    alerts = []
    for rs in risk_scores:
        alert = generate_alert(rs, entity_type, score_threshold)
        if alert is not None:
            alerts.append(alert)
    # Sort by risk score descending — highest priority first
    alerts.sort(key=lambda a: a.risk_score, reverse=True)
    return alerts


def deduplicate_alerts(alerts: list) -> list:
    """Deduplicate alerts by entity_id, keeping only the highest risk_score per entity.
    
    Args:
        alerts: List of Alert objects or alert dicts
        
    Returns:
        Deduplicated list sorted by risk_score descending
    """
    if not alerts:
        return []
    
    seen: dict[str, object] = {}
    for a in alerts:
        # Handle both Alert objects and dicts
        eid = getattr(a, "entity_id", None) or a.get("entity_id") if isinstance(a, dict) else getattr(a, "entity_id", None)
        risk = getattr(a, "risk_score", 0) if hasattr(a, "risk_score") else (a.get("risk_score", 0) if isinstance(a, dict) else 0)
        
        if eid is None:
            continue
            
        if eid not in seen:
            seen[eid] = a
        else:
            existing = seen[eid]
            existing_risk = getattr(existing, "risk_score", 0) if hasattr(existing, "risk_score") else (existing.get("risk_score", 0) if isinstance(existing, dict) else 0)
            if risk > existing_risk:
                seen[eid] = a
    
    # Sort by risk_score descending
    result = list(seen.values())
    result.sort(key=lambda x: getattr(x, "risk_score", 0) if hasattr(x, "risk_score") else (x.get("risk_score", 0) if isinstance(x, dict) else 0), reverse=True)
    return result
