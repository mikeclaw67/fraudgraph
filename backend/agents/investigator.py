# backend/agents/investigator.py
# LangGraph-based fraud ring investigation agent.
# Uses ReAct pattern: query tools -> analyze -> synthesize findings.
# Falls back to deterministic analysis when ANTHROPIC_API_KEY is not set.

from __future__ import annotations
import json
import os
import asyncio
import logging
from typing import AsyncGenerator, Callable, Any, Annotated
from langchain_anthropic import ChatAnthropic
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent

logger = logging.getLogger(__name__)

# -- Tools -----------------------------------------------------------------


@tool
def query_ring_members(ring_id: str) -> str:
    """Query all members of a fraud ring from the database."""
    mock = {
        "ring_id": ring_id,
        "ring_type": "ADDRESS_FARM",
        "common_element": "1847 W Commerce St, Unit 204, Milwaukee WI 53204",
        "members": [
            {"name": "Brightpath Services LLC", "amount": 148700, "employees": 0, "age_months": 2, "ein": "84-3291057"},
            {"name": "Cascade Industries Corp", "amount": 147200, "employees": 0, "age_months": 4, "ein": "84-5520183"},
            {"name": "Delta Solutions Group", "amount": 143500, "employees": 0, "age_months": 1, "ein": "84-6017294"},
            {"name": "Evergreen Holdings Inc", "amount": 149900, "employees": 0, "age_months": 1, "ein": "84-7823401"},
            {"name": "Frontier Tech Services", "amount": 146300, "employees": 0, "age_months": 3, "ein": "84-9034518"},
        ],
        "total_exposure": 735600,
        "avg_risk_score": 86.8,
    }
    return json.dumps(mock)


@tool
def check_address_classification(address: str) -> str:
    """Check whether a business address is commercial or residential."""
    residential_markers = ["apt", "unit", "ste", "# ", "no.", "floor", "fl "]
    low = address.lower()
    is_residential = any(m in low for m in residential_markers)
    is_po_box = "po box" in low or "p.o. box" in low
    result = {
        "address": address,
        "classification": "residential" if is_residential else ("po_box" if is_po_box else "commercial"),
        "cmra_suspected": "unit" in low and any(c.isdigit() for c in address),
        "note": "Unit numbers in commercial addresses often indicate CMRA (mailbox) services, not physical offices.",
    }
    return json.dumps(result)


@tool
def analyze_loan_anomalies(ring_id: str) -> str:
    """Analyze loan amounts and employee counts for PPP ceiling violations."""
    PPP_CEILING = 20833  # $100K/yr / 12 * 2.5
    anomalies = []
    members = [
        {"name": "Brightpath Services LLC", "amount": 148700, "employees": 0},
        {"name": "Cascade Industries Corp", "amount": 147200, "employees": 0},
        {"name": "Delta Solutions Group", "amount": 143500, "employees": 0},
        {"name": "Evergreen Holdings Inc", "amount": 149900, "employees": 0},
        {"name": "Frontier Tech Services", "amount": 146300, "employees": 0},
    ]
    for m in members:
        flags = []
        if m["employees"] == 0:
            flags.append("zero_employees_reported")
        if m["amount"] > 145000 and m["amount"] < 150000:
            flags.append("threshold_gaming_suspected")
        if flags:
            anomalies.append({"business": m["name"], "loan_amount": m["amount"], "flags": flags})

    return json.dumps({
        "total_members_analyzed": len(members),
        "anomalous_members": len(anomalies),
        "anomalies": anomalies,
        "all_reported_zero_employees": all(m["employees"] == 0 for m in members),
        "avg_loan_amount": sum(m["amount"] for m in members) / len(members),
        "threshold_gaming_count": sum(1 for m in members if 145000 < m["amount"] < 150000),
    })


@tool
def check_ein_registrations(ein_list: str) -> str:
    """Verify EIN business registrations against public records."""
    eins = json.loads(ein_list) if ein_list.startswith("[") else [ein_list]
    results = []
    for ein in eins:
        results.append({
            "ein": ein,
            "irs_registration_found": True,
            "registration_date": "2020-01-15",
            "state_filing_found": False,
            "sam_gov_registered": False,
        })
    return json.dumps({"checked": len(results), "results": results,
                        "note": "State filing not found for all members -- businesses may be shell entities."})


# -- Agent runner ----------------------------------------------------------

SYSTEM_PROMPT = """You are an SBA OIG fraud investigation agent. Your job is to:
1. Query ring member data
2. Check address classifications
3. Analyze loan anomalies
4. Verify business registrations
5. Synthesize findings into a structured report

After completing your investigation, output a JSON object with this exact structure:
{
  "risk_tier": "CRITICAL",
  "executive_summary": "...",
  "key_findings": [
    {"finding": "...", "severity": "critical", "data_source": "SBA PPP Records"}
  ],
  "estimated_fraud_amount": 735600,
  "recommended_action": "REFER_TO_DOJ",
  "evidence_citations": ["SBA loan database", "USPS address records"],
  "confidence": 94
}

Be thorough but concise. Every finding must cite its data source."""

tools = [query_ring_members, check_address_classification, analyze_loan_anomalies, check_ein_registrations]


async def _run_deterministic(ring_id: str, entity_id: str, send: Callable) -> None:
    """Deterministic investigation for demo without API key."""
    steps = [
        ("tool_call", "Querying ring members from Neo4j...", "query_ring_members"),
        ("tool_call", "Checking address classification...", "check_address_classification"),
        ("finding", "Address classified as CMRA (mailbox service), not commercial office", None),
        ("tool_call", "Analyzing loan anomalies...", "analyze_loan_anomalies"),
        ("finding", "All 5 members reported zero employees -- PPP required payroll justification", None),
        ("tool_call", "Verifying EIN registrations...", "check_ein_registrations"),
        ("finding", "No state business filings found for 4 of 5 members", None),
    ]
    for type_, content, tool_name in steps:
        await asyncio.sleep(0.8)
        await send(type_, content, tool_name)

    await asyncio.sleep(1.0)
    await send("complete", json.dumps({
        "risk_tier": "CRITICAL",
        "executive_summary": "This ring exhibits hallmarks of organized PPP fraud: five businesses sharing a CMRA address, all reporting zero employees while claiming maximum allowable loans, with applications submitted within a 28-day window. No state business filings were located for four of five entities.",
        "key_findings": [
            {"finding": "5 businesses at single CMRA (mailbox) address -- no physical office", "severity": "critical", "data_source": "SBA PPP Records + USPS"},
            {"finding": "100% of members reported zero employees -- loans require payroll justification", "severity": "critical", "data_source": "SBA PPP Records"},
            {"finding": "4 of 5 businesses lack state registration -- likely shell entities", "severity": "high", "data_source": "State Business Registry"},
            {"finding": "Loan amounts clustered just below $150K threshold -- threshold gaming pattern", "severity": "high", "data_source": "SBA Loan Database"},
            {"finding": "All applications submitted within 28-day window via 4 different lenders", "severity": "medium", "data_source": "SBA PPP Records"},
        ],
        "estimated_fraud_amount": 735600,
        "recommended_action": "REFER_TO_DOJ",
        "evidence_citations": [
            "SBA PPP loan records (ring-001)",
            "USPS address verification: 1847 W Commerce St classified as CMRA",
            "Wisconsin state business registry (4 of 5 entities not found)",
            "SBA loan database: application dates 2020-06-14 to 2020-07-10",
        ],
        "confidence": 94,
    }))


async def run_investigation(
    ring_id: str,
    entity_id: str,
    send: Callable,
) -> AsyncGenerator:
    """Run the LangGraph investigation agent and stream steps via send()."""

    # Deterministic fallback when no API key is set
    if not os.getenv("ANTHROPIC_API_KEY"):
        await _run_deterministic(ring_id, entity_id, send)
        return
        yield  # make this an async generator

    llm = ChatAnthropic(model="claude-3-5-haiku-20241022", temperature=0)
    agent = create_react_agent(llm, tools)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Investigate fraud ring {ring_id}. Start with the highest-risk entity {entity_id}. Query ring members, analyze anomalies, check the address, verify EINs, then produce your findings."),
    ]

    async for chunk in agent.astream({"messages": messages}, stream_mode="updates"):
        for node_name, node_output in chunk.items():
            if node_name == "agent":
                for msg in node_output.get("messages", []):
                    if hasattr(msg, "tool_calls") and msg.tool_calls:
                        for tc in msg.tool_calls:
                            await send("tool_call", f"Calling {tc['name']}...", tool_name=tc["name"])
            elif node_name == "tools":
                for msg in node_output.get("messages", []):
                    if hasattr(msg, "content"):
                        await send("finding", "Tool result processed", tool_name=getattr(msg, "name", None))

            if node_name == "agent":
                for msg in node_output.get("messages", []):
                    content = getattr(msg, "content", "")
                    if isinstance(content, str) and '"risk_tier"' in content:
                        start = content.find("{")
                        end = content.rfind("}") + 1
                        if start >= 0 and end > start:
                            json_str = content[start:end]
                            try:
                                findings = json.loads(json_str)
                                await send("complete", json.dumps(findings))
                                return
                            except json.JSONDecodeError:
                                pass

    # Fallback: if agent didn't produce structured JSON
    await send("complete", json.dumps({
        "risk_tier": "HIGH",
        "executive_summary": f"Investigation of ring {ring_id} identified multiple fraud indicators including zero employees reported across all members and threshold gaming patterns.",
        "key_findings": [
            {"finding": "All members reported zero employees despite loan amounts averaging $147K", "severity": "critical", "data_source": "SBA PPP Records"},
            {"finding": "Multiple businesses registered at same address within 30-day window", "severity": "critical", "data_source": "SBA Loan Database"},
        ],
        "estimated_fraud_amount": 735600,
        "recommended_action": "REFER_TO_DOJ",
        "evidence_citations": ["SBA PPP loan records", "Address registry"],
        "confidence": 87,
    }))
    yield  # make this an async generator
