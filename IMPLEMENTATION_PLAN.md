# S1: Schema Switcher — Implementation Plan

**PM:** Pixel | **Status:** Draft — needs EM review before Forge starts
**Date:** 2026-03-02

---

## What We're Building

A live schema switcher that lets investigators flip between three fraud domains:
- **PPP/EIDL** (default) — SBA loan fraud, Minnesota
- **Medicaid** — healthcare fraud, phantom billing, patient mills
- **Procurement** — government contract fraud, bid rigging

This is the Palantir "Foundry generalization" demo moment.
Same graph engine. Same detection rules. Different ontology config.

---

## Scope

### In Scope
1. Schema selector UI — 3 tabs in header bar (above Ring Queue)
2. Medicaid mock ring dataset (3-4 rings, adapted FraudRing shape)
3. Procurement mock ring dataset (3-4 rings)
4. Ring Queue to load schema-specific rings
5. Ring Detail: domain labels adapt (Borrower → Provider, Loan → Claim, etc.)

### Out of Scope (this sprint)
- Backend API changes (all data stays client-side mock for now)
- Real Medicaid/Procurement data pipeline
- Schema-specific investigation agent prompts
- Analytics page schema breakdowns

---

## Decision: Where Does the Switcher Live?

**Recommendation:** Header bar, directly above Ring Queue content.

```
┌─────────────────────────────────────────────────────────────┐
│ ≡  FraudGraph                           [PPP] [MED] [PROC]  │
├──────────────────────────────────────────────────────────────
│ Ring Queue — 5 rings at risk           ...                   │
```

**Why header, not sidebar:** The sidebar is icon-only (48px). Schema is a global context switch, not a navigation item. A pill-tab in the top bar is the Palantir pattern.

**⚠️ EM Decision Required:** Confirm header placement OR propose alternative.

---

## Medicaid Mock Rings (3 rings)

```
RING-M001: Phantom Billing Ring — "NPI 1234567890 billed 312 units/day across 47 beneficiaries"
RING-M002: Patient Mill — "Facility at 2901 Biscayne Blvd billed 8 providers, 1,200 duplicate claims"
RING-M003: Excluded Provider Network — "4 excluded providers operating under 6 clean NPIs"
```

Same FraudRing shape. ring_type maps to: `PHANTOM_BILLING` | `PATIENT_MILL` | `KICKBACK_NETWORK`

Member types adapt: RingMember `type` becomes `Provider | Beneficiary | Facility | Address`

---

## Procurement Mock Rings (3 rings)

```
RING-P001: Bid Rotation Ring — "3 vendors alternating lowest bid across 14 contracts, $2.1M"
RING-P002: Shell Vendor Cluster — "5 vendors share address at 88 Broad St, NYC — all sole-source awards"
RING-P003: Revolving Door — "Former contracting officer at DHS now owns award recipient"
```

ring_type maps to: `BID_ROTATION` | `SHELL_VENDOR` | `REVOLVING_DOOR`

---

## Type System Changes

Add to types.ts:
```typescript
export type Schema = "ppp" | "medicaid" | "procurement";

// Extend RingType
export type RingType = 
  // PPP
  | "ADDRESS_FARM" | "ACCOUNT_CLUSTER" | "EIN_RECYCLER" | "STRAW_COMPANY" | "THRESHOLD_GAMING"
  // Medicaid
  | "PHANTOM_BILLING" | "PATIENT_MILL" | "KICKBACK_NETWORK" | "UPCODING"
  // Procurement
  | "BID_ROTATION" | "SHELL_VENDOR" | "REVOLVING_DOOR" | "SOLE_SOURCE_CLUSTER";
```

Add a `SchemaContext` to app state (React context or URL param: `?schema=ppp`).

---

## Component Changes

### New: `SchemaSelector.tsx`
- 3 tab pills: PPP/EIDL | Medicaid | Procurement
- Active tab: Palantir blue (#2196F3)
- Emits schema change to context

### Modified: `mock-data.ts`
- `getMockRings(schema: Schema): FraudRing[]`
- Returns PPP rings (existing), Medicaid rings (new), or Procurement rings (new)

### Modified: `ring-detail.tsx`  
- `memberTypeLabel(type: string, schema: Schema)` helper
- PPP: "Borrower", "Business", "BankAccount"
- Medicaid: "Provider", "Beneficiary", "Facility"
- Procurement: "Vendor", "Agency", "Officer"

### Modified: `page.tsx` (Ring Queue)
- Read schema from context
- Pass to `getMockRings(schema)`

---

## Acceptance Criteria

1. Schema selector renders in header — 3 tabs, one active at a time
2. Switching schema immediately updates Ring Queue rings
3. Ring Queue shows domain-appropriate ring names/types for each schema
4. Ring Detail opens for any schema ring without crashing
5. Member type labels adapt per schema (Provider vs Borrower vs Vendor)
6. Switching back to PPP shows original PPP rings
7. `npm run build` clean, no TypeScript errors
8. No regressions in existing Ring Queue or Ring Detail

---

## Risks

| Risk | Mitigation |
|------|-----------|
| ring_type badge colors missing for new types | Map new types to existing color buckets |
| Ring Detail hardcoded PPP field labels | Use schema-aware label helper (5 lines) |
| Smoking gun evidence text is PPP-specific | Write domain-specific smoking gun templates |
| URL state: schema lost on refresh | Store in URL param `?schema=medicaid` |

---

## Estimate

- Mock data: 2 hours (Forge)
- SchemaSelector component: 1 hour (Forge)
- Ring Queue wiring: 30 min (Forge)
- Ring Detail label adaptation: 1 hour (Forge)
- **Total:** 4-5 hours Forge time

---

## EM Approval Required Before Starting
1. ✅ Confirm header placement for schema switcher
2. ✅ Confirm mock-only data (no backend API this sprint)
3. ✅ Approve 3-ring sets per schema (or adjust count)
