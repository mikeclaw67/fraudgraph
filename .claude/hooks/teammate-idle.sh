#!/bin/bash
# TeammateIdle hook: if teammate is idle and there are pending tasks, keep them working
TASK_FILE="/Users/mikeclaw/Projects/fraudgraph-frontend/team/tasks.md"
if grep -q "^- \[ \]" "$TASK_FILE" 2>/dev/null; then
  echo "There are still pending tasks in team/tasks.md. Claim the next one and implement it."
  exit 2
fi
exit 0
