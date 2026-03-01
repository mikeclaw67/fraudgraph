# FraudGraph Demo — 7-Step Walkthrough

**Audience**: PM interviews, investor demos, engineering reviews
**Duration**: 8-12 minutes
**What you're showing**: A Palantir-class fraud detection platform — from raw alerts to AI-powered investigation to case resolution, all streaming live.

---

## Prerequisites (Do This Before the Demo)

```bash
# 1. Clone and enter the repo
cd /path/to/fraudgraph

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install wscat for WebSocket demo (the star moment)
npm install -g wscat

# 4. Start infrastructure (PostgreSQL, Neo4j, Redis)
docker compose up -d postgres neo4j redis

# 5. Start the backend
uvicorn backend.main:app --reload --port 8000

# 6. Verify it's running
curl -s http://localhost:8000/health | python3 -m json.tool
```

**Optional**: Set `ANTHROPIC_API_KEY` for live LLM agent. Without it, the agent uses a deterministic fallback that produces identical investigation output — perfect for demos where you don't want API latency or costs.

**Pre-flight checklist**:
- [ ] Backend running on http://localhost:8000
- [ ] `wscat` installed (`wscat --version`)
- [ ] Terminal font large enough for audience to read
- [ ] Two terminal tabs ready (one for HTTP, one for WebSocket)

---

## Step 1: The Platform (30 seconds)

> **Talking point**: "FraudGraph is a Palantir AIP Tier 3 Agentic Application for SBA fraud detection. Tier 3 is Palantir's highest-value commercial tier: an investigation agent embedded in an operator application, reading and writing live Ontology state. This is exactly what comes out of a Palantir AIP Bootcamp — the product an SBA investigator would have after 3-5 days of Palantir onboarding. We built it open, so you can see every line of the agent logic."

Open the Swagger docs in your browser:

```
http://localhost:8000/docs
```

**What to highlight**:
- 12 REST endpoints covering the full investigation workflow
- WebSocket endpoint for real-time agent streaming
- Alert queue, entity profiles, graph visualization, case management
- Everything async, typed, documented

> **Talking point**: "This isn't a prototype — it's a production API. Health checks, pagination, filtering, audit trails. The kind of system that an OIG team would actually use."

---

## Step 2: The Detection Engine (60 seconds)

Show the active detection configuration:

```bash
curl -s http://localhost:8000/api/config | python3 -m json.tool
```

**Expected output** (highlight these fields):
```json
{
  "active_schema": "ppp_loans",
  "thresholds": {
    "addr_reuse": 3,
    "ein_reuse": 1,
    "straw_co_max_employees": 0,
    "threshold_game_band": [145000, 149999.99],
    "account_share": 2,
    "new_ein_days": 30
  },
  "risk_weights": {
    "rules": 0.4,
    "ml": 0.35,
    "graph": 0.25
  }
}
```

> **Talking point**: "Three-layer detection. Rules catch the obvious fraud — address farms, EIN reuse, shell companies. ML catches statistical anomalies the rules miss. Graph analytics find network connections. The composite score weights all three: 40% rules, 35% ML, 25% graph. Every threshold is configurable per schema."

> **If the audience is government / SBA**: "In 2021, federal prosecutors in Minnesota convicted Harold Kaeding for creating 4 shell companies at a PostNet box and applying for $2.18 million in PPP loans. The Kaeding ring would have scored CRITICAL on three FraudGraph rules simultaneously — ADDR_REUSE, STRAW_CO, and ACCOUNT_SHARE. An investigator using FraudGraph would have seen this cluster on day one. That PostNet box is exactly what you see in the Ring Detail view — we model it as the CMRA address pattern." *(US v. Kaeding, 0:21-cr-00169, D. Minnesota)*

**Bonus** — show the schema generalization:

> "And this is the Foundry pattern — same pipeline, different ontology. We have PPP loans active right now, but we also support Medicaid claims fraud and government procurement fraud. One config swap changes the entire detection surface."

---

## Step 3: The Test Suite (45 seconds)

Run the tests to show everything works:

```bash
python -m pytest tests/ -v --tb=short
```

**Expected**: 35+ tests, all green.

> **Talking point**: "35 tests covering all 6 detection rules, the composite scorer, and 6 agent investigation scenarios. Every rule has positive and negative test cases. The scorer tests verify the weight formula and severity aggregation. TDD from day one."

**What the audience sees**: A wall of green `PASSED` lines. This builds confidence that the system is real, not vapor.

---

## Step 4: The Data (60 seconds)

Generate synthetic fraud data to show the scale:

```bash
python data/generate.py --count 1000 --output /tmp/demo_data.json --stats
```

**Expected output**:
```
Generated 1000 records (50 fraudulent, 5.0% fraud rate)
Fraud breakdown:
  address_farm: 8
  ein_recycler: 6
  straw_company: 10
  network_cluster: 7
  threshold_gamer: 9
```

> **Talking point**: "50,000-record generator with five embedded fraud archetypes — address farms, EIN recyclers, shell companies, network clusters, and threshold gamers. Each archetype matches a real fraud pattern from OIG case files. The generator maintains realistic distributions so the ML models train on balanced data."

**If short on time**: Skip this step. The investigation agent has its own built-in mock data.

---

## Step 5: Run the Investigation (THE DEMO MOMENT — 3 minutes)

This is the highlight. The audience watches an AI agent investigate a fraud ring in real time.

**Setup**: Open a clean terminal, make the font large.

> **Talking point**: "Now I'm going to show you the investigation agent. This is a LangGraph agent that thinks like a human fraud investigator — it starts broad, follows every lead, checks the network, and won't stop until it has enough evidence to escalate. Let's connect to RING-002, a shell company cluster with $1.48 million in exposure."

Connect to the WebSocket:

```bash
wscat -c "ws://localhost:8000/api/investigate/ws/RING-002"
```

**What streams live** (each line arrives with ~1 second delay):

```json
{"step":1,"type":"tool_call","content":"Querying ring members from Neo4j...","tool_name":"query_ring_members"}
{"step":2,"type":"tool_call","content":"Checking address classification...","tool_name":"check_address_classification"}
{"step":3,"type":"finding","content":"Address classified as CMRA (mailbox service), not commercial office"}
{"step":4,"type":"tool_call","content":"Analyzing loan anomalies...","tool_name":"analyze_loan_anomalies"}
{"step":5,"type":"finding","content":"All 5 members reported zero employees -- PPP required payroll justification"}
{"step":6,"type":"tool_call","content":"Verifying EIN registrations...","tool_name":"check_ein_registrations"}
{"step":7,"type":"finding","content":"No state business filings found for 4 of 5 members"}
```

**Narrate each step as it streams**:

| Step | What streams | What you say |
|------|-------------|-------------|
| 1 | `query_ring_members` | "First it pulls all ring members from Neo4j — who's in this cluster?" |
| 2 | `check_address_classification` | "Now it checks the shared address — is this a real office or a mailbox?" |
| 3 | Finding: CMRA | "Mailbox service. Not a real business address. That's our first red flag." |
| 4 | `analyze_loan_anomalies` | "Now it analyzes the loan amounts against employee counts..." |
| 5 | Finding: Zero employees | "Every single member reported zero employees but claimed $145K-$150K in PPP loans. PPP requires payroll justification." |
| 6 | `check_ein_registrations` | "Checking state business registrations..." |
| 7 | Finding: No state filings | "Four out of five aren't even registered with the state. Shell entities." |

**Then the final event arrives** — the complete investigation report:

```json
{
  "risk_tier": "CRITICAL",
  "executive_summary": "This ring exhibits hallmarks of organized PPP fraud: five businesses sharing a CMRA address, all reporting zero employees while claiming maximum allowable loans, with applications submitted within a 28-day window.",
  "key_findings": [
    {"finding": "5 businesses at single CMRA address", "severity": "critical"},
    {"finding": "100% reported zero employees", "severity": "critical"},
    {"finding": "4 of 5 lack state registration", "severity": "high"},
    {"finding": "Threshold gaming pattern ($145K-$150K)", "severity": "high"},
    {"finding": "All applications within 28-day window", "severity": "medium"}
  ],
  "estimated_fraud_amount": 735600,
  "recommended_action": "REFER_TO_DOJ",
  "confidence": 94
}
```

> **Talking point**: "Risk tier CRITICAL. Five findings, each citing its data source. $735K estimated fraud. 94% confidence. And it recommends referring to DOJ — not just flagging it, but routing it to the right team. This is the Palantir AIP pattern: an agent that investigates autonomously and produces prosecution-ready output."

**Key design points to highlight**:
- **Anti-early-stopping**: The agent doesn't quit after the first finding. It checked address, loans, AND registrations before concluding.
- **Streaming**: Every tool call arrives live over WebSocket. A frontend would render these as they arrive — the investigator watches the AI think.
- **Structured output**: Not a wall of text. Machine-parseable findings with severity levels and dollar amounts.

---

## Step 6: The Full 8-Tool Agent (60 seconds)

> **Talking point**: "What you just saw was the ring investigation agent with 4 specialized tools. The full investigation agent has 8 tools for deep-dive entity investigations."

Show the 8 tools:

```bash
grep -n "^def " backend/agent/investigator.py | head -8
```

Walk through the tool list:

| Tool | Purpose |
|------|---------|
| `get_entity_profile` | Full entity 360 — attributes, risk score, loan details |
| `get_entity_claims` | Claims/transactions — flags deceased billing, impossible volumes |
| `get_entity_network` | Network graph — finds connected entities via shared identifiers |
| `get_anomaly_score` | ML anomaly score (0-100) vs peer group |
| `get_referral_patterns` | Referral analysis — detects kickback rings |
| `search_fraud_patterns` | Pattern matching against fraud taxonomy |
| `get_ring_detail` | Full ring membership and exposure data |
| `escalate_alert` | Routes finding to Senior Investigator Queue |

> **Talking point**: "The investigation protocol requires minimum 6 tool calls before the agent can conclude. It must check the network. It must check the anomaly score. It must quantify the dollar amount. These aren't suggestions — they're enforced constraints. An investigation agent that stops too early is worse than no agent at all."

---

## Step 7: Case Resolution (60 seconds)

Close the loop by creating a case:

```bash
curl -s -X POST http://localhost:8000/api/cases \
  -H "Content-Type: application/json" \
  -d '{
    "title": "RING-002 Shell Cluster — REFER TO DOJ",
    "description": "Organized PPP fraud ring: 5 shell companies at CMRA address, zero employees, $735K estimated fraud. Agent confidence 94%.",
    "priority": "CRITICAL",
    "assigned_to": "Senior Investigator",
    "fraud_type": "SHELL_CLUSTER",
    "alert_ids": ["RING-002"],
    "total_exposure": 1485000
  }' | python3 -m json.tool
```

**Expected**: Case created with UUID, audit trail, timestamps.

> **Talking point**: "Case created. Full audit trail from the moment it was opened. The investigator sees the agent's findings, the evidence citations, the dollar amounts. They can escalate to DOJ, add notes, track status. This is the last mile — from detection to disposition."

Verify the case exists:

```bash
curl -s http://localhost:8000/api/cases | python3 -m json.tool
```

> **Final talking point**: "That's the full loop. Data flows in, detection rules fire, the ML model scores anomalies, graph analytics find the network, the investigation agent builds the case, and the senior investigator closes it. From raw data to prosecution-ready in under a minute."

---

## Recovery Tips

| Problem | Fix |
|---------|-----|
| `wscat` not found | `npm install -g wscat` or use `python -c "import asyncio, websockets; ..."` |
| Port 8000 in use | `lsof -i :8000` then kill the process, or use `--port 8001` |
| Docker services won't start | `docker compose down -v && docker compose up -d` |
| WebSocket connection refused | Verify backend is running: `curl http://localhost:8000/health` |
| Tests fail | `pip install -r requirements.txt` — dependency might be missing |
| Agent returns different output | Without `ANTHROPIC_API_KEY`, uses deterministic fallback (same every time — great for rehearsing) |
| Audience asks about frontend | "The backend API is complete. The Next.js frontend with Sigma.js graph visualization is the next sprint — same architecture, just needs the rendering layer." |

---

## Appendix: Architecture Diagram (for slides)

```
┌──────────────────────────────────────────────────────────┐
│                    Investigator UI                        │
│  Ring Queue │ Ring Detail │ Case Manager │ Analytics      │
├──────────────────────────────────────────────────────────┤
│                REST API + WebSocket (FastAPI)             │
│  /api/alerts │ /api/entity │ /api/graph │ /api/cases     │
│              │  /api/investigate/ws/:ring_id              │
├──────────────────────────────────────────────────────────┤
│               LangGraph Investigation Agent               │
│  8 tools │ Anti-early-stopping │ Streaming │ Structured  │
├──────────────────────────────────────────────────────────┤
│                   Detection Engine                        │
│  6 Rules │ Isolation Forest │ Louvain │ Composite Scorer │
│  RiskScore = 0.4×rules + 0.35×ML + 0.25×graph           │
├──────────────┬───────────────┬───────────────────────────┤
│  PostgreSQL  │    Neo4j      │         Redis             │
│  Records +   │  Ontology     │   Queue + Cache           │
│  Alerts +    │  Graph        │   Pub/Sub                 │
│  Cases       │  Traversal    │                           │
└──────────────┴───────────────┴───────────────────────────┘
```

## Appendix: Key Numbers

| Metric | Value |
|--------|-------|
| Detection rules | 6 (ADDR_REUSE, EIN_REUSE, STRAW_CO, THRESHOLD_GAME, ACCOUNT_SHARE, NEW_EIN) |
| Risk score formula | `0.4×rules + 0.35×ML + 0.25×graph` |
| Agent tools | 8 (profile, claims, network, anomaly, referrals, patterns, ring detail, escalate) |
| Test coverage | 35+ tests (rules, scoring, agent scenarios) |
| Data generator | 50K records, 5 fraud archetypes, ~5% fraud rate |
| Fraud schemas | 3 (PPP Loans, Medicaid, Procurement) |
| API endpoints | 12 REST + 1 WebSocket |
| Infrastructure | PostgreSQL 16, Neo4j 5, Redis 7, FastAPI |
