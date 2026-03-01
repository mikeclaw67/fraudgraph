# Task: Investigation Agent Backend — Sprint 6

Read CLAUDE.md first. Critical gap — UI button is live, backend is broken.

## What's Broken

backend/api/investigate.py imports from `backend.agent.investigator` — module does NOT exist.
First demo click = ImportError. Must fix before any demo.

Frontend connects to: ws://localhost:8000/api/investigate/ws/{ring_id}?entity_id={entity_id}

Frontend InvStep schema (must match exactly):
  { "step": number, "type": "tool_call"|"finding"|"complete"|"error", "content": string, "tool_name"?: string }

When type="complete": content = JSON.stringify(InvFindings)

InvFindings schema:
  { risk_tier, executive_summary, key_findings: [{finding, severity?, data_source?}],
    estimated_fraud_amount, recommended_action, evidence_citations?, confidence? }

## Files to Create / Fix

### 1. Fix backend/api/investigate.py
- Fix import: backend.agent.investigator -> backend.agents.investigator
- Rewrite WebSocket handler to use a send() callback pattern
- send() increments step counter and sends: {"step": N, "type": ..., "content": ..., "tool_name": ...}
- Remove the hard 503 error on missing API key (let the fallback handle it)

### 2. Create backend/agents/__init__.py (empty)

### 3. Create backend/agents/investigator.py
Full spec at: /Users/mikeclaw/.openclaw/workspace/vault/research/findings/2026-03-01-investigation-agent-backend.md
Copy that file's implementation EXACTLY. Key requirements:
- _run_deterministic() fallback when ANTHROPIC_API_KEY not set
- Streams 7 fake steps with 0.8s delays (use asyncio.sleep)
- Final complete event has full InvFindings JSON with confidence=94
- Real agent: LangGraph ReAct with claude-3-5-haiku-20241022
- Tools: query_ring_members, check_address_classification, analyze_loan_anomalies, check_ein_registrations

### 4. Update requirements.txt (backend)
Add: langgraph>=1.0.0, langchain-anthropic>=0.3.0, langchain-core>=0.3.0, websockets>=12.0

### 5. Update docker-compose.yml
Add ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY} to backend environment section

## Verification Steps

cd /Users/mikeclaw/Projects/fraudgraph
python -c "from backend.agents.investigator import run_investigation; print('import OK')"
python -c "from backend.api.investigate import router; print('routes:', len(router.routes))"

## Done

Write to progress.md: FORGE_DONE: Investigation agent backend complete. Demo fallback wired.
Then: git add -A && git commit -m "feat: LangGraph investigation agent backend with demo fallback" && git push origin main
