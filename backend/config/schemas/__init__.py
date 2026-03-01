# Fraud schema registry — config-driven ontology swap (the Foundry pattern).
# Import the active schema by name to switch detection pipelines:
# PPP Loans → Medicaid Claims → Procurement Contracts.

from backend.config.schemas.ppp_loans import SCHEMA as PPP_SCHEMA
from backend.config.schemas.medicaid import SCHEMA as MEDICAID_SCHEMA
from backend.config.schemas.procurement import SCHEMA as PROCUREMENT_SCHEMA

SCHEMAS = {
    "ppp_loans": PPP_SCHEMA,
    "medicaid": MEDICAID_SCHEMA,
    "procurement": PROCUREMENT_SCHEMA,
}


def get_schema(name: str) -> dict:
    """Get a fraud schema by name. Raises KeyError if not found."""
    return SCHEMAS[name]
