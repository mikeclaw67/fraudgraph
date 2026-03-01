# F-35: Ring Queue — Inline Actions + State Machine

## What to build
Each ring row in the Ring Queue (/rings) needs inline action buttons visible on hover.
The ring state machine: NEW → UNDER REVIEW → REFERRED → DISMISSED

## Exact UI
- On row hover: show 3 action buttons on the right side of the row
  - [Open Case] → moves ring to UNDER REVIEW, fills Investigator column with "You"
  - [Refer] → moves ring to REFERRED (only if UNDER REVIEW)  
  - [Dismiss ▾] → dropdown with reason codes: DUPLICATE, INSUFFICIENT_EVIDENCE, FALSE_POSITIVE, OUT_OF_JURISDICTION
- Status badge updates immediately (optimistic UI)
- Dismissed rings get a strikethrough on the smoking gun text + dimmed row opacity (0.4)
- Action buttons: 0px radius, 11px uppercase, 22px height — same Palantir token system

## State lives in component state (no backend call needed)
Use React useState with a map of ringId → status. Initialize from the ring's current status field.

## Acceptance criteria
- [ ] Hover a NEW row → 3 buttons appear
- [ ] Click "Open Case" → badge flips to UNDER REVIEW, investigator shows "You", buttons change to [Refer] [Dismiss]
- [ ] Click "Dismiss" → dropdown appears with 4 reason codes
- [ ] Selecting a reason → badge flips to DISMISSED, row dims to opacity-40
- [ ] Dismissed rings still appear in list (just dimmed) unless ALL filter is deselected
- [ ] tsc --noEmit clean, npm run build clean

## Files to touch
- frontend/src/app/rings/page.tsx — add hover state, action buttons, status state machine

## Done
tsc --noEmit passes, npm run build passes.
git add -A && git commit -m "feat: F-35 ring queue inline actions + state machine (NEW→UNDER_REVIEW→REFERRED→DISMISSED)" && git push origin sprint-frontend
Write to /Users/mikeclaw/Projects/fraudgraph-frontend/progress.md:
FORGE_DONE: F-35 ring queue inline actions + state machine
