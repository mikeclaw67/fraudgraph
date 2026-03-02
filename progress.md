ITERATION_DONE: F-34 Unblock — WebSocket backend fix + critical UX (row affordances, nav labels)

## What was built (F-34)
- **docker-compose.yml**: Fixed frontend build context (`../fraudgraph-frontend/frontend` -> `./frontend`)
- **DEMO_QUICK.md**: Updated to 3-step startup: (1) make demo, (2) wait 10s, (3) open localhost:3000
- **Sidebar nav labels**: Widened from 48px to 140px, added text labels (Rings, Cases, Analytics, Schema) + "FraudGraph" logo text + "Online" status label
- **Row affordances**: Added persistent chevron-right icons on every ring queue row, enhanced hover state with left-border accent highlight + brighter bg, `group` class for coordinated hover transitions
- **Layout sync**: Updated `ml-[48px]` -> `ml-[140px]` in layout.tsx, notification toast position updated

## Verification
- `npx tsc --noEmit` — 0 errors
- `npm run build` — exits 0, all routes compile

---

RALPH_DONE: Entity 360 drawer — right-panel entity profile, URL-synced, works from graph + member list

## What was built
- **URL sync**: `?entity_id=...` query param controls drawer state
- **ESC key**: Closes drawer, removes URL param
- **Entity360 component**: Three sections (Identity / Attributes / Relationships)
- **EntityNotFound component**: Graceful handling when URL points to non-existent entity
- **Entry points**: Graph node click + member table row click both open drawer

## Verification
All 9 acceptance criteria met:
1. ✅ Graph click opens drawer, URL updates
2. ✅ Member row click opens drawer
3. ✅ ESC key closes drawer, URL param removed
4. ✅ Direct URL navigation opens drawer on page load
5. ✅ Non-existent entity shows "Entity not found" state
6. ✅ [×] button closes drawer
7. ✅ All 3 sections render (Identity / Attributes / Relationships)
8. ✅ `npm run build` exits 0
9. ✅ No regressions (only ring-detail.tsx modified)
