# FraudGraph Frontend — Progress

**Status:** FORGE_DONE — F-34 Investigation Agent Streaming UI complete

## Current Sprint (S6)

### Just Shipped
- **F-34: Investigation Agent UX — Streaming Panel** ✅
  - InvestigationPanel component with WebSocket streaming
  - Real-time step rendering (tool_call → purple, finding → blue)
  - Auto-scroll timeline, structured findings panel on completion
  - Integrated at 340px height below Evidence Graph
  - Build passes: tsc + npm run build clean
  - Note: Requires backend API on :8000 for live testing

- **F-36: Entity 360 Drawer** (75ae3df) ✅
  - Click entity → inline right-panel profile, URL sync, ESC closes

- **F-37: Graph PNG export + Referral Package ZIP** (57cb42c) ✅
  - Already merged from b74cf61

## Recently Shipped
- F-33–F-30: Visual polish, QA fixes, demo scripts
- F-29: Risk score breakdown panel
- F-28: Palantir visual parity (design tokens)

## On Deck
- F-35: Ring Queue inline actions + state machine

## Infrastructure
- Next.js 15 frontend running on :3000 ✅
- Ring Detail routing working (/rings/[id] returns 200) ✅
- FastAPI backend on :8000 — required for WebSocket streaming
