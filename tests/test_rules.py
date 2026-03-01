# Test suite for the FraudGraph detection rules engine.
# Covers all 6 deterministic fraud rules with known fraud cases and clean cases.
# Each test constructs a minimal dataset, builds context, and verifies that
# the correct rules fire (or don't fire) with the expected severity.

from __future__ import annotations

import uuid

import pytest

from backend.detection.rules import (
    ALL_RULES,
    Severity,
    build_context,
    evaluate_batch,
    evaluate_record,
    rule_account_share,
    rule_addr_reuse,
    rule_ein_reuse,
    rule_new_ein,
    rule_straw_company,
    rule_threshold_game,
)


# ---------------------------------------------------------------------------
# Fixtures — reusable record builders
# ---------------------------------------------------------------------------

def _make_record(**overrides) -> dict:
    """Build a base loan record with sensible defaults, applying overrides."""
    record = {
        "borrower_id": str(uuid.uuid4()),
        "borrower_name": "Test Borrower",
        "ssn_last4": "1234",
        "business_name": "Test Business LLC",
        "ein": "12-3456789",
        "business_address": "100 Main St",
        "business_city": "Springfield",
        "business_state": "IL",
        "business_zip": "62704",
        "employee_count": 10,
        "business_age_months": 36,
        "loan_program": "PPP",
        "loan_amount": 50_000.0,
        "loan_date": "2020-06-15",
        "lender_name": "Test Bank",
        "bank_routing": "123456789",
        "bank_account": "9876543210",
        "naics_code": "541110",
        "industry": "Offices of Lawyers",
        "fraud_label": False,
        "fraud_type": None,
    }
    record.update(overrides)
    return record


# ---------------------------------------------------------------------------
# Rule 1: ADDR_REUSE
# ---------------------------------------------------------------------------

class TestAddrReuse:
    """Tests for the address reuse detection rule."""

    def test_fires_when_address_shared_by_more_than_threshold(self):
        """4+ businesses at same address should trigger ADDR_REUSE."""
        shared_addr = {
            "business_address": "100 Main St Suite 200",
            "business_city": "Springfield",
            "business_state": "IL",
            "business_zip": "62704",
        }
        records = [_make_record(**shared_addr, ein=f"10-000000{i}") for i in range(5)]
        context = build_context(records)

        result = rule_addr_reuse(records[0], context, threshold=3)
        assert result.fired is True
        assert result.severity == Severity.HIGH
        assert result.details["shared_count"] == 5

    def test_does_not_fire_below_threshold(self):
        """2 businesses at same address should NOT trigger (threshold=3)."""
        shared_addr = {
            "business_address": "200 Oak Ave",
            "business_city": "Denver",
            "business_state": "CO",
            "business_zip": "80201",
        }
        records = [_make_record(**shared_addr, ein=f"20-000000{i}") for i in range(2)]
        context = build_context(records)

        result = rule_addr_reuse(records[0], context, threshold=3)
        assert result.fired is False
        assert result.severity is None

    def test_different_addresses_do_not_trigger(self):
        """Records with unique addresses should not fire."""
        records = [
            _make_record(business_address=f"{i} Unique St", business_city=f"City{i}")
            for i in range(10)
        ]
        context = build_context(records)

        for r in records:
            result = rule_addr_reuse(r, context, threshold=3)
            assert result.fired is False


# ---------------------------------------------------------------------------
# Rule 2: EIN_REUSE
# ---------------------------------------------------------------------------

class TestEinReuse:
    """Tests for the EIN recycling detection rule."""

    def test_fires_when_ein_used_by_multiple_businesses(self):
        """Same EIN on 3 records should trigger EIN_REUSE (threshold=1)."""
        recycled_ein = "99-1234567"
        records = [
            _make_record(ein=recycled_ein, business_name=f"Biz {i}")
            for i in range(3)
        ]
        context = build_context(records)

        result = rule_ein_reuse(records[0], context, threshold=1)
        assert result.fired is True
        assert result.severity == Severity.CRITICAL
        assert result.details["reuse_count"] == 3

    def test_does_not_fire_for_unique_ein(self):
        """Unique EINs should not trigger."""
        records = [_make_record(ein=f"10-{i:07d}") for i in range(5)]
        context = build_context(records)

        result = rule_ein_reuse(records[0], context, threshold=1)
        assert result.fired is False


# ---------------------------------------------------------------------------
# Rule 3: STRAW_CO
# ---------------------------------------------------------------------------

class TestStrawCompany:
    """Tests for the straw company detection rule."""

    def test_fires_for_straw_company_profile(self):
        """0 employees, <6mo, >$100K should trigger STRAW_CO."""
        record = _make_record(
            employee_count=0,
            business_age_months=3,
            loan_amount=125_000.0,
        )
        context = build_context([record])

        result = rule_straw_company(record, context)
        assert result.fired is True
        assert result.severity == Severity.HIGH

    def test_does_not_fire_with_employees(self):
        """Business with employees should not trigger even if young + high loan."""
        record = _make_record(
            employee_count=5,
            business_age_months=3,
            loan_amount=125_000.0,
        )
        context = build_context([record])

        result = rule_straw_company(record, context)
        assert result.fired is False

    def test_does_not_fire_for_established_business(self):
        """Old business with 0 employees and high loan should not trigger."""
        record = _make_record(
            employee_count=0,
            business_age_months=24,
            loan_amount=125_000.0,
        )
        context = build_context([record])

        result = rule_straw_company(record, context)
        assert result.fired is False

    def test_does_not_fire_for_small_loan(self):
        """Young business with 0 employees but small loan should not trigger."""
        record = _make_record(
            employee_count=0,
            business_age_months=3,
            loan_amount=50_000.0,
        )
        context = build_context([record])

        result = rule_straw_company(record, context)
        assert result.fired is False


# ---------------------------------------------------------------------------
# Rule 4: THRESHOLD_GAME
# ---------------------------------------------------------------------------

class TestThresholdGame:
    """Tests for the threshold gaming detection rule."""

    def test_fires_in_threshold_band(self):
        """Loan at $147K should trigger THRESHOLD_GAME."""
        record = _make_record(loan_amount=147_000.0)
        context = build_context([record])

        result = rule_threshold_game(record, context)
        assert result.fired is True
        assert result.severity == Severity.MEDIUM

    def test_fires_at_exact_lower_bound(self):
        """Loan at exactly $145K should trigger."""
        record = _make_record(loan_amount=145_000.0)
        context = build_context([record])

        result = rule_threshold_game(record, context)
        assert result.fired is True

    def test_does_not_fire_below_band(self):
        """Loan at $140K should NOT trigger."""
        record = _make_record(loan_amount=140_000.0)
        context = build_context([record])

        result = rule_threshold_game(record, context)
        assert result.fired is False

    def test_does_not_fire_above_band(self):
        """Loan at $150K should NOT trigger (above the band)."""
        record = _make_record(loan_amount=150_000.0)
        context = build_context([record])

        result = rule_threshold_game(record, context)
        assert result.fired is False


# ---------------------------------------------------------------------------
# Rule 5: ACCOUNT_SHARE
# ---------------------------------------------------------------------------

class TestAccountShare:
    """Tests for the shared bank account detection rule."""

    def test_fires_when_routing_shared_by_many(self):
        """3+ businesses with same routing should trigger ACCOUNT_SHARE."""
        shared_routing = "999888777"
        records = [
            _make_record(bank_routing=shared_routing, ein=f"30-000000{i}")
            for i in range(4)
        ]
        context = build_context(records)

        result = rule_account_share(records[0], context, threshold=2)
        assert result.fired is True
        assert result.severity == Severity.HIGH
        assert result.details["shared_count"] == 4

    def test_does_not_fire_for_unique_routing(self):
        """Unique routing numbers should not trigger."""
        records = [_make_record(bank_routing=f"{i:09d}") for i in range(5)]
        context = build_context(records)

        result = rule_account_share(records[0], context, threshold=2)
        assert result.fired is False


# ---------------------------------------------------------------------------
# Rule 6: NEW_EIN
# ---------------------------------------------------------------------------

class TestNewEin:
    """Tests for the new EIN detection rule."""

    def test_fires_for_brand_new_ein(self):
        """Business age 0 months (<30 days) should trigger NEW_EIN."""
        record = _make_record(business_age_months=0)
        context = build_context([record])

        result = rule_new_ein(record, context, max_days=30)
        assert result.fired is True
        assert result.severity == Severity.MEDIUM

    def test_does_not_fire_for_established_business(self):
        """Business age 12 months should NOT trigger."""
        record = _make_record(business_age_months=12)
        context = build_context([record])

        result = rule_new_ein(record, context, max_days=30)
        assert result.fired is False


# ---------------------------------------------------------------------------
# Integration: evaluate_record and evaluate_batch
# ---------------------------------------------------------------------------

class TestEvaluateRecord:
    """Integration tests for full record evaluation."""

    def test_clean_record_fires_no_rules(self):
        """A clean record with unique attributes should fire 0 rules."""
        record = _make_record(
            employee_count=10,
            business_age_months=36,
            loan_amount=50_000.0,
        )
        context = build_context([record])

        results = evaluate_record(record, context)
        fired = [r for r in results if r.fired]
        assert len(fired) == 0

    def test_maximum_fraud_record_fires_multiple_rules(self):
        """A record designed to trigger multiple rules should fire several."""
        # This record is a straw company with threshold gaming
        record = _make_record(
            employee_count=0,
            business_age_months=0,
            loan_amount=147_000.0,
        )
        context = build_context([record])

        results = evaluate_record(record, context)
        fired = [r for r in results if r.fired]
        fired_names = {r.rule_name for r in fired}

        assert "STRAW_CO" in fired_names
        assert "THRESHOLD_GAME" in fired_names
        assert "NEW_EIN" in fired_names
        assert len(fired) >= 3


class TestEvaluateBatch:
    """Tests for batch evaluation across multiple records."""

    def test_batch_detects_address_farm(self):
        """Batch with address farm pattern should flag shared addresses."""
        shared_addr = {
            "business_address": "500 Fraud Blvd Suite 1",
            "business_city": "Scamtown",
            "business_state": "FL",
            "business_zip": "33101",
        }
        # 5 businesses at same address (threshold=3)
        fraud_records = [
            _make_record(**shared_addr, ein=f"50-000000{i}")
            for i in range(5)
        ]
        clean_records = [_make_record() for _ in range(10)]
        batch = fraud_records + clean_records

        results = evaluate_batch(batch)

        # Check that fraud records have ADDR_REUSE fired
        for fr in fraud_records:
            bid = fr["borrower_id"]
            fired_names = {r.rule_name for r in results[bid] if r.fired}
            assert "ADDR_REUSE" in fired_names

    def test_batch_returns_all_records(self):
        """Batch should return results for every record."""
        records = [_make_record() for _ in range(20)]
        results = evaluate_batch(records)
        assert len(results) == 20
