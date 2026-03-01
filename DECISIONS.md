# Decisions — All Tied to PRODUCT_SPEC.md

This file tracks decisions made on FraudGraph. Every decision updates PRODUCT_SPEC.md immediately. PRODUCT_SPEC is the source of truth.

## 2026-03-01: Case Model Architecture

**Decision**: Ring (detection) ≠ Case (investigation). Case is the center object.

**Why**: Foundry research showed actions are first-class. Palantir Case Manager coordinates investigation toward prosecution. Our Ring Detail was page-centric, not action-centric. Case model fixes this.

**What it means**:
- Ring detected → Ring Queue (triage)
- Investigator opens case → Case object created
- Case accumulates evidence, findings, actions
- Case exports to DOJ referral package

**Reflected in**: PRODUCT_SPEC.md (Data Model section, added 2026-03-01)

**Currently building**: Case schema (backend) + Case workspace (frontend)

---

Keep this file minimal. If a decision is made, update PRODUCT_SPEC immediately and note it here. PRODUCT_SPEC is the master.
