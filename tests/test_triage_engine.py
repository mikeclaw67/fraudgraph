# Tests for the triage engine — ring classification and auto-case creation.
# S3: Sprint 8 implementation.

import pytest

from backend.detection.triage_engine import _classify, apply_ring_triage
from backend.api.cases import _case_store


@pytest.fixture(autouse=True)
def clear_case_store():
    """Clear the case store before each test."""
    _case_store.clear()
    yield
    _case_store.clear()


class TestClassify:
    """Test the _classify function tier logic."""
    
    def test_ring_002_critical(self):
        """RING-002 ($1.5M, risk 91) should be CRITICAL."""
        tier = _classify(91, 1_500_000)
        assert tier == "CRITICAL"
    
    def test_high_risk_only(self):
        """Ring at $499K, risk 65 should be HIGH (risk qualifies but not exposure for CRITICAL)."""
        tier = _classify(65, 499_000)
        assert tier == "HIGH"
    
    def test_high_exposure_only(self):
        """Ring with exposure >= $500K but risk < 85 should be HIGH."""
        tier = _classify(60, 500_000)
        assert tier == "HIGH"
    
    def test_medium_tier(self):
        """Ring at $200K, risk 45 should be MEDIUM."""
        tier = _classify(45, 200_000)
        assert tier == "MEDIUM"
    
    def test_low_tier(self):
        """Ring at $10K, risk 20 should be LOW."""
        tier = _classify(20, 10_000)
        assert tier == "LOW"
    
    def test_edge_case_critical_exactly(self):
        """Ring at exactly $1.5M and risk 85 should be CRITICAL."""
        tier = _classify(85, 1_500_000)
        assert tier == "CRITICAL"
    
    def test_edge_case_just_below_critical(self):
        """Ring at $1.499M and risk 85 should be HIGH (exposure just below)."""
        tier = _classify(85, 1_499_000)
        assert tier == "HIGH"
    
    def test_edge_case_risk_40(self):
        """Risk exactly 40 should be MEDIUM."""
        tier = _classify(40, 100_000)
        assert tier == "MEDIUM"
    
    def test_edge_case_risk_39(self):
        """Risk 39 should be LOW."""
        tier = _classify(39, 100_000)
        assert tier == "LOW"
    
    def test_edge_case_risk_65(self):
        """Risk exactly 65 should be HIGH."""
        tier = _classify(65, 100_000)
        assert tier == "HIGH"


class TestApplyRingTriage:
    """Test the full apply_ring_triage function."""
    
    def test_critical_ring_creates_case(self):
        """CRITICAL ring should have autoCaseId set and case created."""
        rings = [{
            "id": "ring_test",
            "name": "Test Critical Ring",
            "risk_score": 90,
            "total_exposure": 2_000_000,
            "ring_type": "STRAW_COMPANY",
        }]
        
        result = apply_ring_triage(rings)
        
        assert result[0]["triageTier"] == "CRITICAL"
        assert result[0]["autoCaseId"] is not None
        assert result[0]["autoAssigned"] is True
        assert result[0]["assignedTo"] == "alice"
        
        # Case should be created in store
        assert len(_case_store) == 1
        case = _case_store[0]
        assert case["ring_id"] == "ring_test"
        assert case["assigned_to"] == "alice"
        assert "AUTO_CASE_CREATED" in case["audit_trail"][0]["action"]
    
    def test_high_ring_no_case(self):
        """HIGH ring should not have autoCaseId set."""
        rings = [{
            "id": "ring_high",
            "name": "Test High Ring",
            "risk_score": 70,
            "total_exposure": 300_000,
        }]
        
        result = apply_ring_triage(rings)
        
        assert result[0]["triageTier"] == "HIGH"
        assert result[0]["autoCaseId"] is None
        assert result[0]["assignedTo"] == "bob"
        assert len(_case_store) == 0
    
    def test_existing_assignee_preserved(self):
        """Existing assignee should not be overwritten."""
        rings = [{
            "id": "ring_assigned",
            "name": "Test Assigned Ring",
            "risk_score": 50,
            "total_exposure": 100_000,
            "assigned_to": "existing_investigator",
        }]
        
        result = apply_ring_triage(rings)
        
        assert result[0]["assignedTo"] == "existing_investigator"
        assert result[0]["autoAssigned"] is False
    
    def test_multiple_rings_mixed_tiers(self):
        """Test triaging multiple rings at once."""
        rings = [
            {"id": "r1", "name": "Critical", "risk_score": 90, "total_exposure": 2_000_000},
            {"id": "r2", "name": "High", "risk_score": 70, "total_exposure": 200_000},
            {"id": "r3", "name": "Medium", "risk_score": 45, "total_exposure": 100_000},
            {"id": "r4", "name": "Low", "risk_score": 20, "total_exposure": 50_000},
        ]
        
        result = apply_ring_triage(rings)
        
        assert result[0]["triageTier"] == "CRITICAL"
        assert result[1]["triageTier"] == "HIGH"
        assert result[2]["triageTier"] == "MEDIUM"
        assert result[3]["triageTier"] == "LOW"
        
        # Only CRITICAL creates a case
        assert len(_case_store) == 1
        assert _case_store[0]["ring_id"] == "r1"
