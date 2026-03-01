# Procurement Fraud Schema — government contract fraud detection.
# Third schema demonstrating Foundry-style ontology swap: vendors, contracts,
# agencies. Detects bid-rigging, shell companies, revolving-door relationships.

SCHEMA = {
    "name": "procurement",
    "display_name": "Government Procurement Fraud",
    "description": "Federal/state contract fraud — bid rigging, shell vendors, split purchases, revolving door.",
    "entity_types": {
        "Vendor": {"id_field": "duns", "display_field": "vendor_name"},
        "Contract": {"id_field": "contract_id", "display_field": "contract_title"},
        "Agency": {"id_field": "agency_id", "display_field": "agency_name"},
        "Officer": {"id_field": "officer_id", "display_field": "officer_name"},
        "Address": {"id_field": "address_hash", "display_field": "full_address"},
    },
    "link_types": [
        {"type": "VENDOR_AWARDED", "source": "Vendor", "target": "Contract"},
        {"type": "AGENCY_ISSUED", "source": "Agency", "target": "Contract"},
        {"type": "OFFICER_APPROVED", "source": "Officer", "target": "Contract"},
        {"type": "VENDOR_AT_ADDRESS", "source": "Vendor", "target": "Address"},
        {"type": "ADDRESS_SHARED_BY", "source": "Address", "target": "Vendor"},
        {"type": "OFFICER_FORMERLY_AT", "source": "Officer", "target": "Vendor"},
    ],
    "rules": [
        "BID_ROTATION",
        "SHELL_VENDOR",
        "SPLIT_PURCHASE",
        "REVOLVING_DOOR",
        "SOLE_SOURCE_CLUSTER",
        "ADDRESS_REUSE",
    ],
    "thresholds": {
        "micro_purchase_threshold": 10_000.0,
        "simplified_acquisition_threshold": 250_000.0,
    },
    "record_fields": [
        "vendor_duns", "vendor_name", "contract_id", "contract_title",
        "agency_id", "agency_name", "award_amount", "award_date",
        "officer_id", "officer_name", "vendor_address", "contract_type",
    ],
}
