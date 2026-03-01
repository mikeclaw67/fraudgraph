# FraudGraph Investigation Agent — LangGraph StateGraph agent that investigates
# fraud alerts using multi-step tool calls. Modeled after Palantir AIP's
# investigation workflow: gather evidence, reason about connections, produce
# a structured prosecution-ready output with full citation trail.
#
# Architecture: Plan-Execute loop with anti-early-stopping. Agent keeps
# investigating until all leads are exhausted, not just until first finding.

from __future__ import annotations

import json
import os
from typing import Annotated, Any, AsyncGenerator

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class InvestigationState(TypedDict):
    messages: Annotated[list, add_messages]
    alert_id: str
    findings: list[dict]
    tool_calls_made: int
    investigation_complete: bool


# ---------------------------------------------------------------------------
# Mock data store (replaced by real DB queries in production)
# These return realistic PPP fraud data matching the 5 embedded scenarios.
# ---------------------------------------------------------------------------

MOCK_RECORDS: dict[str, Any] = {
    "PROV-999": {
        "entity_id": "PROV-999", "type": "provider",
        "name": "Zombie Billing LLC", "ein": "99-9999999",
        "address": "123 Ghost Ave, Minneapolis MN 55401",
        "employee_count": 2, "business_age_months": 8,
        "loan_amount": 148500, "loan_program": "PPP",
        "bank_routing": "091000019", "bank_account": "****4321",
        "fraud_type": "zombie_billing",
        "anomaly_score": 91,
        "claims": [
            {"claim_id": "CLM-001", "beneficiary_id": "BEN-DEAD-001",
             "procedure_code": "99213", "billed": 450, "date": "2021-03-15",
             "note": "Beneficiary deceased 2020-11-01"},
            {"claim_id": "CLM-002", "beneficiary_id": "BEN-DEAD-002",
             "procedure_code": "99214", "billed": 680, "date": "2021-04-02",
             "note": "Beneficiary deceased 2020-08-14"},
        ],
        "deceased_beneficiaries": 12,
    },
    "ORG-101": {
        "entity_id": "ORG-101", "type": "organization",
        "name": "Shell Alpha LLC", "ein": "88-1010101",
        "address": "456 Phantom Blvd, St Paul MN 55102",
        "employee_count": 0, "business_age_months": 3,
        "loan_amount": 149000, "loan_program": "PPP",
        "bank_routing": "091000019", "bank_account": "****7890",
        "connected_orgs": ["ORG-102", "ORG-103", "ORG-104", "ORG-105", "ORG-106"],
        "shared_element": "Same registered agent: John Doe, 789 Broker St",
    },
    "PROV-847": {
        "entity_id": "PROV-847", "type": "provider",
        "name": "Volume King Medical", "ein": "77-8478478",
        "address": "321 Billing Blvd, Duluth MN 55802",
        "employee_count": 1, "business_age_months": 14,
        "loan_amount": 147200, "loan_program": "PPP",
        "bank_routing": "091000022", "bank_account": "****1122",
        "daily_claims": 31.4,
        "max_possible_daily": 14.0,
        "anomaly_score": 97,
        "impossible_volume": True,
    },
    "RING-001": {
        "ring_id": "RING-001",
        "ring_type": "ADDRESS_FARM",
        "common_element": "123 Main St, Milwaukee WI 53202",
        "member_count": 47,
        "total_exposure": 6820000,
        "avg_risk_score": 94,
        "members": [f"BUS-{i:04d}" for i in range(1, 48)],
        "fraud_pattern": "Multiple businesses filed from same address — classic address farm",
    },
    "RING-002": {
        "ring_id": "RING-002",
        "ring_type": "ACCOUNT_CLUSTER",
        "common_element": "Bank routing 091000019",
        "member_count": 10,
        "total_exposure": 1485000,
        "avg_risk_score": 88,
        "members": ["ORG-101", "ORG-102", "ORG-103", "ORG-104", "ORG-105",
                    "ORG-106", "BUS-0101", "BUS-0102", "BUS-0103", "BUS-0104"],
        "fraud_pattern": "Shell company cluster — same bank routing, same registered agent",
    },
}

FRAUD_PATTERNS = [
    {"pattern_id": "ZOMBIE_BILLING", "name": "Zombie Billing",
     "description": "Provider billing for deceased beneficiaries — claims submitted after patient death date"},
    {"pattern_id": "SHELL_CLUSTER", "name": "Shell Company Cluster",
     "description": "Multiple entities sharing common registration elements — registered agent, address, bank account"},
    {"pattern_id": "IMPOSSIBLE_VOLUME", "name": "Impossible Daily Volume",
     "description": "Provider billing more hours/visits per day than physically possible (>14 hours)"},
    {"pattern_id": "CROSS_STATE_DUPE", "name": "Cross-State Duplicate",
     "description": "Beneficiary receiving services in multiple states simultaneously"},
    {"pattern_id": "THRESHOLD_GAMING", "name": "Threshold Gaming",
     "description": "Loan amounts clustered just below $150K SBA review threshold"},
]


# ---------------------------------------------------------------------------
# Tools — 8 investigative tools matching T1.2 in IMPLEMENTATION_PLAN.md
# ---------------------------------------------------------------------------

@tool
def get_entity_profile(entity_id: str) -> str:
    """Get full profile for a provider, organization, or borrower entity.
    Returns risk score, basic info, loan details, and known fraud indicators."""
    record = MOCK_RECORDS.get(entity_id)
    if not record:
        return json.dumps({"error": f"Entity {entity_id} not found", "entity_id": entity_id})
    return json.dumps(record, default=str)


@tool
def get_entity_claims(entity_id: str) -> str:
    """Get claims or transactions filed by an entity. Flags anomalies like
    deceased beneficiaries, impossible volumes, duplicate billing."""
    record = MOCK_RECORDS.get(entity_id, {})
    claims = record.get("claims", [])
    anomalies = []
    if record.get("deceased_beneficiaries", 0) > 0:
        anomalies.append({
            "type": "DECEASED_PATIENT_BILLING",
            "count": record["deceased_beneficiaries"],
            "detail": f"{record['deceased_beneficiaries']} claims submitted after beneficiary death date"
        })
    if record.get("impossible_volume"):
        anomalies.append({
            "type": "IMPOSSIBLE_DAILY_VOLUME",
            "daily_claims": record.get("daily_claims"),
            "max_possible": record.get("max_possible_daily"),
            "detail": f"Provider averaged {record.get('daily_claims')} claims/day — max possible is {record.get('max_possible_daily')}"
        })
    return json.dumps({"entity_id": entity_id, "claims": claims, "anomalies": anomalies}, default=str)


@tool
def get_entity_network(entity_id: str, depth: int = 2) -> str:
    """Get network graph of entities connected to this entity via shared
    identifiers (address, EIN, bank account, registered agent). Critical for
    ring detection — finds the full fraud cluster."""
    record = MOCK_RECORDS.get(entity_id, {})
    connected = record.get("connected_orgs", [])
    shared = record.get("shared_element", "No shared identifiers found")

    # Find which ring this entity belongs to
    rings = []
    for ring_id, ring in MOCK_RECORDS.items():
        if ring.get("ring_id") and entity_id in ring.get("members", []):
            rings.append({"ring_id": ring_id, "type": ring["ring_type"],
                         "total_exposure": ring["total_exposure"],
                         "member_count": ring["member_count"]})

    return json.dumps({
        "entity_id": entity_id,
        "depth": depth,
        "connected_entities": connected,
        "shared_identifier": shared,
        "rings": rings,
        "connection_count": len(connected),
    }, default=str)


@tool
def get_anomaly_score(entity_id: str) -> str:
    """Get ML anomaly score (0-100) comparing this entity to peer group.
    High scores (>80) indicate statistical outliers worth investigating."""
    record = MOCK_RECORDS.get(entity_id, {})
    score = record.get("anomaly_score", 50)
    peer_avg = 23
    return json.dumps({
        "entity_id": entity_id,
        "anomaly_score": score,
        "peer_group_avg": peer_avg,
        "percentile": min(99, int(score * 1.05)),
        "interpretation": "CRITICAL outlier" if score > 85 else "HIGH outlier" if score > 70 else "Within normal range",
        "top_anomalous_features": [
            {"feature": "loan_amount_to_employees_ratio", "z_score": 4.2},
            {"feature": "business_age_at_application", "z_score": 3.8},
        ] if score > 70 else []
    }, default=str)


@tool
def get_referral_patterns(entity_id: str) -> str:
    """Analyze referral patterns — who referred patients/borrowers to this entity.
    Kickback rings show as tight referral clusters."""
    return json.dumps({
        "entity_id": entity_id,
        "referral_concentration": 0.87,
        "top_referrers": [
            {"referrer_id": "PROV-303", "referral_count": 142, "pct_of_total": 0.43},
            {"referrer_id": "PROV-305", "referral_count": 89, "pct_of_total": 0.27},
        ],
        "interpretation": "HIGH concentration — 70% of referrals from 2 sources suggests kickback arrangement",
    }, default=str)


@tool
def search_fraud_patterns(query: str) -> str:
    """Semantic search of known fraud patterns database. Use to identify
    which established fraud taxonomy applies to observed evidence."""
    query_lower = query.lower()
    results = []
    for p in FRAUD_PATTERNS:
        if any(kw in query_lower for kw in
               ["dead", "deceased", "zombie", "death", "billing after"]):
            if p["pattern_id"] == "ZOMBIE_BILLING":
                results.append(p)
        if any(kw in query_lower for kw in
               ["shell", "cluster", "registered agent", "same address", "multiple"]):
            if p["pattern_id"] == "SHELL_CLUSTER":
                results.append(p)
        if any(kw in query_lower for kw in
               ["volume", "hours", "impossible", "too many", "per day"]):
            if p["pattern_id"] == "IMPOSSIBLE_VOLUME":
                results.append(p)
        if any(kw in query_lower for kw in
               ["threshold", "150", "149", "gaming", "just below"]):
            if p["pattern_id"] == "THRESHOLD_GAMING":
                results.append(p)
    if not results:
        results = FRAUD_PATTERNS[:2]
    return json.dumps({"query": query, "matches": results[:3]}, default=str)


@tool
def get_ring_detail(ring_id: str) -> str:
    """Get full detail on a detected fraud ring including all members,
    common element, total exposure, and detection confidence."""
    ring = MOCK_RECORDS.get(ring_id)
    if not ring or not ring.get("ring_id"):
        return json.dumps({"error": f"Ring {ring_id} not found"})
    return json.dumps(ring, default=str)


@tool
def escalate_alert(alert_id: str, risk_tier: str, narrative: str, estimated_amount: float) -> str:
    """Escalate alert to senior investigator with risk tier, narrative, and
    estimated fraud amount. This is the ACTION that closes the investigation loop."""
    return json.dumps({
        "status": "ESCALATED",
        "alert_id": alert_id,
        "risk_tier": risk_tier,
        "narrative": narrative[:200],
        "estimated_fraud_amount": estimated_amount,
        "assigned_to": "Senior Investigator Queue",
        "escalation_id": f"ESC-{alert_id}-{risk_tier}",
        "message": f"Alert {alert_id} escalated as {risk_tier} with ${estimated_amount:,.0f} estimated exposure",
    }, default=str)


TOOLS = [
    get_entity_profile,
    get_entity_claims,
    get_entity_network,
    get_anomaly_score,
    get_referral_patterns,
    search_fraud_patterns,
    get_ring_detail,
    escalate_alert,
]

TOOL_MAP = {t.name: t for t in TOOLS}

# ---------------------------------------------------------------------------
# System prompt — anti-early-stopping, evidence-based, Palantir-style
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an elite fraud investigator at the SBA Office of Inspector General.
Your job: investigate this fraud alert thoroughly and produce a prosecution-ready case report.

## Investigation Protocol (Non-Negotiable)

1. START broad — get the entity profile first to understand what you're dealing with
2. FOLLOW every lead — if you find deceased beneficiaries, get the full claims list
3. NEVER stop at the first finding — keep investigating until ALL leads are exhausted
4. CHECK the network — fraud is never isolated, always look for connected entities
5. SEARCH fraud patterns — identify which established taxonomy applies
6. QUANTIFY — estimate total fraud amount with specific dollar figures
7. ESCALATE — always end by escalating with your findings

## Anti-Early-Stopping Rules
- Minimum 6 tool calls before considering your investigation complete
- If you find one anomaly, check for 2 more before concluding
- Network connections MUST be checked for every entity
- Anomaly score MUST be checked for every primary entity
- Do NOT say "investigation complete" until you have dollar estimates

## Output Format (final response only)
Return a JSON object with EXACTLY these fields:
{
  "risk_tier": "CRITICAL|HIGH|MEDIUM|LOW",
  "confidence": 0-100,
  "executive_summary": "2-3 sentences for a jury",
  "key_findings": [
    {"finding": "...", "data_source": "tool_name:entity_id", "severity": "CRITICAL|HIGH|MEDIUM"}
  ],
  "estimated_fraud_amount": 123456.78,
  "recommended_action": "ESCALATE_TO_DOJ|ESCALATE_TO_SENIOR|FURTHER_INVESTIGATION|DISMISS",
  "evidence_citations": ["entity_id:field_name = value", ...]
}

Every finding MUST have a data_source. No unsourced claims."""


# ---------------------------------------------------------------------------
# LangGraph Agent
# ---------------------------------------------------------------------------

def build_agent():
    """Build and return the LangGraph investigation agent."""
    llm = ChatAnthropic(
        model="claude-sonnet-4-5",
        api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
        temperature=0,
    ).bind_tools(TOOLS)

    def should_continue(state: InvestigationState) -> str:
        messages = state["messages"]
        last = messages[-1]
        if isinstance(last, AIMessage) and last.tool_calls:
            return "tools"
        return END

    def call_model(state: InvestigationState) -> InvestigationState:
        messages = state["messages"]
        response = llm.invoke(messages)
        return {
            "messages": [response],
            "tool_calls_made": state.get("tool_calls_made", 0) + 1,
        }

    def call_tools(state: InvestigationState) -> InvestigationState:
        messages = state["messages"]
        last = messages[-1]
        tool_messages = []
        for tool_call in last.tool_calls:
            fn = TOOL_MAP.get(tool_call["name"])
            if fn:
                result = fn.invoke(tool_call["args"])
                tool_messages.append(ToolMessage(
                    content=str(result),
                    tool_call_id=tool_call["id"],
                ))
            else:
                tool_messages.append(ToolMessage(
                    content=json.dumps({"error": f"Unknown tool: {tool_call['name']}"}),
                    tool_call_id=tool_call["id"],
                ))
        return {"messages": tool_messages}

    graph = StateGraph(InvestigationState)
    graph.add_node("agent", call_model)
    graph.add_node("tools", call_tools)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue)
    graph.add_edge("tools", "agent")

    return graph.compile()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def investigate(alert_id: str, entity_id: str) -> dict:
    """Run a full investigation on an alert. Returns structured findings."""
    agent = build_agent()
    initial_state = {
        "messages": [
            HumanMessage(content=f"{SYSTEM_PROMPT}\n\nInvestigate alert {alert_id} for entity {entity_id}. "
                        f"Start by getting the entity profile for {entity_id}, then follow all leads.")
        ],
        "alert_id": alert_id,
        "findings": [],
        "tool_calls_made": 0,
        "investigation_complete": False,
    }
    final_state = await agent.ainvoke(initial_state)
    last_message = final_state["messages"][-1]
    content = last_message.content if hasattr(last_message, "content") else str(last_message)

    # Try to extract JSON from response
    try:
        # Find JSON block
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "{" in content:
            start = content.index("{")
            end = content.rindex("}") + 1
            content = content[start:end]
        result = json.loads(content)
    except Exception:
        result = {
            "risk_tier": "HIGH",
            "confidence": 70,
            "executive_summary": content[:300],
            "key_findings": [],
            "estimated_fraud_amount": 0,
            "recommended_action": "FURTHER_INVESTIGATION",
            "evidence_citations": [],
        }

    result["alert_id"] = alert_id
    result["entity_id"] = entity_id
    result["tool_calls_made"] = final_state.get("tool_calls_made", 0)
    return result


async def investigate_stream(alert_id: str, entity_id: str) -> AsyncGenerator[str, None]:
    """Stream investigation steps as JSON lines for WebSocket endpoint."""
    agent = build_agent()
    initial_state = {
        "messages": [
            HumanMessage(content=f"{SYSTEM_PROMPT}\n\nInvestigate alert {alert_id} for entity {entity_id}. "
                        f"Start by getting the entity profile for {entity_id}, then follow all leads.")
        ],
        "alert_id": alert_id,
        "findings": [],
        "tool_calls_made": 0,
        "investigation_complete": False,
    }

    step = 0
    async for event in agent.astream(initial_state):
        for node_name, node_output in event.items():
            messages = node_output.get("messages", [])
            for msg in messages:
                if isinstance(msg, AIMessage) and msg.tool_calls:
                    for tc in msg.tool_calls:
                        step += 1
                        yield json.dumps({
                            "step": step,
                            "type": "tool_call",
                            "tool_name": tc["name"],
                            "content": f"Calling {tc['name']} with {json.dumps(tc['args'])[:100]}",
                        }) + "\n"
                elif isinstance(msg, ToolMessage):
                    yield json.dumps({
                        "step": step,
                        "type": "finding",
                        "content": msg.content[:200],
                    }) + "\n"
                elif isinstance(msg, AIMessage) and not msg.tool_calls:
                    yield json.dumps({
                        "step": step + 1,
                        "type": "complete",
                        "content": msg.content,
                    }) + "\n"
