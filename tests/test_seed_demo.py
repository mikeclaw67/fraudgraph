# Test suite for the demo seeder — validates that 5 fraud rings are built
# correctly with proper entity counts, detection rule triggers, and API-ready
# ring metadata matching the frontend schema.

from __future__ import annotations

import pytest

from data.seed_demo import (
    build_all_rings,
    seed_demo_data,
    _build_ring_001,
    _build_ring_002,
    _build_ring_003,
    _build_ring_004,
    _build_ring_005,
)
from backend.detection.rules import build_context, evaluate_batch


# ---------------------------------------------------------------------------
# Ring structure tests
# ---------------------------------------------------------------------------

class TestRingStructure:
    """Validates ring metadata matches the frontend schema."""

    REQUIRED_RING_FIELDS = {"id", "name", "type", "status", "riskScore", "totalExposure", "entityCount", "createdAt"}

    def test_build_all_rings_returns_5_rings(self):
        rings, entities = build_all_rings()
        assert len(rings) == 5

    def test_all_rings_have_required_fields(self):
        rings, _ = build_all_rings()
        for ring in rings:
            missing = self.REQUIRED_RING_FIELDS - set(ring.keys())
            assert not missing, f"Ring {ring.get('id')} missing fields: {missing}"

    def test_ring_ids_are_unique(self):
        rings, _ = build_all_rings()
        ids = [r["id"] for r in rings]
        assert len(ids) == len(set(ids))

    def test_ring_ids_match_expected(self):
        rings, _ = build_all_rings()
        expected = {"RING-001", "RING-002", "RING-003", "RING-004", "RING-005"}
        actual = {r["id"] for r in rings}
        assert actual == expected


# ---------------------------------------------------------------------------
# Entity count tests
# ---------------------------------------------------------------------------

class TestEntityCounts:
    """Validates each ring produces the expected number of entities."""

    def test_ring_001_has_12_entities(self):
        _, entities = _build_ring_001()
        assert len(entities) == 12

    def test_ring_002_has_8_entities(self):
        _, entities = _build_ring_002()
        assert len(entities) == 8

    def test_ring_003_has_15_entities(self):
        _, entities = _build_ring_003()
        assert len(entities) == 15

    def test_ring_004_has_6_entities(self):
        _, entities = _build_ring_004()
        assert len(entities) == 6

    def test_ring_005_has_4_entities(self):
        _, entities = _build_ring_005()
        assert len(entities) == 4

    def test_total_entities_is_45(self):
        _, entities = build_all_rings()
        assert len(entities) == 45


# ---------------------------------------------------------------------------
# Detection rule trigger tests
# ---------------------------------------------------------------------------

class TestDetectionTriggers:
    """Validates that seeded data triggers the expected detection rules."""

    def test_ring_001_triggers_ein_reuse(self):
        """Identity theft ring should trigger EIN_REUSE (recycled EINs)."""
        _, entities = _build_ring_001()
        results = evaluate_batch(entities)
        fired_rules = set()
        for bid_results in results.values():
            for r in bid_results:
                if r.fired:
                    fired_rules.add(r.rule_name)
        assert "EIN_REUSE" in fired_rules

    def test_ring_001_triggers_addr_reuse(self):
        """Identity theft ring should trigger ADDR_REUSE (shared address)."""
        _, entities = _build_ring_001()
        results = evaluate_batch(entities)
        fired_rules = set()
        for bid_results in results.values():
            for r in bid_results:
                if r.fired:
                    fired_rules.add(r.rule_name)
        assert "ADDR_REUSE" in fired_rules

    def test_ring_002_triggers_straw_co(self):
        """Shell company cluster should trigger STRAW_CO."""
        _, entities = _build_ring_002()
        results = evaluate_batch(entities)
        fired_rules = set()
        for bid_results in results.values():
            for r in bid_results:
                if r.fired:
                    fired_rules.add(r.rule_name)
        assert "STRAW_CO" in fired_rules

    def test_ring_002_triggers_account_share(self):
        """Shell company cluster should trigger ACCOUNT_SHARE (shared routing)."""
        _, entities = _build_ring_002()
        results = evaluate_batch(entities)
        fired_rules = set()
        for bid_results in results.values():
            for r in bid_results:
                if r.fired:
                    fired_rules.add(r.rule_name)
        assert "ACCOUNT_SHARE" in fired_rules

    def test_ring_003_triggers_threshold_game(self):
        """Invoice factoring scheme should trigger THRESHOLD_GAME."""
        _, entities = _build_ring_003()
        results = evaluate_batch(entities)
        fired_rules = set()
        for bid_results in results.values():
            for r in bid_results:
                if r.fired:
                    fired_rules.add(r.rule_name)
        assert "THRESHOLD_GAME" in fired_rules

    def test_ring_003_triggers_addr_reuse(self):
        """Invoice factoring scheme should trigger ADDR_REUSE (3 shared addresses)."""
        _, entities = _build_ring_003()
        results = evaluate_batch(entities)
        fired_rules = set()
        for bid_results in results.values():
            for r in bid_results:
                if r.fired:
                    fired_rules.add(r.rule_name)
        assert "ADDR_REUSE" in fired_rules

    def test_ring_004_triggers_ein_reuse(self):
        """Benefits double-dipping should trigger EIN_REUSE."""
        _, entities = _build_ring_004()
        results = evaluate_batch(entities)
        fired_rules = set()
        for bid_results in results.values():
            for r in bid_results:
                if r.fired:
                    fired_rules.add(r.rule_name)
        assert "EIN_REUSE" in fired_rules

    def test_ring_005_triggers_addr_reuse(self):
        """Address cycling ring should trigger ADDR_REUSE."""
        _, entities = _build_ring_005()
        results = evaluate_batch(entities)
        fired_rules = set()
        for bid_results in results.values():
            for r in bid_results:
                if r.fired:
                    fired_rules.add(r.rule_name)
        assert "ADDR_REUSE" in fired_rules


# ---------------------------------------------------------------------------
# Full seeding integration test
# ---------------------------------------------------------------------------

class TestSeedDemoData:
    """Integration test for the full seeding pipeline."""

    def test_seed_returns_correct_summary(self):
        summary = seed_demo_data()
        assert summary["rings"] == 5
        assert summary["entities"] == 45
        assert summary["alerts"] > 0
        assert summary["graph_nodes"] > 0
        assert summary["graph_edges"] > 0

    def test_seed_is_idempotent(self):
        """Running seed twice should produce identical results."""
        summary1 = seed_demo_data()
        summary2 = seed_demo_data()
        assert summary1 == summary2

    def test_seed_populates_ring_store(self):
        from backend.api.rings import get_ring_store
        seed_demo_data()
        rings = get_ring_store()
        assert len(rings) == 5
        assert rings[0]["id"] == "RING-001"

    def test_all_entities_have_required_fields(self):
        """Every entity record must have all LoanRecord fields."""
        required = {
            "borrower_id", "borrower_name", "ssn_last4", "business_name",
            "ein", "business_address", "business_city", "business_state",
            "business_zip", "employee_count", "business_age_months",
            "loan_program", "loan_amount", "loan_date", "lender_name",
            "bank_routing", "bank_account", "naics_code", "industry",
            "fraud_label", "fraud_type",
        }
        _, entities = build_all_rings()
        for e in entities:
            missing = required - set(e.keys())
            assert not missing, f"Entity {e.get('borrower_name')} missing: {missing}"
