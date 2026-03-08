# Analytics configuration — assumptions locked for MVP.
# Recovery rate, conviction rate, salary, and investigator roles.
# All values approved by EM (2026-03-07). Configurable in Phase 2.

from __future__ import annotations

# Financial assumptions
RECOVERY_RATE = 0.50  # 50% of referred exposure recovered
CONVICTION_RATE = 0.50  # 50% of referred cases result in conviction
ANNUAL_SALARY_PER_INVESTIGATOR = 130_000  # $130K fully-loaded

# Capacity
CASES_PER_INVESTIGATOR_MAX = 10

# Investigator roles — matches triage_engine.py ASSIGNEES
INVESTIGATOR_ROLES: dict[str, str] = {
    "alice": "Senior",
    "bob": "Mid",
    "carol": "Junior",
}
