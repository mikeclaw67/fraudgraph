# Task: Ring Queue Page (/rings)

Read CLAUDE.md and REDESIGN.md first.

Build ONLY: frontend/src/app/rings/page.tsx
- Full-width table of fraud rings sorted by dollar exposure
- Ring type badges: 🏠 ADDRESS FARM | 🏦 ACCOUNT CLUSTER | 🔢 EIN RECYCLER | 👻 STRAW COMPANY | 🎯 THRESHOLD GAMING
- Columns: Type | Smoking Gun (shared address/account text) | Members | Exposure ($) | Risk Score | Status | Investigator
- Top stats bar: TOTAL RINGS | UNREVIEWED | TOTAL EXPOSURE | REFERRED TO DOJ
- Colors: bg #0F1117, panels #1A1D27, accent #2A6EBB, critical red #C94B4B
- Zero rounded corners, dense 12px tabular layout
- Hardcode 20 realistic PPP fraud ring rows as mock data
- Clicking a row links to /rings/[id]
- npm run build must pass

When done: git add -A && git commit -m "feat: Ring Queue page" && git push origin sprint-frontend
Then write "ITERATION_DONE: Ring Queue" to progress.md
