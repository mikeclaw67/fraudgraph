# CLAUDE.md — FraudGraph Frontend

## What This Is
Palantir-style government fraud investigation UI. Ring-first architecture.
Target: impress a current Palantir engineer. Real product, not a demo.
Stack: Next.js 15 + TypeScript + Tailwind + Sigma.js

## Git (Non-Negotiable)
After EVERY meaningful change:
git add -A && git commit -m "feat: <what + why>" && git push origin $(git branch --show-current)
GitHub must always reflect current state.

## Before Writing Any Code
1. Run: cd frontend && npx tsc --noEmit — fix ALL errors first
2. Read the existing page you're modifying — understand what's there
3. Check: does this task conflict with any other file being touched?

## After Every File Write
Run: cd frontend && npx tsc --noEmit
Fix ALL type errors before moving to the next file. No exceptions.

## Build Must Pass
cd frontend && npm run build — must be clean before committing.
If build fails: fix it before doing anything else.

## Style Rules
- Palantir blue-steel aesthetic: bg #263238, panels #2C3539, sidebar #1A1F23
- Accent: #2196F3, Critical: #E53935
- Font: system-ui for data, Barlow Condensed for headings
- No markdown tables — bullet lists only
- Tailwind classes only — no inline styles
- TypeScript strict mode — no `any` types
- Component files under 200 lines — split when larger
- All badges: 0px radius rectangles, 10px uppercase
- Tables: 32px rows, 12px font, 11px uppercase headers

## Architecture
- App router (Next.js 15) — pages in frontend/src/app/
- Shared components in frontend/src/components/
- Ring-first: /rings is homepage, /rings/[id] is the investigation workspace
- Design tokens defined in globals.css @theme inline block

## Done Signal
1. npx tsc --noEmit passes clean
2. npm run build passes clean
3. git add -A && git commit && git push
4. Write FORGE_DONE: <what was built> to progress.md
5. openclaw system event --text "Done: <summary>" --mode now
