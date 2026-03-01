# Task: F-18 — Palantir Visual Parity — Real Design Tokens

Read CLAUDE.md first. This is NOT a minor polish — the entire color system was wrong.

## Context
We analyzed 79 frames from 3 real Palantir demos. Our color scheme was wrong:
- Background #0F1117 looks like GitHub dark mode / generic SaaS
- Real Palantir uses #263238 (desaturated teal-charcoal — blue-steel)
- Our font Inter makes it look like Linear/Notion — real Palantir uses system-ui for data
- Our accent blue #2A6EBB is too dim — real is #2196F3
- The sidebar MUST be icon-only (no text labels, ever)

## Token file (source of truth)
/Users/mikeclaw/Projects/fraudgraph/qa/reference/PALANTIR_DESIGN_TOKENS.md
Read this file completely before touching any CSS.

## What to Change

### 1. globals.css / tailwind.config.ts
Replace all custom colors with the design tokens:
--bg-primary:   #263238
--bg-panel:     #2C3539
--bg-sidebar:   #1A1F23
--accent:       #2196F3
--critical:     #E53935
--text-1:       #ECEFF1
--text-2:       #90A4AE
--border-1:     #37474F

### 2. Font
Replace Inter with system-ui stack for data:
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif
Add Barlow Condensed (from Google Fonts) for headings/display only.

### 3. Sidebar
REMOVE all text labels. Icon only. 48px wide.
Add left 3px blue bar on active item.
Background: #1A1F23

### 4. Table rows
32px height, 12px font, 11px uppercase headers with letter-spacing: 1px.

### 5. Badges/status pills
0px border-radius (rectangles, not pills).
Use exact colors from token file.

### 6. Apply globally — every page
/rings, /rings/[id], /cases, /analytics

## Verification
After implementing: tsc --noEmit and npm run build — zero errors.
git add -A && git commit -m "feat: Palantir visual parity — real design tokens from demo analysis" && git push origin sprint-frontend

Write to progress.md: FORGE_DONE: Real Palantir design tokens implemented. System-ui font, teal-charcoal bg, icon-only sidebar.

## Done When
- [ ] All colors match design tokens (teal-charcoal #263238 bg, not #0F1117)
- [ ] Font is system-ui, not Inter
- [ ] Sidebar is icon-only, 48px wide, 3px left blue bar on active
- [ ] Tables: 32px rows, 12px font, 11px uppercase headers
- [ ] Badges: 0px border-radius (rectangles)
- [ ] All 4 pages updated (/rings, /rings/[id], /cases, /analytics)
- [ ] tsc --noEmit passes clean
- [ ] npm run build passes clean
- [ ] Committed + pushed to sprint-frontend
- [ ] FORGE_DONE written to progress.md
