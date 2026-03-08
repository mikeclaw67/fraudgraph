# Tests for alert deduplication — entity_id dedup keeping highest risk_score.
# S3: Sprint 8 implementation.

import pytest
from backend.detection.alerts import deduplicate_alerts, Alert, AlertStatus, TriageAction


class TestDeduplicateAlerts:
    """Test the deduplicate_alerts function."""
    
    def test_same_entity_keeps_highest_risk(self):
        """Same entity_id should keep only the highest risk_score."""
        alerts = [
            {"entity_id": "ent_001", "risk_score": 50, "alert_id": "a1"},
            {"entity_id": "ent_001", "risk_score": 80, "alert_id": "a2"},
            {"entity_id": "ent_001", "risk_score": 60, "alert_id": "a3"},
        ]
        
        result = deduplicate_alerts(alerts)
        
        assert len(result) == 1
        assert result[0]["risk_score"] == 80
        assert result[0]["alert_id"] == "a2"
    
    def test_unique_entities_all_kept(self):
        """Different entity_ids should all be kept."""
        alerts = [
            {"entity_id": "ent_001", "risk_score": 50, "alert_id": "a1"},
            {"entity_id": "ent_002", "risk_score": 60, "alert_id": "a2"},
            {"entity_id": "ent_003", "risk_score": 70, "alert_id": "a3"},
        ]
        
        result = deduplicate_alerts(alerts)
        
        assert len(result) == 3
    
    def test_empty_list_returns_empty(self):
        """Empty list should return empty list without crashing."""
        result = deduplicate_alerts([])
        
        assert result == []
    
    def test_sorted_by_risk_descending(self):
        """Result should be sorted by risk_score descending."""
        alerts = [
            {"entity_id": "ent_001", "risk_score": 30, "alert_id": "a1"},
            {"entity_id": "ent_002", "risk_score": 90, "alert_id": "a2"},
            {"entity_id": "ent_003", "risk_score": 60, "alert_id": "a3"},
        ]
        
        result = deduplicate_alerts(alerts)
        
        assert result[0]["risk_score"] == 90
        assert result[1]["risk_score"] == 60
        assert result[2]["risk_score"] == 30
    
    def test_mixed_with_duplicates(self):
        """Mix of duplicates and unique entities."""
        alerts = [
            {"entity_id": "ent_001", "risk_score": 50, "alert_id": "a1"},
            {"entity_id": "ent_002", "risk_score": 70, "alert_id": "a2"},
            {"entity_id": "ent_001", "risk_score": 80, "alert_id": "a3"},  # higher than a1
            {"entity_id": "ent_003", "risk_score": 40, "alert_id": "a4"},
        ]
        
        result = deduplicate_alerts(alerts)
        
        assert len(result) == 3
        entity_ids = [a["entity_id"] for a in result]
        assert "ent_001" in entity_ids
        assert "ent_002" in entity_ids
        assert "ent_003" in entity_ids
        
        # ent_001 should have the higher score
        ent_001 = next(a for a in result if a["entity_id"] == "ent_001")
        assert ent_001["risk_score"] == 80
    
    def test_handles_alert_objects(self):
        """Should work with Alert dataclass objects, not just dicts."""
        alerts = [
            Alert(
                alert_id="a1",
                entity_id="ent_001",
                entity_type="Borrower",
                risk_score=50.0,
                severity="MEDIUM",
                fired_rules=["RULE_1"],
                status=AlertStatus.NEW,
                triage_action=TriageAction.REVIEW_GRAPH,
                created_at="2025-01-01T00:00:00Z",
            ),
            Alert(
                alert_id="a2",
                entity_id="ent_001",
                entity_type="Borrower",
                risk_score=80.0,
                severity="HIGH",
                fired_rules=["RULE_1", "RULE_2"],
                status=AlertStatus.NEW,
                triage_action=TriageAction.ESCALATE,
                created_at="2025-01-01T00:00:00Z",
            ),
        ]
        
        result = deduplicate_alerts(alerts)
        
        assert len(result) == 1
        assert result[0].risk_score == 80.0
        assert result[0].alert_id == "a2"
    
    def test_missing_entity_id_skipped(self):
        """Alerts without entity_id should be skipped."""
        alerts = [
            {"entity_id": "ent_001", "risk_score": 50, "alert_id": "a1"},
            {"risk_score": 90, "alert_id": "a2"},  # no entity_id
            {"entity_id": None, "risk_score": 80, "alert_id": "a3"},  # None entity_id
        ]
        
        result = deduplicate_alerts(alerts)
        
        assert len(result) == 1
        assert result[0]["entity_id"] == "ent_001"
