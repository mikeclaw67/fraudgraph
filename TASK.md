# Task: Ring Detail Page (/rings/[id])

Read CLAUDE.md and REDESIGN.md first.
Working in worktree: /Users/mikeclaw/Projects/fraudgraph-ring-detail (branch: sprint-ring-detail)

Build ONLY: frontend/src/app/rings/[id]/page.tsx
Three-panel layout:
LEFT (280px): Smoking gun callout box — bright red border, shows the shared evidence (address/account/EIN), property record context
CENTER: Ring members table — all businesses in ring, shared element shown in red on each row, click row opens right panel
RIGHT (360px, slides in): Borrower 360 panel — loan details, other rings, risk flags, notes field
BELOW table: Sigma.js evidence graph — ring members as nodes around central shared-address node, node size = loan amount
BOTTOM: Action bar — [Open Full Case] [Export Evidence Package] [Dismiss Ring]

Colors: bg #0F1117, panels #1A1D27, accent #2A6EBB, smoking gun #C94B4B with red border
Zero rounded corners, dense layout
Use mock data for ring id "ring-001"

When done: git add -A && git commit -m "feat: Ring Detail page" && git push origin sprint-ring-detail
Then write "ITERATION_DONE: Ring Detail" to progress.md
