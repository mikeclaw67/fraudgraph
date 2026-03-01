# FraudGraph — Workflow-Driven Redesign for Government Fraud Investigators

## The User
SBA Office of Inspector General investigator. Federal employee.
Job: find fraud rings, build evidence packages, refer to DOJ for prosecution.
NOT technical. NOT a data scientist. A trained investigator with 50+ open cases.

## The Core Insight
PPP fraud is organized — rings, not lone wolves. The Minnesota case was rings of 
connected borrowers exploiting shared addresses, bank accounts, shell companies.
The PRIMARY unit of investigation is the RING, not the individual alert.

## The Investigator's Daily Workflow
1. MORNING TRIAGE — Which new rings are worth my time today?
2. SCOPE THE RING — How many members? How connected? Total exposure?
3. BUILD EVIDENCE — Document the shared evidence with provenance for prosecution
4. REFER OR DISMISS — Output is a DOJ referral package, not a dashboard

## UI Structure — Ring-First Architecture

### Page 1: Ring Queue (homepage, replaces "Alert Queue")
The primary view. Shows detected fraud rings sorted by total dollar exposure.

Layout: Full-width table, dark government aesthetic (#0F1117 bg, #1A1D27 panels)
Columns:
  RING TYPE | COMMON ELEMENT | MEMBERS | TOTAL EXPOSURE | AVG RISK | STATUS | ASSIGNED | DETECTED

Ring type badges (icon + label):
  🏠 ADDRESS FARM — N businesses, same address
  🏦 ACCOUNT CLUSTER — N businesses, same bank routing  
  🔢 EIN RECYCLER — N businesses, same EIN
  👻 STRAW COMPANY — Individual: 0 employees, <6mo old, max loan
  🎯 THRESHOLD GAMING — Individual: amount just below $150K review threshold

Row display example:
  [🏠 ADDRESS FARM] [123 Main St, Milwaukee WI] [47 members] [$6.82M] [94/100] [NEW] [—] [Feb 28]

Click row → expand inline OR navigate to Ring Detail view

At top: summary bar
  TOTAL RINGS: 234  |  UNREVIEWED: 47  |  IN PROGRESS: 18  |  DOLLAR EXPOSURE: $847M

### Page 2: Ring Detail (the investigation workspace)
The core page. Everything an investigator needs to build their case.

Layout: Three-column
LEFT (280px): Ring summary card
  - Ring type icon (large)
  - Common element (the smoking gun) — shown prominently in a colored callout box
    "47 businesses filed from the same address: 123 Main St, Milwaukee WI 53202"
  - Total exposure: $6.82M (large, prominent)
  - Risk score: 94/100 CRITICAL
  - Detection date, last updated
  - Status dropdown: NEW → UNDER REVIEW → REFERRED → DISMISSED
  - Assigned investigator
  - Action buttons:
    [Open Full Case]  [Export Evidence Package]  [Dismiss Ring]

CENTER (fills remaining): Ring Members Table
  All businesses in this ring, each row:
  BUSINESS NAME | EIN | LOAN AMOUNT | DATE | LENDER | STATUS | INVESTIGATOR NOTES
  
  Shared element highlighted: the address/account/EIN column shows the common value in red
  
  Click any row → Right panel opens with that borrower's full 360 profile

RIGHT (360px, slides in): Borrower 360 Panel
  - Name, SSN last 4, risk score
  - Their loan: amount, program, date, lender, bank account
  - Red flags specific to this borrower (besides the ring membership)
  - All their businesses
  - Notes field (inline edit, auto-saved)
  - Quick actions: [Flag as Key Member] [Dismiss This Member] [Add to Notes]

Below the table: Evidence Graph
  - Sigma.js visualization showing ONLY this ring's members
  - Center node: the shared element (the address or account)
  - Spoke nodes: all businesses that connected to it
  - This is designed to be screenshot-able and included in the DOJ referral
  - Size of business node = loan amount
  - Color = individual risk score
  - Export button: "Export Graph as PNG" (for referral package)

### Page 3: Case Manager (active investigations)
Table view (NOT kanban — investigators scan tables)
Status tabs: ALL | UNDER REVIEW | REFERRED TO DOJ | DISMISSED | CLOSED

Columns:
  CASE ID | RING TYPE | MEMBERS | EXPOSURE | INVESTIGATOR | STATUS | LAST UPDATED | DOJ STATUS

Click row → Case Detail
  - Links to all rings in this case
  - Investigator notes (chronological, timestamped, append-only)
  - Evidence checklist (auto-populated from ring data)
  - Referral status and DOJ contact
  - Audit trail (every action logged with timestamp + user)

### Page 4: Analytics (management view — not for investigators)
Who uses this: SBA leadership, not frontline investigators
Shows: detection velocity, referral conversion rate, dollar recovery, model performance
Time-series charts, breakdown by fraud type, breakdown by state/region
Schema switcher at bottom: PPP/EIDL → Medicaid → Procurement (the generalization story)

### What We're REMOVING
- ❌ Generic "Alert Queue" with individual rows — replaced by Ring Queue
- ❌ Individual entity 360 as standalone page — now a panel inside Ring Detail  
- ❌ Graph Explorer as standalone page — embedded in Ring Detail as evidence tool
- ❌ Decorative full-screen graph with no workflow purpose

## Visual Design — Government Investigator Aesthetic

### Colors (Palantir Gotham/dark government tool)
```
--bg-shell: #0F1117
--bg-panel: #1A1D27  
--bg-row: #1E2130
--bg-row-hover: #252840
--bg-selected: #1C2B4A
--border: #2A2D3E
--text-primary: #E8EAF0
--text-secondary: #8B90A8
--text-muted: #4A4F6A
--accent-blue: #2A6EBB
--critical: #C94B4B
--high: #D4733A
--medium: #C9A227
--low: #3E8E57
--smoking-gun: #C94B4B  /* the shared element highlight color */
```

### Typography: Dense and functional
- 12px for data, 11px for labels, no large display text
- Tabular numerals for all dollar amounts and counts
- Labels: uppercase, 11px, letter-spacing 0.06em

### Layout
- 48px left nav rail (icon-only), expands to 200px on hover
- No rounded corners (border-radius: 2px max)
- No cards — flat sections with 1px borders
- Tables are the primary information format

## The "Smoking Gun" UI Pattern
The shared element (address, bank account, EIN) must always be visually prominent.
It's the most important piece of evidence. Design it like a police evidence tag:

```
┌─────────────────────────────────────────────────────┐
│  ⚠  SHARED EVIDENCE                                  │
│  47 businesses filed from the same address:          │
│  123 Main Street, Milwaukee, WI 53202                │
│  This address does not correspond to a known         │
│  commercial district. Property records show a        │
│  single-family residence.                            │
└─────────────────────────────────────────────────────┘
```

## Done Signal
All 4 pages rebuilt (Ring Queue, Ring Detail, Case Manager, Analytics).
`npm run build` passes. Write RALPH_DONE to progress.md with summary.
