# PPP/EIDL Loan Fraud Schema — primary schema for FraudGraph MVP.
# Defines the entity ontology, link semantics, and rule bindings for
# Paycheck Protection Program and Economic Injury Disaster Loan fraud detection.

SCHEMA = {
    "name": "ppp_loans",
    "display_name": "PPP / EIDL Loan Fraud",
    "description": "COVID-era SBA loan fraud detection — address farms, EIN recycling, straw companies, threshold gaming.",
    "entity_types": {
        "Borrower": {"id_field": "borrower_id", "display_field": "borrower_name"},
        "Business": {"id_field": "ein", "display_field": "business_name"},
        "LoanApplication": {"id_field": "loan_id", "display_field": "loan_program"},
        "BankAccount": {"id_field": "bank_account", "display_field": "bank_routing"},
        "Address": {"id_field": "address_hash", "display_field": "full_address"},
    },
    "link_types": [
        {"type": "BORROWER_OWNS_BUSINESS", "source": "Borrower", "target": "Business"},
        {"type": "BUSINESS_APPLIED_FOR", "source": "Business", "target": "LoanApplication"},
        {"type": "APPLICATION_DEPOSITED_TO", "source": "LoanApplication", "target": "BankAccount"},
        {"type": "BORROWER_LIVES_AT", "source": "Borrower", "target": "Address"},
        {"type": "BUSINESS_LOCATED_AT", "source": "Business", "target": "Address"},
        {"type": "ADDRESS_SHARED_BY", "source": "Address", "target": "Business"},
        {"type": "ACCOUNT_SHARED_BY", "source": "BankAccount", "target": "Business"},
    ],
    "rules": [
        "ADDR_REUSE",
        "EIN_REUSE",
        "STRAW_CO",
        "THRESHOLD_GAME",
        "ACCOUNT_SHARE",
        "NEW_EIN",
    ],
    "thresholds": {
        "sba_review_amount": 150_000.0,
        "suspicious_threshold_band": (145_000.0, 149_999.99),
    },
    "record_fields": [
        "borrower_id", "borrower_name", "ssn_last4", "business_name", "ein",
        "business_address", "business_city", "business_state", "business_zip",
        "employee_count", "business_age_months", "loan_program", "loan_amount",
        "loan_date", "lender_name", "bank_routing", "bank_account",
        "naics_code", "industry", "fraud_label", "fraud_type",
    ],
}
