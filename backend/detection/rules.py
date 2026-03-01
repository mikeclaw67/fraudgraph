# Detection Rules Engine — six deterministic fraud rules for PPP/EIDL loan analysis.
# Each rule evaluates a single loan application record (or a batch of records with
# cross-reference context) and returns a RuleResult with fired status, severity,
# and human-readable details. Rules are stateless functions designed for pipeline
# composition — the scoring layer aggregates them into a composite risk score.

from __future__ import annotations

import hashlib
from collections import Counter
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Severity(str, Enum):
    """Alert severity — maps directly to investigator triage priority."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass
class RuleResult:
    """Outcome of a single rule evaluation against a record."""
    rule_name: str
    fired: bool
    severity: Severity | None = None
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "rule_name": self.rule_name,
            "fired": self.fired,
            "severity": self.severity.value if self.severity else None,
            "details": self.details,
        }


def _normalize_address(record: dict) -> str:
    """Create a canonical address key for deduplication."""
    parts = [
        record.get("business_address", "").strip().lower(),
        record.get("business_city", "").strip().lower(),
        record.get("business_state", "").strip().upper(),
        record.get("business_zip", "").strip()[:5],
    ]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Context builders — pre-compute cross-record lookups for batch evaluation
# ---------------------------------------------------------------------------

def build_context(records: list[dict]) -> dict:
    """Build cross-reference counters needed by rules that compare across records.

    Returns a context dict with:
        address_counts: Counter of normalized address -> count of businesses
        ein_counts: Counter of EIN -> count of businesses
        routing_counts: Counter of bank_routing -> count of businesses
    """
    address_counts: Counter = Counter()
    ein_counts: Counter = Counter()
    routing_counts: Counter = Counter()

    for r in records:
        addr_key = _normalize_address(r)
        address_counts[addr_key] += 1

        ein = r.get("ein", "")
        if ein:
            ein_counts[ein] += 1

        routing = r.get("bank_routing", "")
        if routing:
            routing_counts[routing] += 1

    return {
        "address_counts": address_counts,
        "ein_counts": ein_counts,
        "routing_counts": routing_counts,
    }


# ---------------------------------------------------------------------------
# Rule 1: ADDR_REUSE — address shared by > N businesses
# ---------------------------------------------------------------------------

def rule_addr_reuse(record: dict, context: dict, threshold: int = 3) -> RuleResult:
    """Flag addresses shared by more than `threshold` businesses."""
    addr_key = _normalize_address(record)
    count = context["address_counts"].get(addr_key, 0)
    fired = count > threshold
    return RuleResult(
        rule_name="ADDR_REUSE",
        fired=fired,
        severity=Severity.HIGH if fired else None,
        details={
            "address_hash": addr_key,
            "shared_count": count,
            "threshold": threshold,
            "message": f"Address shared by {count} businesses (threshold: >{threshold})" if fired else "",
        },
    )


# ---------------------------------------------------------------------------
# Rule 2: EIN_REUSE — EIN appears on > 1 business
# ---------------------------------------------------------------------------

def rule_ein_reuse(record: dict, context: dict, threshold: int = 1) -> RuleResult:
    """Flag EINs used by more than `threshold` businesses."""
    ein = record.get("ein", "")
    count = context["ein_counts"].get(ein, 0)
    fired = count > threshold
    return RuleResult(
        rule_name="EIN_REUSE",
        fired=fired,
        severity=Severity.CRITICAL if fired else None,
        details={
            "ein": ein,
            "reuse_count": count,
            "threshold": threshold,
            "message": f"EIN {ein} used by {count} businesses" if fired else "",
        },
    )


# ---------------------------------------------------------------------------
# Rule 3: STRAW_CO — zero employees, new business, high loan amount
# ---------------------------------------------------------------------------

def rule_straw_company(
    record: dict,
    context: dict,
    max_employees: int = 0,
    max_age_months: int = 6,
    min_amount: float = 100_000.0,
) -> RuleResult:
    """Flag straw companies: 0 employees, young business, large loan."""
    employees = record.get("employee_count", 0)
    age = record.get("business_age_months", 999)
    amount = record.get("loan_amount", 0.0)

    fired = (employees <= max_employees and age < max_age_months and amount > min_amount)
    return RuleResult(
        rule_name="STRAW_CO",
        fired=fired,
        severity=Severity.HIGH if fired else None,
        details={
            "employee_count": employees,
            "business_age_months": age,
            "loan_amount": amount,
            "message": (
                f"Straw company indicators: {employees} employees, "
                f"{age}mo old, ${amount:,.0f} loan"
            ) if fired else "",
        },
    )


# ---------------------------------------------------------------------------
# Rule 4: THRESHOLD_GAME — loan clustered near $150K SBA review threshold
# ---------------------------------------------------------------------------

def rule_threshold_game(
    record: dict,
    context: dict,
    min_amount: float = 145_000.0,
    max_amount: float = 149_999.99,
) -> RuleResult:
    """Flag amounts suspiciously near the SBA review threshold."""
    amount = record.get("loan_amount", 0.0)
    fired = min_amount <= amount <= max_amount
    return RuleResult(
        rule_name="THRESHOLD_GAME",
        fired=fired,
        severity=Severity.MEDIUM if fired else None,
        details={
            "loan_amount": amount,
            "threshold_band": [min_amount, max_amount],
            "message": f"Loan ${amount:,.2f} clustered near $150K SBA threshold" if fired else "",
        },
    )


# ---------------------------------------------------------------------------
# Rule 5: ACCOUNT_SHARE — bank routing shared by > N businesses
# ---------------------------------------------------------------------------

def rule_account_share(record: dict, context: dict, threshold: int = 2) -> RuleResult:
    """Flag bank routing numbers shared by too many businesses."""
    routing = record.get("bank_routing", "")
    count = context["routing_counts"].get(routing, 0)
    fired = count > threshold
    return RuleResult(
        rule_name="ACCOUNT_SHARE",
        fired=fired,
        severity=Severity.HIGH if fired else None,
        details={
            "bank_routing": routing,
            "shared_count": count,
            "threshold": threshold,
            "message": f"Routing {routing} shared by {count} businesses" if fired else "",
        },
    )


# ---------------------------------------------------------------------------
# Rule 6: NEW_EIN — EIN registered < 30 days before loan application
# ---------------------------------------------------------------------------

def rule_new_ein(record: dict, context: dict, max_days: int = 30) -> RuleResult:
    """Flag EINs registered very recently before loan application.

    Uses business_age_months as a proxy: if business is less than 1 month old
    at time of application, the EIN was effectively just created.
    """
    age_months = record.get("business_age_months", 999)
    # Convert max_days to approximate month threshold
    age_days_approx = age_months * 30
    fired = age_days_approx < max_days
    return RuleResult(
        rule_name="NEW_EIN",
        fired=fired,
        severity=Severity.MEDIUM if fired else None,
        details={
            "business_age_months": age_months,
            "age_days_approx": age_days_approx,
            "max_days": max_days,
            "message": f"EIN registered ~{age_days_approx} days before application" if fired else "",
        },
    )


# ---------------------------------------------------------------------------
# Rule registry — all rules in evaluation order
# ---------------------------------------------------------------------------

ALL_RULES = [
    rule_addr_reuse,
    rule_ein_reuse,
    rule_straw_company,
    rule_threshold_game,
    rule_account_share,
    rule_new_ein,
]

RULE_NAMES = [
    "ADDR_REUSE", "EIN_REUSE", "STRAW_CO",
    "THRESHOLD_GAME", "ACCOUNT_SHARE", "NEW_EIN",
]


def evaluate_record(record: dict, context: dict) -> list[RuleResult]:
    """Run all rules against a single record, return list of results."""
    return [rule(record, context) for rule in ALL_RULES]


def evaluate_batch(records: list[dict]) -> dict[str, list[RuleResult]]:
    """Run all rules against a batch of records.

    Returns a dict mapping borrower_id -> list of RuleResults.
    Automatically builds cross-reference context from the batch.
    """
    context = build_context(records)
    results = {}
    for record in records:
        bid = record.get("borrower_id", "unknown")
        results[bid] = evaluate_record(record, context)
    return results
