# Agent scenario tests — verifies the investigation agent correctly identifies
# all 5 embedded fraud scenarios. These are integration tests that run the
# full LangGraph agent against known planted fraud cases.

from __future__ import annotations

import asyncio
import pytest
from unittest.mock import patch
import os


# Skip if no API key
pytestmark = pytest.mark.skipif(
    not os.environ.get("ANTHROPIC_API_KEY"),
    reason="ANTHROPIC_API_KEY not set — skipping live agent tests"
)


@pytest.fixture
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.mark.asyncio
async def test_zombie_billing_scenario():
    """Agent must find ZOMBIE_BILLING pattern for PROV-999."""
    from backend.agent.investigator import investigate
    result = await investigate("ALERT-ZOMBIE-001", "PROV-999")

    assert result["risk_tier"] in ("CRITICAL", "HIGH"), \
        f"Expected HIGH+ risk for zombie billing, got {result['risk_tier']}"
    findings_text = str(result.get("key_findings", [])).lower()
    assert any(kw in findings_text for kw in ["dead", "deceased", "zombie", "death"]), \
        "Agent failed to identify deceased patient billing"
    assert result.get("estimated_fraud_amount", 0) > 0, \
        "Agent must estimate fraud amount"
    assert result.get("tool_calls_made", 0) >= 4, \
        f"Agent made only {result.get('tool_calls_made')} tool calls — insufficient investigation"


@pytest.mark.asyncio
async def test_shell_cluster_scenario():
    """Agent must find shell company cluster for ORG-101."""
    from backend.agent.investigator import investigate
    result = await investigate("ALERT-SHELL-001", "ORG-101")

    assert result["risk_tier"] in ("CRITICAL", "HIGH"), \
        f"Expected HIGH+ risk for shell cluster, got {result['risk_tier']}"
    findings_text = str(result.get("key_findings", [])).lower()
    assert any(kw in findings_text for kw in ["shell", "cluster", "connected", "network", "registered"]), \
        "Agent failed to identify shell company cluster"
    citations = str(result.get("evidence_citations", []))
    assert "ORG-10" in citations or "connected" in findings_text.lower(), \
        "Agent must cite specific connected entities"


@pytest.mark.asyncio
async def test_impossible_volume_scenario():
    """Agent must flag impossible daily claim volume for PROV-847."""
    from backend.agent.investigator import investigate
    result = await investigate("ALERT-VOLUME-001", "PROV-847")

    assert result["risk_tier"] in ("CRITICAL", "HIGH"), \
        f"Expected HIGH+ risk for impossible volume, got {result['risk_tier']}"
    findings_text = str(result.get("key_findings", [])).lower()
    assert any(kw in findings_text for kw in ["volume", "impossible", "daily", "hours", "31", "14"]), \
        "Agent failed to identify impossible billing volume"


@pytest.mark.asyncio  
async def test_ring_detection_scenario():
    """Agent must detect the ADDRESS_FARM ring and quantify exposure."""
    from backend.agent.investigator import investigate
    result = await investigate("ALERT-RING-001", "RING-001")

    assert result["risk_tier"] in ("CRITICAL", "HIGH"), \
        f"Expected HIGH+ risk for fraud ring, got {result['risk_tier']}"
    assert result.get("estimated_fraud_amount", 0) >= 100000, \
        f"Ring exposure should be >$100K, got {result.get('estimated_fraud_amount')}"


@pytest.mark.asyncio
async def test_minimum_tool_calls():
    """All investigations must make at least 6 tool calls (anti-early-stopping)."""
    from backend.agent.investigator import investigate
    result = await investigate("ALERT-TEST-001", "PROV-999")

    assert result.get("tool_calls_made", 0) >= 6, \
        f"Agent only made {result.get('tool_calls_made')} tool calls — anti-early-stopping violated"


@pytest.mark.asyncio
async def test_structured_output_format():
    """All required output fields must be present and correctly typed."""
    from backend.agent.investigator import investigate
    result = await investigate("ALERT-FORMAT-001", "PROV-999")

    required_fields = ["risk_tier", "confidence", "executive_summary",
                       "key_findings", "estimated_fraud_amount", "recommended_action"]
    for field in required_fields:
        assert field in result, f"Missing required field: {field}"

    assert result["risk_tier"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW"), \
        f"Invalid risk_tier: {result['risk_tier']}"
    assert 0 <= result.get("confidence", -1) <= 100, \
        f"Confidence must be 0-100, got {result.get('confidence')}"
    assert isinstance(result.get("key_findings"), list), \
        "key_findings must be a list"
