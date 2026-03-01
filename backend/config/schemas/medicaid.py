# Medicaid Fraud Schema — demonstrates the Foundry generalization pattern.
# Same pipeline, different ontology: providers, claims, beneficiaries replace
# borrowers, loans, businesses. Rules rebind to healthcare-specific patterns.

SCHEMA = {
    "name": "medicaid",
    "display_name": "Medicaid Claims Fraud",
    "description": "Healthcare fraud detection — phantom billing, upcoding, patient mills, kickback networks.",
    "entity_types": {
        "Provider": {"id_field": "npi", "display_field": "provider_name"},
        "Beneficiary": {"id_field": "beneficiary_id", "display_field": "beneficiary_name"},
        "Claim": {"id_field": "claim_id", "display_field": "procedure_code"},
        "Facility": {"id_field": "facility_id", "display_field": "facility_name"},
        "Address": {"id_field": "address_hash", "display_field": "full_address"},
    },
    "link_types": [
        {"type": "PROVIDER_SUBMITTED", "source": "Provider", "target": "Claim"},
        {"type": "CLAIM_FOR_BENEFICIARY", "source": "Claim", "target": "Beneficiary"},
        {"type": "PROVIDER_AT_FACILITY", "source": "Provider", "target": "Facility"},
        {"type": "FACILITY_AT_ADDRESS", "source": "Facility", "target": "Address"},
        {"type": "ADDRESS_SHARED_BY", "source": "Address", "target": "Provider"},
    ],
    "rules": [
        "PHANTOM_BILLING",
        "UPCODING",
        "PATIENT_MILL",
        "IMPOSSIBLE_DAYS",
        "KICKBACK_NETWORK",
        "EXCLUDED_PROVIDER",
    ],
    "thresholds": {
        "max_daily_claims": 50,
        "impossible_service_hours": 24,
    },
    "record_fields": [
        "provider_npi", "provider_name", "beneficiary_id", "beneficiary_name",
        "claim_id", "procedure_code", "diagnosis_code", "service_date",
        "billed_amount", "facility_id", "facility_name", "facility_address",
    ],
}
