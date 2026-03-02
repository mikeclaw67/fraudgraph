# S1: Schema Switcher — PPP → Medicaid → Procurement

Read CLAUDE.md first.
PLAN before building. Read what exists. Understand the codebase. Then build.
After every file write: cd frontend && npx tsc --noEmit. Fix ALL errors.

## What This Is
The Schema Switcher is the generalization demo — the "aha moment" for Palantir.
It shows that the SAME fraud detection engine works across 3 government domains
by switching the data schema live in the UI.

## The Core Insight
PPP:        Borrower → Business → LoanApplication → BankAccount/Address (SHARED_BY = fraud)
Medicaid:   Provider → Claim → BillingCode → NPI/Address (SHARED_BY = fraud ring)
Procurement: Vendor → Contract → Invoice → BankAccount (SHARED_BY = bid rigging ring)

Same structure. Same detection. Different config. One product.

## What to Build

### 1. Add /schema page (`frontend/src/app/schema/page.tsx`)
A dedicated Schema Switcher page — not a modal, a full page.

Layout:
- Header: "Schema Switcher" title + subtitle "One engine. Three fraud domains."
- Three domain cards (PPP, Medicaid, Procurement) — each clickable
- Active domain highlights in blue
- Below the cards: live preview of the entity graph for the selected domain
  - Use Sigma.js (already installed) to show a mini ring graph with fake nodes
  - OR show a simple styled node-link diagram using SVG (simpler, acceptable)
- Schema details panel: shows entity types, relationship types, sample data counts for the active domain

### 2. Schema definitions (`frontend/src/lib/schemas.ts`)
Define 3 schemas:

```typescript
export type DomainSchema = {
  id: "ppp" | "medicaid" | "procurement";
  name: string;
  subtitle: string;
  color: string;
  entityTypes: { name: string; icon: string; count: number }[];
  relationshipTypes: string[];
  ringExamples: { id: string; name: string; exposure: string; members: number }[];
  smokingGun: string; // example smoking gun sentence
};
```

PPP data: entities = Borrower, Business, Address, BankAccount; 50k records; 5 fraud rings seeded
Medicaid data: entities = Provider, Claim, BillingCode, NPI, Address; 10k claims; example rings
Procurement data: entities = Vendor, Contract, Invoice, BankAccount; example rings

### 3. Wire into sidebar navigation
In `frontend/src/components/sidebar.tsx`, add "Schema" nav item:
- Icon: use a grid/switch icon (SVG inline — match other sidebar icons)
- Route: /schema
- Label: "Schema"

### 4. Schema Switcher UI behavior
- Three domain tabs/cards at top
- Clicking a card: smoothly transitions the entity panel below
- Show entity type list with counts for active domain
- Show sample ring examples from that domain
- Show "smoking gun" example sentence in a callout box
- No page navigation — everything in one page, tab state only

## Acceptance Criteria
1. `/schema` page renders with three domain cards (PPP, Medicaid, Procurement)
2. Clicking a card switches the panel content below (entity types, ring examples, smoking gun)
3. Active domain is highlighted
4. Schema entry appears in sidebar navigation and routes correctly
5. Smoking gun callout box renders for each domain
6. `npm run build` exits 0, no TypeScript errors
7. No regressions on Ring Queue, Ring Detail, Cases, Analytics pages

## Done
Write to progress.md: FORGE_DONE: S1 Schema Switcher — 3-domain switcher page live at /schema, wired into sidebar
Then: git add -A && git commit -m "feat: S1 schema switcher — PPP, Medicaid, Procurement live switch" && git push origin main
Then: openclaw system event --text "FORGE_DONE: S1 Schema Switcher complete. Pixel review please." --mode now
