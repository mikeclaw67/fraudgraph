# FraudGraph v2 — What We're Actually Building

## Primary Insight (From Research)
Contract name: "SBA Fraud Prevention Pilot and BOOTCAMP" — $300K, 90-day pilot.
Palantir doesn't just analyze data. They train government investigators to use the platform themselves.
The generalization is already happening: Fannie Mae (mortgage), CMS (Medicare), Education Dept.

## The Product
A self-service fraud investigation platform — ring-first, investigator-driven.
Not a dashboard. An evidence-building workspace.

## Five Pages (Ring-First Architecture)
1. Ring Queue — morning triage, sorted by dollar exposure
2. Ring Detail — smoking gun callout, member table, evidence graph, case actions
3. Active Cases — investigation tracking, evidence checklists, referral packaging
4. Schema Switcher — live switch: PPP → Medicaid → Procurement (the generalization demo)
5. Command Center — aggregate view for agency leadership

## Three Fraud Domains
1. PPP/EIDL Loan Fraud (Minnesota) — $400M flagged
2. Medicaid Billing Fraud — first generalization ($100B/yr problem)
3. Procurement Fraud — second generalization ($70B+/yr problem)

## The Ontology Pattern
PPP: Borrower → Business → LoanApplication → BankAccount/Address (SHARED_BY = fraud)
Medicaid: Provider → Claim → BillingCode → NPI/Address (SHARED_BY = fraud ring)
Procurement: Vendor → Contract → Invoice → BankAccount (SHARED_BY = bid rigging ring)

Same structure. Same detection. Different config. THIS is what Palantir charges $300K per bootcamp for.

## The Smoking Gun UI Pattern
Every ring page leads with a colored evidence callout:
"47 businesses filed from 123 Main St, Milwaukee WI — a single-family residence"
This is the most important information. Make it impossible to miss.

## Evidence Graph = The Evidence (Not Decoration)
Sigma.js ring visualization is:
- The actual evidence of organized fraud
- Exportable as PNG for DOJ referral packages
- Designed to be screenshot-able and shown to a judge

## Mock Data
50,000 PPP/EIDL records (Minnesota-heavy, national spread)
5 fraud archetypes, ~5% fraud rate
10,000 Medicaid claims (for schema switch demo)
