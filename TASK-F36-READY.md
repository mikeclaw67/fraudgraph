# F-36: Entity 360 Drawer — Click Graph Node → Inline Entity Profile

## What to build
When investigator clicks a node in the evidence graph (Ring Detail page), a right-side panel slides in showing the full entity profile: borrower/business/organization details, risk flags, linked entities, addresses/accounts. Clicking from the graph OR from the member table should both open this drawer.

## UI Structure
- Right-side panel, 30% width, slides in from right (like F-14 split-pane pattern)
- Title: Entity type + name (e.g. "BORROWER: Jane Smith")
- Sections (tabbed or scrollable):
  1. **Basic Info** — EIN, address, phone, founding date
  2. **Risk Flags** — highlighted in red, what this entity matched in the detection rules
  3. **Linked Entities** — other entities in the same ring (table of borrowers/businesses/accounts)
  4. **Addresses** — all known addresses for this entity (clickable, highlights on graph)
  5. **Accounts** — bank accounts linked (clickable, highlights on graph)
- Close: ESC or X button
- URL updates: `/rings/[id]?entity=borrower_123` so sharing/reloading preserves state

## Implementation
Backend already has entity data in the ring response. Frontend job:
1. On node click in graph, extract entity ID
2. Slide panel in from right
3. Lookup entity from ring.entities array
4. Render profile sections
5. On clicking linked entities → highlight those nodes in graph
6. ESC/X → slide panel out, reset graph colors
7. Sync URL so drawer state is bookmarkable

## Acceptance criteria
- [ ] Click any graph node → drawer slides in with entity profile
- [ ] Profile shows all 5 sections (basic, risk, linked, addresses, accounts)
- [ ] Clicking linked entity in drawer → highlights that node in graph
- [ ] Clicking address/account in drawer → highlights all nodes using that address/account
- [ ] ESC closes drawer, resets graph colors
- [ ] URL `/rings/[id]?entity=X` is synced; reload preserves drawer state
- [ ] Works from both graph AND member list below (click row → drawer opens)
- [ ] tsc clean, build clean

## Files to touch
- frontend/src/app/rings/[id]/page.tsx — add click handlers, manage drawer state
- frontend/src/components/entity/EntityDrawer.tsx — new component for entity profile
- frontend/src/components/entity/EntitySection.tsx — reusable section component
- frontend/src/lib/graph-highlighting.ts — helper to highlight nodes in Sigma.js by entity/address/account

## Done
tsc clean, build clean.
git commit -m "feat: F-36 entity 360 drawer with graph highlighting" && git push origin sprint-frontend
Write to progress.md: FORGE_DONE: F-36 entity drawer complete
