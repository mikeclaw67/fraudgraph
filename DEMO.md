# FraudGraph Demo — UI Walkthrough

**Audience**: SBA/Palantir stakeholders, PM interviews, investor demos
**Duration**: 8–12 minutes
**Format**: Live UI walkthrough at http://localhost:3000
**What you're showing**: A Palantir-class fraud investigation platform — from morning triage to AI-powered investigation to evidence export to generalization proof.

---

## Opening Narrative (30 seconds — before touching the keyboard)

> "In March 2025, the GAO published a report on SBA's fraud prevention system. The finding: SBA's automated detection generated high false-positive rates — roughly two-thirds of algorithmic referrals led nowhere. Investigators spent most of their time chasing dead ends instead of prosecuting real fraud.
>
> FraudGraph is the direct answer to that critique. It combines detection rules, ML anomaly scoring, and graph analytics with a human-in-the-loop investigation workflow. An investigator opens it Monday morning, sees exactly which rings are critical, runs an AI-powered investigation, exports the evidence package, and refers it to DOJ — all in the same tool.
>
> Let me show you the complete workflow."

---

## Prerequisites (Before the Demo)

```bash
# Option A: Full stack (recommended)
cd /path/to/fraudgraph
make demo
# Starts: Postgres, Neo4j, Redis, Backend (8000), Frontend (3000)

# Option B: Backend only (no Docker)
source .venv/bin/activate
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
cd frontend && npm run dev
```

**Optional**: Set `ANTHROPIC_API_KEY` in `.env` for live LLM agent. Without it, the agent uses a deterministic fallback — identical output every run, great for rehearsing.

**Pre-flight checklist**:
- [ ] App running at http://localhost:3000
- [ ] ring_002 visible in Ring Queue (Shell Cluster, $7.54M exposure)
- [ ] Browser window large enough for audience to see clearly

---

## Step 1: Ring Queue — Morning Triage (90 seconds)

Navigate to **http://localhost:3000/rings**

> "This is what an SBA investigator sees on Monday morning. The Ring Queue — sorted by exposure, highest risk first. FraudGraph's triage engine automatically classifies every ring into four tiers: CRITICAL, HIGH, MEDIUM, LOW."

**What to show**:
- The **CRITICAL** banner at the top of the page — a ring with >$1.5M exposure is flagged for immediate action
- Rings sorted by exposure amount — biggest dollar amounts surface automatically
- Inline status chips (NEW → UNDER_REVIEW → REFERRED → DISMISSED) — investigators triage without leaving the queue
- Risk score badges (composite of rules + ML + graph)

> "The investigator doesn't have to decide what to look at. The system tells them: this ring is CRITICAL, it needs attention today. That's the triage automation — it doesn't replace the investigator, it focuses them."

**Point to ring_002** (Shell Cluster, $7.54M exposure, CRITICAL tier):

> "ring_002 is our CRITICAL ring for today. Shell company cluster, $7.54 million in exposure. Let's investigate it."

---

## Step 2: Ring Detail — The Evidence Picture (60 seconds)

**Click ring_002** from the Ring Queue.

The Ring Detail panel slides in from the right.

> "This is the Ring Detail view. Split-pane: left side has the evidence, right side has the graph."

**What to point out**:

**Smoking Gun Panel** (top of the detail view):
- Red-bordered callout box with the highest-severity findings pre-surfaced
- "Five businesses at a single CMRA address. All reporting zero employees. Applications within a 28-day window."

> "The smoking gun panel surfaces the top findings before the investigator even runs the investigation. They can see immediately why this ring is CRITICAL — they don't have to read through 20 data points to understand the problem."

**Graph Visualization**:
- Nodes representing businesses, addresses, bank accounts
- Edges showing shared identifiers (same address, same account)

> "This is the graph — the network visualization. Every node is an entity: a business, an address, a bank account. Every edge is a shared attribute. You can see the cluster forming visually."

**Click a graph node** to open the Entity 360 Drawer:

> "Click any node and you get the Entity 360 drawer — full profile of that entity: loan amount, employee count, registration status, risk score. Everything an investigator needs to understand who this borrower is."

Press **ESC** to close the drawer.

---

## Step 3: Investigate — AI Agent Live (3 minutes)

This is the centerpiece. Ensure the audience is watching.

> "Now I'll run the AI investigation agent. This is a LangGraph agent that investigates the way a human would — checking the address, verifying registrations, analyzing loan patterns, building the network picture. Watch the tool calls stream in real time."

Click **"Investigate"** (the button in the Ring Detail panel).

**What streams live** (each step appears on screen as it's called):

| Step | Tool Call | Narrate |
|------|-----------|---------|
| 1 | `query_ring_members` | "Pulling all members from the graph..." |
| 2 | `check_address_classification` | "Checking the shared address — is this a real office?" |
| 3 | Finding: CMRA | "Commercial mailbox service. Not a real business address. First red flag." |
| 4 | `analyze_loan_anomalies` | "Analyzing loan amounts against employee counts..." |
| 5 | Finding: Zero employees | "Every member reported zero employees but claimed $145K-$150K. PPP requires payroll justification." |
| 6 | `check_ein_registrations` | "Verifying state business registrations..." |
| 7 | Finding: No state filings | "Four of five aren't registered with any state. Shell entities." |
| 8+ | Additional checks | Continue through remaining tool calls |

**When the final report renders**:
- **CRITICAL** risk tier badge
- Exposure estimate: $735,600
- Confidence: 94%
- Recommended action: REFER TO DOJ

> "Risk tier CRITICAL. Five machine-verified findings. $735K estimated fraud exposure. 94% confidence. And the system recommends referral to DOJ — not just flagging it, routing it to the right team.
>
> The agent checked address classification, loan anomalies, AND state registrations before concluding. It doesn't stop early. That's an enforced protocol — a minimum of 6 tool calls before the agent can render a final verdict. An investigation that stops too early is worse than no investigation."

---

## Step 4: Evidence Checklist (60 seconds)

Scroll down in the Ring Detail to the **Evidence Checklist panel**.

> "SBA OIG has a standard checklist for PPP fraud referrals — 7 required items that must be verified before a case can go to DOJ."

**What to show**:
- 7 checklist items with REQ badges
- Toggle an item — watch it turn blue with a checkmark and an audit timestamp
- Counter: "2/7 complete" updates dynamically

> "Every toggle is timestamped and auditable. The senior investigator sees exactly who checked what and when. This isn't just workflow — it's evidentiary documentation."

Show the **Review Required** gate:
- Try to submit for review with incomplete checklist — the system blocks it

> "The system won't let you submit for review until the checklist is complete. That's the SBA OIG standard — enforced in software."

---

## Step 5: Evidence Package (30 seconds)

Click **"Evidence Package"** (in the Ring Detail panel).

A ZIP downloads immediately.

> "The evidence package. One click — the investigator gets a ZIP file containing:
> - `graph.png` — the fraud network visualization as an image
> - `findings.json` — machine-readable findings with severities and dollar amounts
> - `evidence_report.html` — a standalone, printable report with embedded charts
>
> This goes straight to the prosecutor. No screenshots, no copy-paste, no manual report writing. Prosecution-ready in one click."

---

## Step 6: Schema Switcher — Generalization Proof (90 seconds)

Navigate to **http://localhost:3000/schema**

> "Here's the Palantir generalization story. FraudGraph isn't just a PPP fraud tool. The detection engine is configurable — swap the entity schema and you get a completely different fraud domain."

Click **Medicaid**:
> "Medicaid claims fraud. The entities change — Provider, Claim, BillingCode, NPI — but the detection rules are structurally identical. ADDR_REUSE catches provider mills using the same clinic address. ACCOUNT_SHARE catches billing rings routing payments to a single account. Same engine, different ontology."

Click **Procurement**:
> "Government procurement fraud. Vendor, Contract, Invoice, Person. The Person node captures the insider — the IT vendor who bribed a government officer to award sole-source contracts. That's the Madison pattern: $9 million in kickbacks, five shell vendors, one GSA insider. FraudGraph models that ring with the same detection logic as the PPP cluster we just investigated."

Click back to **PPP**:
> "One detection engine. Any fraud domain. Configurable schema means deployment in weeks, not months. That's the architecture that makes FraudGraph domain-agnostic — which is what government agencies actually need as fraud patterns evolve."

---

## Step 7: Command Center — Leadership Dashboard (60 seconds)

Navigate to **http://localhost:3000/analytics**

> "Finally — the leadership view. SBA OIG reports to Congress on outcomes, not detection counts. The metrics that matter for budget justification: convictions, recovery amounts, investigator ROI."

**What to highlight**:
- **Outcomes & ROI panel** — expected recoveries, referral-to-conviction rate
- **Fraud Type Distribution** — where is exposure concentrated? Which domains need more investigator capacity?
- **Investigator Workload** — case load per investigator, capacity utilization
- **Case Aging / Bottlenecks** — where are cases stalling? What's the average time-to-resolution?

> "A Director of OIG walks in on budget day and opens this dashboard. They see: 42 referrals this quarter, $4.2M in expected recoveries, ROI of 6.2x on investigator time. That's the briefing they're giving to Congress — and FraudGraph generates it automatically from case data."

---

## Closing (30 seconds)

> "That's the complete workflow. Ring Queue for morning triage → Ring Detail for evidence review → AI investigation for pattern verification → Evidence checklist for case documentation → One-click evidence export → Schema switching for generalization across any fraud domain → Leadership dashboard for congressional reporting.
>
> This is what Palantir delivers out of a Tier 3 AIP Bootcamp: not a prototype, but a production investigation platform that an SBA investigator would open Monday morning and actually use."

---

## Recovery Tips

| Problem | Fix |
|---------|-----|
| App not loading at :3000 | Run `cd frontend && npm run dev` or `make demo` |
| Backend not responding | `source .venv/bin/activate && python3 -m uvicorn backend.main:app --port 8000` |
| Ring Queue empty | Backend seed data may not have loaded — restart backend |
| Investigation agent timeout | Check ANTHROPIC_API_KEY; falls back to deterministic mock automatically |
| WebSocket not streaming | Backend health check: `curl http://localhost:8000/health` |
| Graph not rendering | Hard refresh (Cmd+Shift+R); Sigma.js requires WebGL |
| Entity drawer not opening | Click a graph node (not the edge); drawer slides from the right |

---

## Architecture Reference (For Technical Audiences)

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                          │
│  Ring Queue │ Ring Detail │ Cases │ Schema Switcher │ Analytics│
│  Entity 360 Drawer │ WebSocket Investigation UI              │
├──────────────────────────────────────────────────────────────┤
│                REST API + WebSocket (FastAPI)                 │
│  /api/rings │ /api/cases │ /api/analytics │ /api/schema      │
│              /api/investigate/ws/:ring_id                    │
├──────────────────────────────────────────────────────────────┤
│                LangGraph Investigation Agent                  │
│  8 tools │ Min 6-call protocol │ Streaming │ Structured output│
├──────────────────────────────────────────────────────────────┤
│                    Detection Engine                           │
│  6 Rules │ Isolation Forest │ Louvain │ Composite Scorer     │
│  RiskScore = 0.4×rules + 0.35×ML + 0.25×graph               │
├──────────────┬───────────────┬──────────────────────────────-┤
│  PostgreSQL  │    Neo4j      │         Redis                 │
│  Rings +     │  Graph        │   Queue + Cache               │
│  Cases +     │  Traversal    │   Pub/Sub                     │
│  Checklist   │               │                               │
└──────────────┴───────────────┴───────────────────────────────┘
```

## Key Numbers

| Metric | Value |
|--------|-------|
| Detection rules | 6 (ADDR_REUSE, EIN_REUSE, STRAW_CO, THRESHOLD_GAME, ACCOUNT_SHARE, NEW_EIN) |
| Risk score formula | `0.4×rules + 0.35×ML + 0.25×graph` |
| Agent tools | 8 |
| Min tool calls per investigation | 6 (enforced) |
| Test coverage | 35+ tests |
| Fraud schemas | 3 (PPP Loans, Medicaid, Procurement) |
| Triage tiers | 4 (CRITICAL >$1.5M, HIGH $500K–$1.5M, MEDIUM $150K–$500K, LOW <$150K) |
| Evidence checklist items | 7 (SBA OIG standard) |
| Export package contents | graph.png + findings.json + evidence_report.html (ZIP) |
| Demo ring | ring_002 (Shell Cluster, $7.54M exposure, CRITICAL) |

---

*Last updated: 2026-03-08 — UI walkthrough replacing CLI-based demo.*
*GAO anchor: GAO-25-107267 (SBA Fraud Prevention, March 2025)*
