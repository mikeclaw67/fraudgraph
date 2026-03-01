# Composite Risk Scorer — combines rule hits, ML anomaly scores, and graph
# centrality into a single 0-100 risk score per entity. The weights are
# configurable via Settings: default 0.40 rules + 0.35 ML + 0.25 graph.
# This is the "AIP scoring layer" equivalent in FraudGraph.

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.detection.rules import RuleResult, Severity


# Severity -> numeric score mapping for rule aggregation
SEVERITY_SCORES: dict[str, float] = {
    Severity.CRITICAL.value: 1.0,
    Severity.HIGH.value: 0.75,
    Severity.MEDIUM.value: 0.5,
    Severity.LOW.value: 0.25,
}


@dataclass
class RiskScore:
    """Composite risk assessment for a single entity."""
    entity_id: str
    total_score: float          # 0-100 final composite score
    rule_score: float           # 0-100 from deterministic rules
    ml_score: float             # 0-100 from ML models
    graph_score: float          # 0-100 from graph centrality
    fired_rules: list[str]      # names of rules that fired
    severity: str               # highest severity across all signals
    details: dict[str, Any]

    def to_dict(self) -> dict:
        return {
            "entity_id": self.entity_id,
            "total_score": round(self.total_score, 2),
            "rule_score": round(self.rule_score, 2),
            "ml_score": round(self.ml_score, 2),
            "graph_score": round(self.graph_score, 2),
            "fired_rules": self.fired_rules,
            "severity": self.severity,
            "details": self.details,
        }


def compute_rule_score(results: list[RuleResult]) -> tuple[float, list[str], str]:
    """Convert a list of RuleResults into a 0-100 rule score.

    Returns (score, fired_rule_names, highest_severity).
    """
    if not results:
        return 0.0, [], "LOW"

    fired = [r for r in results if r.fired]
    if not fired:
        return 0.0, [], "LOW"

    fired_names = [r.rule_name for r in fired]

    # Score = max severity weight * 60 + (number of rules fired / total rules) * 40
    severity_values = [SEVERITY_SCORES.get(r.severity.value, 0) for r in fired if r.severity]
    max_severity_weight = max(severity_values) if severity_values else 0
    rule_density = len(fired) / len(results)

    score = (max_severity_weight * 60) + (rule_density * 40)
    score = min(score, 100.0)

    # Determine highest severity
    severity_order = [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW]
    highest = Severity.LOW
    for s in severity_order:
        if any(r.severity == s for r in fired):
            highest = s
            break

    return score, fired_names, highest.value


def compose_risk_score(
    entity_id: str,
    rule_results: list[RuleResult],
    ml_anomaly_score: float = 0.0,
    graph_centrality_score: float = 0.0,
    weight_rules: float = 0.40,
    weight_ml: float = 0.35,
    weight_graph: float = 0.25,
) -> RiskScore:
    """Compose a final risk score from all three signal layers.

    Args:
        entity_id: borrower_id or entity identifier
        rule_results: output from rules.evaluate_record()
        ml_anomaly_score: 0-100 score from isolation forest or other ML model
        graph_centrality_score: 0-100 score derived from graph centrality metrics
        weight_rules: weight for rule component (default 0.40)
        weight_ml: weight for ML component (default 0.35)
        weight_graph: weight for graph component (default 0.25)
    """
    rule_score, fired_names, highest_severity = compute_rule_score(rule_results)

    # Clamp inputs
    ml_score = max(0.0, min(100.0, ml_anomaly_score))
    graph_score = max(0.0, min(100.0, graph_centrality_score))

    total = (
        weight_rules * rule_score
        + weight_ml * ml_score
        + weight_graph * graph_score
    )
    total = min(total, 100.0)

    return RiskScore(
        entity_id=entity_id,
        total_score=total,
        rule_score=rule_score,
        ml_score=ml_score,
        graph_score=graph_score,
        fired_rules=fired_names,
        severity=highest_severity,
        details={
            "weights": {"rules": weight_rules, "ml": weight_ml, "graph": weight_graph},
            "rule_details": [r.to_dict() for r in rule_results if r.fired],
        },
    )


def score_batch(
    records: list[dict],
    rule_results_map: dict[str, list[RuleResult]],
    ml_scores: dict[str, float] | None = None,
    graph_scores: dict[str, float] | None = None,
    weight_rules: float = 0.40,
    weight_ml: float = 0.35,
    weight_graph: float = 0.25,
) -> list[RiskScore]:
    """Score an entire batch of records.

    Args:
        records: raw loan records
        rule_results_map: output from rules.evaluate_batch()
        ml_scores: optional dict of entity_id -> ML anomaly score (0-100)
        graph_scores: optional dict of entity_id -> graph centrality score (0-100)
    """
    ml_scores = ml_scores or {}
    graph_scores = graph_scores or {}

    results = []
    for record in records:
        eid = record.get("borrower_id", "unknown")
        rule_res = rule_results_map.get(eid, [])
        ml_s = ml_scores.get(eid, 0.0)
        graph_s = graph_scores.get(eid, 0.0)

        risk = compose_risk_score(
            entity_id=eid,
            rule_results=rule_res,
            ml_anomaly_score=ml_s,
            graph_centrality_score=graph_s,
            weight_rules=weight_rules,
            weight_ml=weight_ml,
            weight_graph=weight_graph,
        )
        results.append(risk)

    return results
