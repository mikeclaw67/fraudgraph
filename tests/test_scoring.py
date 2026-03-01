# Test suite for the FraudGraph composite risk scorer.
# Validates the scoring formula: RiskScore = 0.4*rules + 0.35*ml + 0.25*graph
# Tests cover edge cases, weight application, severity mapping, and batch scoring.

from __future__ import annotations

import uuid

import pytest

from backend.detection.rules import RuleResult, Severity, build_context, evaluate_record
from backend.detection.scoring import (
    RiskScore,
    compute_rule_score,
    compose_risk_score,
    score_batch,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_record(**overrides) -> dict:
    record = {
        "borrower_id": str(uuid.uuid4()),
        "borrower_name": "Score Test",
        "ssn_last4": "0000",
        "business_name": "Score Corp",
        "ein": "99-0000001",
        "business_address": "1 Score Lane",
        "business_city": "Testville",
        "business_state": "TX",
        "business_zip": "75001",
        "employee_count": 10,
        "business_age_months": 24,
        "loan_program": "PPP",
        "loan_amount": 50_000.0,
        "loan_date": "2020-07-01",
        "lender_name": "Test Lender",
        "bank_routing": "111222333",
        "bank_account": "4445556666",
        "naics_code": "541110",
        "industry": "Legal",
        "fraud_label": False,
        "fraud_type": None,
    }
    record.update(overrides)
    return record


def _make_fired_result(name: str, severity: Severity) -> RuleResult:
    return RuleResult(rule_name=name, fired=True, severity=severity, details={})


def _make_unfired_result(name: str) -> RuleResult:
    return RuleResult(rule_name=name, fired=False)


# ---------------------------------------------------------------------------
# compute_rule_score tests
# ---------------------------------------------------------------------------

class TestComputeRuleScore:
    """Tests for the rule score computation."""

    def test_no_rules_fired_returns_zero(self):
        results = [_make_unfired_result("R1"), _make_unfired_result("R2")]
        score, names, sev = compute_rule_score(results)
        assert score == 0.0
        assert names == []
        assert sev == "LOW"

    def test_critical_rule_gives_high_score(self):
        results = [
            _make_fired_result("EIN_REUSE", Severity.CRITICAL),
            _make_unfired_result("ADDR_REUSE"),
        ]
        score, names, sev = compute_rule_score(results)
        assert score > 60  # CRITICAL weight (1.0) * 60 + density contribution
        assert "EIN_REUSE" in names
        assert sev == "CRITICAL"

    def test_multiple_rules_increase_score(self):
        """More fired rules should increase the density component."""
        one_rule = [
            _make_fired_result("R1", Severity.HIGH),
            _make_unfired_result("R2"),
            _make_unfired_result("R3"),
        ]
        three_rules = [
            _make_fired_result("R1", Severity.HIGH),
            _make_fired_result("R2", Severity.MEDIUM),
            _make_fired_result("R3", Severity.MEDIUM),
        ]
        score_one, _, _ = compute_rule_score(one_rule)
        score_three, _, _ = compute_rule_score(three_rules)
        assert score_three > score_one

    def test_empty_results_returns_zero(self):
        score, names, sev = compute_rule_score([])
        assert score == 0.0


# ---------------------------------------------------------------------------
# compose_risk_score tests
# ---------------------------------------------------------------------------

class TestComposeRiskScore:
    """Tests for the composite risk score formula."""

    def test_zero_inputs_give_zero_score(self):
        results = [_make_unfired_result("R1")]
        risk = compose_risk_score("test-1", results, ml_anomaly_score=0, graph_centrality_score=0)
        assert risk.total_score == 0.0
        assert risk.entity_id == "test-1"

    def test_weights_applied_correctly(self):
        """Verify: total = 0.4*rules + 0.35*ml + 0.25*graph."""
        results = [_make_unfired_result("R1")]  # rule_score = 0
        risk = compose_risk_score(
            "test-2", results,
            ml_anomaly_score=100.0,
            graph_centrality_score=100.0,
            weight_rules=0.4,
            weight_ml=0.35,
            weight_graph=0.25,
        )
        # 0.4*0 + 0.35*100 + 0.25*100 = 0 + 35 + 25 = 60
        assert abs(risk.total_score - 60.0) < 0.01

    def test_all_components_contribute(self):
        """All three signal layers should contribute to the final score."""
        results = [_make_fired_result("R1", Severity.HIGH)]
        risk = compose_risk_score(
            "test-3", results,
            ml_anomaly_score=50.0,
            graph_centrality_score=50.0,
        )
        assert risk.total_score > 0
        assert risk.rule_score > 0
        assert risk.ml_score == 50.0
        assert risk.graph_score == 50.0

    def test_score_capped_at_100(self):
        """Score should never exceed 100."""
        results = [
            _make_fired_result("R1", Severity.CRITICAL),
            _make_fired_result("R2", Severity.CRITICAL),
        ]
        risk = compose_risk_score(
            "test-4", results,
            ml_anomaly_score=100.0,
            graph_centrality_score=100.0,
        )
        assert risk.total_score <= 100.0

    def test_ml_score_clamped(self):
        """ML score should be clamped between 0 and 100."""
        results = [_make_unfired_result("R1")]
        risk = compose_risk_score("test-5", results, ml_anomaly_score=150.0)
        assert risk.ml_score == 100.0

        risk2 = compose_risk_score("test-6", results, ml_anomaly_score=-50.0)
        assert risk2.ml_score == 0.0

    def test_fired_rules_tracked(self):
        """Fired rule names should appear in the risk score."""
        results = [
            _make_fired_result("ADDR_REUSE", Severity.HIGH),
            _make_fired_result("STRAW_CO", Severity.HIGH),
            _make_unfired_result("EIN_REUSE"),
        ]
        risk = compose_risk_score("test-7", results)
        assert "ADDR_REUSE" in risk.fired_rules
        assert "STRAW_CO" in risk.fired_rules
        assert "EIN_REUSE" not in risk.fired_rules

    def test_to_dict_round_trips(self):
        """RiskScore.to_dict() should produce a clean dict."""
        results = [_make_fired_result("R1", Severity.MEDIUM)]
        risk = compose_risk_score("test-8", results, ml_anomaly_score=30.0)
        d = risk.to_dict()
        assert "entity_id" in d
        assert "total_score" in d
        assert isinstance(d["fired_rules"], list)


# ---------------------------------------------------------------------------
# score_batch tests
# ---------------------------------------------------------------------------

class TestScoreBatch:
    """Tests for batch scoring."""

    def test_batch_scores_all_records(self):
        records = [_make_record(ein=f"11-{i:07d}") for i in range(10)]
        from backend.detection.rules import evaluate_batch
        rule_map = evaluate_batch(records)
        scores = score_batch(records, rule_map)
        assert len(scores) == 10

    def test_batch_with_ml_scores(self):
        records = [_make_record(ein=f"22-{i:07d}") for i in range(5)]
        from backend.detection.rules import evaluate_batch
        rule_map = evaluate_batch(records)
        ml_scores = {r["borrower_id"]: 75.0 for r in records}

        scores = score_batch(records, rule_map, ml_scores=ml_scores)
        for s in scores:
            assert s.ml_score == 75.0
            assert s.total_score > 0  # At minimum ML contributes 0.35 * 75 = 26.25

    def test_fraud_records_score_higher(self):
        """Records with fraud indicators should score higher than clean records."""
        clean = _make_record(
            ein="33-0000001",
            employee_count=50,
            business_age_months=60,
            loan_amount=30_000.0,
        )
        fraud = _make_record(
            ein="33-0000002",
            employee_count=0,
            business_age_months=0,
            loan_amount=147_000.0,
        )
        records = [clean, fraud]
        from backend.detection.rules import evaluate_batch
        rule_map = evaluate_batch(records)
        scores = score_batch(records, rule_map)

        clean_score = next(s for s in scores if s.entity_id == clean["borrower_id"])
        fraud_score = next(s for s in scores if s.entity_id == fraud["borrower_id"])
        assert fraud_score.total_score > clean_score.total_score
