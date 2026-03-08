#!/usr/bin/env python3
# Demo Seeder — populates 5 realistic fraud rings with entities, transactions,
# and detection results for the FraudGraph demo environment. Each ring models a
# real-world fraud pattern with interconnected entities that trigger the detection
# rules engine. Idempotent: clears and re-seeds on every run.

from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.api.alerts import set_alert_store
from backend.api.entities import set_alert_index, set_entity_store
from backend.api.graph import build_graph_from_records, set_graph_data
from backend.api.rings import set_ring_store
from backend.detection.alerts import generate_alerts_batch, deduplicate_alerts
from backend.detection.rules import build_context, evaluate_batch
from backend.detection.scoring import score_batch

random.seed(42)


# ---------------------------------------------------------------------------
# Ring definitions — 5 curated fraud scenarios
# ---------------------------------------------------------------------------

def _make_entity(
    *,
    borrower_name: str,
    business_name: str,
    ein: str,
    address: str,
    city: str,
    state: str,
    zipcode: str,
    employee_count: int,
    business_age_months: int,
    loan_amount: float,
    loan_program: str = "PPP",
    loan_date: str = "2020-08-15",
    lender: str = "Cross River Bank",
    bank_routing: str = "",
    bank_account: str = "",
    naics_code: str = "541110",
    industry: str = "Offices of Lawyers",
    fraud_label: bool = True,
    fraud_type: str | None = None,
) -> dict[str, Any]:
    """Build a single entity record with all required LoanRecord fields."""
    return {
        "borrower_id": str(uuid.uuid4()),
        "borrower_name": borrower_name,
        "ssn_last4": f"{random.randint(1000, 9999)}",
        "business_name": business_name,
        "ein": ein,
        "business_address": address,
        "business_city": city,
        "business_state": state,
        "business_zip": zipcode,
        "employee_count": employee_count,
        "business_age_months": business_age_months,
        "loan_program": loan_program,
        "loan_amount": loan_amount,
        "loan_date": loan_date,
        "lender_name": lender,
        "bank_routing": bank_routing or f"{random.randint(100000000, 999999999)}",
        "bank_account": bank_account or f"{random.randint(10000000, 9999999999)}",
        "naics_code": naics_code,
        "industry": industry,
        "fraud_label": fraud_label,
        "fraud_type": fraud_type,
    }


def _build_ring_001() -> tuple[dict, list[dict]]:
    """RING-001: Identity Theft Network — $2.1M, 12 entities, CRITICAL.

    Pattern: Same EIN recycled across 4 groups of 3 businesses each.
    All businesses share a common mail forwarding address.
    Triggers: EIN_REUSE (CRITICAL), ADDR_REUSE (HIGH), NEW_EIN (MEDIUM).
    """
    shared_address = "1847 Commerce Blvd Suite 400"
    shared_city, shared_state, shared_zip = "Miami", "FL", "33131"
    recycled_eins = ["77-1234001", "77-1234002", "77-1234003", "77-1234004"]

    entities: list[dict] = []
    names = [
        ("Marcus Williams", "Atlantic Consulting Group"),
        ("Diana Foster", "Bayside Healthcare LLC"),
        ("Raymond Chen", "Pacific Trading Corp"),
        ("Lisa Morales", "Sunrise Medical Services"),
        ("James Patterson", "Metro Financial Advisors"),
        ("Angela Cruz", "Coastal Property Holdings"),
        ("Terrence Jackson", "Southern Logistics Inc"),
        ("Maria Gonzalez", "Freedom Health Services"),
        ("David Park", "Global Trading Solutions"),
        ("Katherine Lee", "Alliance Business Group"),
        ("Robert Mitchell", "Premier Investment Holdings"),
        ("Sandra Thompson", "National Consulting Partners"),
    ]

    for i, (name, biz) in enumerate(names):
        entities.append(_make_entity(
            borrower_name=name,
            business_name=biz,
            ein=recycled_eins[i % 4],
            address=shared_address,
            city=shared_city,
            state=shared_state,
            zipcode=shared_zip,
            employee_count=random.randint(0, 2),
            business_age_months=random.randint(0, 4),
            loan_amount=round(random.uniform(140_000, 200_000), 2),
            loan_date=f"2020-{7 + (i % 3):02d}-{10 + i:02d}",
            lender=random.choice(["Cross River Bank", "Celtic Bank", "Kabbage Inc"]),
            fraud_type="identity_theft",
        ))

    ring = {
        "id": "ring_001",
        "name": "Identity Theft Network",
        "ring_type": "ADDRESS_FARM",
        "common_element": "1847 Commerce Blvd Suite 400, Miami FL 33131",
        "common_element_detail": "Commercial mail forwarding facility. 12 businesses filed PPP loans from this single mailbox address within 72 hours.",
        "status": "ACTIVE",
        "risk_score": 94,
        "total_exposure": 2_100_000,
        "entity_count": 12,
        "member_count": 12,
        "avg_risk_score": 94,
        "assigned_to": None,
        "detected_at": "2024-11-15T08:30:00Z",
        "updated_at": "2025-01-10T14:22:00Z",
        "created_at": "2024-11-15T08:30:00Z",
        "risk_breakdown": {
            "rules": 88,
            "ml": 78,
            "graph": 74,
            "firedRules": ["ADDR_REUSE", "STRAW_CO", "ACCOUNT_SHARE"],
            "mlLabel": "Isolation Forest anomaly"
        }
    }
    return ring, entities


def _build_ring_002() -> tuple[dict, list[dict]]:
    """RING-002: Shell Company Cluster — $1.48M, 8 entities, CRITICAL.

    Pattern: 8 straw companies — 0 employees, <6 months old, loans >$100K.
    All deposit into the same bank account (shared routing number).
    Triggers: STRAW_CO (HIGH), ACCOUNT_SHARE (HIGH), NEW_EIN (MEDIUM).
    """
    shared_routing = "021000089"

    entities: list[dict] = []
    names = [
        ("Victor Petrov", "Zenith Capital Solutions"),
        ("Elena Volkov", "Apex Business Ventures"),
        ("Nikolai Sorokin", "Summit Enterprise Group"),
        ("Irina Kozlov", "Pinnacle Holdings LLC"),
        ("Sergei Ivanov", "Cardinal Business Services"),
        ("Natasha Popov", "Eclipse Consulting Group"),
        ("Dmitri Orlov", "Vanguard Commercial LLC"),
        ("Anya Kovalenko", "Meridian Trade Corp"),
    ]

    for i, (name, biz) in enumerate(names):
        entities.append(_make_entity(
            borrower_name=name,
            business_name=biz,
            ein=f"88-200000{i}",
            address=f"{1200 + i * 10} Industrial Parkway",
            city="Houston",
            state="TX",
            zipcode="77001",
            employee_count=0,
            business_age_months=random.randint(1, 4),
            loan_amount=round(random.uniform(140_000, 210_000), 2),
            loan_date=f"2020-{5 + (i % 4):02d}-{5 + i * 2:02d}",
            lender="Benworth Capital",
            bank_routing=shared_routing,
            naics_code="236220",
            industry="Commercial Construction",
            fraud_type="straw_company",
        ))

    ring = {
        "id": "ring_002",
        "name": "Shell Company Cluster",
        "ring_type": "STRAW_COMPANY",
        "status": "ACTIVE",
        "risk_score": 91,
        "total_exposure": 1_500_000,  # S3: Bumped to meet CRITICAL threshold
        "entity_count": 8,
        "created_at": "2024-12-03T14:15:00Z",
    }
    return ring, entities


def _build_ring_003() -> tuple[dict, list[dict]]:
    """RING-003: Invoice Factoring Scheme — $890K, 15 entities, HIGH.

    Pattern: 15 businesses at 3 shared addresses (5 per address),
    with loan amounts clustered near the $150K SBA review threshold.
    Triggers: ADDR_REUSE (HIGH), THRESHOLD_GAME (MEDIUM).
    """
    addresses = [
        ("2500 Peachtree Road NE Suite 300", "Atlanta", "GA", "30305"),
        ("4100 Spring Valley Road Suite 150", "Dallas", "TX", "75244"),
        ("7700 Forsyth Blvd Suite 200", "St. Louis", "MO", "63105"),
    ]

    entities: list[dict] = []
    names = [
        ("Robert Hayes", "Premier Invoice Solutions"),
        ("Jennifer Liu", "Capital Factoring Group"),
        ("Michael Torres", "American Trade Finance"),
        ("Sarah Watson", "Riverdale Business Credit"),
        ("Christopher Adams", "National Factoring Corp"),
        ("Amanda Peters", "Heritage Financial Services"),
        ("Daniel Kim", "Pacific Factor LLC"),
        ("Jessica Brown", "Midwest Capital Funding"),
        ("Thomas Wright", "Atlantic Commercial Credit"),
        ("Michelle Davis", "Continental Business Fund"),
        ("Andrew Clark", "Landmark Financial Group"),
        ("Rebecca Allen", "Gateway Factor Solutions"),
        ("Steven Moore", "Summit Capital Partners"),
        ("Lauren Taylor", "Horizon Trade Credit"),
        ("Brian Wilson", "Keystone Business Finance"),
    ]

    for i, (name, biz) in enumerate(names):
        addr = addresses[i % 3]
        entities.append(_make_entity(
            borrower_name=name,
            business_name=biz,
            ein=f"66-300000{i:01d}" if i < 10 else f"66-30000{i}",
            address=addr[0],
            city=addr[1],
            state=addr[2],
            zipcode=addr[3],
            employee_count=random.randint(2, 8),
            business_age_months=random.randint(8, 24),
            loan_amount=round(random.uniform(145_000, 149_999), 2),
            loan_date=f"2020-{6 + (i % 5):02d}-{3 + i:02d}",
            lender=random.choice(["Ready Capital", "Customers Bank", "WebBank"]),
            naics_code="524210",
            industry="Insurance Agencies",
            fraud_type="invoice_factoring",
        ))

    ring = {
        "id": "ring_003",
        "name": "Invoice Factoring Scheme",
        "ring_type": "ACCOUNT_CLUSTER",
        "status": "MONITORING",
        "risk_score": 78,
        "total_exposure": 890_000,
        "entity_count": 15,
        "created_at": "2025-01-20T11:45:00Z",
    }
    return ring, entities


def _build_ring_004() -> tuple[dict, list[dict]]:
    """RING-004: Benefits Double-Dipping — $340K, 6 entities, MEDIUM.

    Pattern: 3 pairs of businesses sharing the same EIN (each EIN used twice).
    Moderate loan amounts to stay under radar.
    Triggers: EIN_REUSE (CRITICAL).
    """
    shared_eins = ["55-4000001", "55-4000002", "55-4000003"]

    entities: list[dict] = []
    names = [
        ("Patricia Nguyen", "Serenity Wellness Center"),
        ("William Hernandez", "Serenity Health Corp"),
        ("Karen Phillips", "Oakwood Family Practice"),
        ("George Campbell", "Oakwood Medical Group"),
        ("Donna Robinson", "Maple Street Pharmacy"),
        ("Paul Stewart", "Maple Health Distributors"),
    ]

    cities = [
        ("430 Elm Street", "Phoenix", "AZ", "85001"),
        ("430 Elm Street", "Phoenix", "AZ", "85001"),
        ("2100 Oak Avenue", "Denver", "CO", "80202"),
        ("2100 Oak Avenue", "Denver", "CO", "80202"),
        ("8900 Maple Drive", "Portland", "OR", "97201"),
        ("8900 Maple Drive", "Portland", "OR", "97201"),
    ]

    for i, (name, biz) in enumerate(names):
        addr = cities[i]
        entities.append(_make_entity(
            borrower_name=name,
            business_name=biz,
            ein=shared_eins[i // 2],
            address=addr[0],
            city=addr[1],
            state=addr[2],
            zipcode=addr[3],
            employee_count=random.randint(3, 15),
            business_age_months=random.randint(12, 48),
            loan_amount=round(random.uniform(40_000, 70_000), 2),
            loan_date=f"2020-{5 + (i % 3):02d}-{8 + i * 3:02d}",
            lender="JPMorgan Chase",
            naics_code="621111",
            industry="Offices of Physicians",
            fraud_type="benefits_double_dip",
        ))

    ring = {
        "id": "ring_004",
        "name": "Benefits Double-Dipping",
        "ring_type": "THRESHOLD_GAMING",
        "status": "MONITORING",
        "risk_score": 62,
        "total_exposure": 340_000,
        "entity_count": 6,
        "created_at": "2025-02-10T09:20:00Z",
    }
    return ring, entities


def _build_ring_005() -> tuple[dict, list[dict]]:
    """RING-005: Address Cycling Ring — $175K, 4 entities, LOW.

    Pattern: 4 businesses at the same address, modest loans.
    Just above the address reuse threshold.
    Triggers: ADDR_REUSE (HIGH).
    """
    shared_address = "9200 Wilshire Blvd Suite 100"

    entities: list[dict] = []
    names = [
        ("Frank Reynolds", "Westside Auto Repair"),
        ("Carol Baskin", "Sunset Pet Grooming"),
        ("Dennis Murphy", "Pacific Lawn Care LLC"),
        ("Janet Collins", "Bayview Cleaning Services"),
    ]

    for i, (name, biz) in enumerate(names):
        entities.append(_make_entity(
            borrower_name=name,
            business_name=biz,
            ein=f"44-500000{i}",
            address=shared_address,
            city="Los Angeles",
            state="CA",
            zipcode="90024",
            employee_count=random.randint(1, 5),
            business_age_months=random.randint(18, 60),
            loan_amount=round(random.uniform(35_000, 55_000), 2),
            loan_date=f"2020-0{7 + i}-{12 + i * 5:02d}",
            lender="Bank of America",
            naics_code="561720",
            industry="Janitorial Services",
            fraud_type="address_cycling",
        ))

    ring = {
        "id": "ring_005",
        "name": "Address Cycling Ring",
        "ring_type": "ADDRESS_FARM",
        "status": "RESOLVED",
        "risk_score": 45,
        "total_exposure": 175_000,
        "entity_count": 4,
        "created_at": "2025-03-01T16:00:00Z",
    }
    return ring, entities


# ---------------------------------------------------------------------------
# Ring builder registry
# ---------------------------------------------------------------------------

RING_BUILDERS = [
    _build_ring_001,
    _build_ring_002,
    _build_ring_003,
    _build_ring_004,
    _build_ring_005,
]


def build_all_rings() -> tuple[list[dict], list[dict]]:
    """Build all 5 demo rings and their entity records.

    Returns (rings, all_entity_records) where rings is the frontend-ready
    ring metadata and all_entity_records is the flat list of loan records.
    """
    rings: list[dict] = []
    all_entities: list[dict] = []

    for builder in RING_BUILDERS:
        ring, entities = builder()
        ring["entities"] = [e["borrower_id"] for e in entities]
        rings.append(ring)
        all_entities.extend(entities)

    return rings, all_entities


def seed_demo_data() -> dict[str, Any]:
    """Seed all in-memory stores with 5 demo fraud rings.

    This is the main entry point called at application startup.
    Idempotent: clears and re-seeds on every call.

    Returns a summary dict with counts for logging/verification.
    """
    rings, records = build_all_rings()

    # --- Run detection pipeline on seeded records ---
    rule_results = evaluate_batch(records)
    context = build_context(records)
    risk_scores = score_batch(records, rule_results)
    alerts = generate_alerts_batch(risk_scores, score_threshold=10.0)
    alert_dicts = [a.to_dict() for a in alerts]

    # --- Build graph ---
    graph_data = build_graph_from_records(records)

    # --- Populate all in-memory stores (idempotent — replaces existing) ---
    set_ring_store(rings)
    # S3: Deduplicate alerts by entity_id before storing
    alert_dicts = deduplicate_alerts(alert_dicts)
    set_alert_store(alert_dicts)
    set_entity_store(records)
    set_alert_index(alert_dicts)
    set_graph_data(graph_data)

    return {
        "rings": len(rings),
        "entities": len(records),
        "alerts": len(alert_dicts),
        "graph_nodes": len(graph_data["nodes"]),
        "graph_edges": len(graph_data["edges"]),
    }


# ---------------------------------------------------------------------------
# Procurement fraud rings
# ---------------------------------------------------------------------------

def _make_procurement_entity(
    *,
    entity_type: str,
    vendor_name: str = "",
    person_name: str = "",
    uei: str = "",
    contract_number: str = "",
    award_amount: float = 0.0,
    sole_source: bool = False,
    naics: str = "541519",
    bank_routing: str = "",
    bank_account: str = "",
    fraud_type: str = "procurement_fraud",
) -> dict[str, Any]:
    """Build a procurement entity record."""
    return {
        "entity_id": str(uuid.uuid4()),
        "entity_type": entity_type,
        "vendor_name": vendor_name,
        "person_name": person_name,
        "uei": uei or f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=12))}",
        "contract_number": contract_number,
        "award_amount": award_amount,
        "sole_source": sole_source,
        "naics": naics,
        "bank_routing": bank_routing or f"{random.randint(100000000, 999999999)}",
        "bank_account": bank_account or f"{random.randint(10000000, 9999999999)}",
        "fraud_label": True,
        "fraud_type": fraud_type,
    }


def _build_procurement_ring_001() -> tuple[dict, list[dict]]:
    """IT-RING-001: IT Kickback Cluster — GSA (canonical Madison Jr. pattern).

    3 shell IT vendors with same registered agent awarded $9M in sole-source
    GSA contracts. 1 GSA contracting officer received $630K in wire transfers.
    All invoices routed through 2 bank accounts opened 48h before each award.
    """
    shared_routing_1 = "091000019"
    shared_routing_2 = "091000020"
    shared_acct_1 = "8820001001"
    shared_acct_2 = "8820001002"

    entities: list[dict] = []

    # 3 vendor entities (shell IT companies)
    vendors = [
        ("Apex Federal Solutions LLC", "GSA-IT-2023-0042", 3_300_000.0),
        ("Meridian GovTech Inc", "GSA-IT-2023-0078", 2_100_000.0),
        ("Patriot Digital Services Corp", "GSA-IT-2023-0115", 3_600_000.0),
    ]
    for i, (vname, cnum, amount) in enumerate(vendors):
        entities.append(_make_procurement_entity(
            entity_type="Vendor",
            vendor_name=vname,
            uei=f"APEX{'0' * 8}"[:12] if i == 0 else f"MRDN{'0' * 8}"[:12] if i == 1 else f"PTRT{'0' * 8}"[:12],
            contract_number=cnum,
            award_amount=amount,
            sole_source=True,
            bank_routing=shared_routing_1 if i < 2 else shared_routing_2,
            bank_account=shared_acct_1 if i < 2 else shared_acct_2,
            fraud_type="kickback_scheme",
        ))

    # 1 person entity (GSA contracting officer — insider)
    entities.append(_make_procurement_entity(
        entity_type="Person",
        person_name="Marcus Eady",
        award_amount=630_000.0,
        bank_routing=shared_routing_1,
        bank_account="8820009999",
        fraud_type="insider_link",
    ))

    # 3 contract entities
    for i, (vname, cnum, amount) in enumerate(vendors):
        entities.append(_make_procurement_entity(
            entity_type="Contract",
            vendor_name=vname,
            contract_number=cnum,
            award_amount=amount,
            sole_source=True,
        ))

    ring = {
        "id": "IT-RING-001",
        "name": "IT Kickback Cluster — GSA",
        "ring_type": "STRAW_COMPANY",
        "status": "ACTIVE",
        "risk_score": 97,
        "total_exposure": 9_000_000,
        "entity_count": 7,
        "created_at": "2025-06-10T08:00:00Z",
        "schema": "procurement",
    }
    return ring, entities


def _build_procurement_ring_002() -> tuple[dict, list[dict]]:
    """IT-RING-002: Bid Rotation Ring — 4 vendors, coordinated bids.

    4 vendors take turns winning sole-source awards in a rotating pattern.
    """
    entities: list[dict] = []

    vendors = [
        ("Sentinel IT Group LLC", "GSA-IT-2024-0201", 1_800_000.0),
        ("Keystone Federal Tech Inc", "GSA-IT-2024-0202", 2_200_000.0),
        ("Vanguard Systems Corp", "GSA-IT-2024-0203", 1_500_000.0),
        ("Summit Digital Partners LLC", "GSA-IT-2024-0204", 1_900_000.0),
    ]
    for vname, cnum, amount in vendors:
        entities.append(_make_procurement_entity(
            entity_type="Vendor",
            vendor_name=vname,
            contract_number=cnum,
            award_amount=amount,
            sole_source=True,
            fraud_type="bid_rotation",
        ))

    ring = {
        "id": "IT-RING-002",
        "name": "Bid Rotation Ring",
        "ring_type": "STRAW_COMPANY",
        "status": "ACTIVE",
        "risk_score": 84,
        "total_exposure": 7_400_000,
        "entity_count": 4,
        "created_at": "2025-07-22T14:30:00Z",
        "schema": "procurement",
    }
    return ring, entities


def _build_procurement_ring_003() -> tuple[dict, list[dict]]:
    """IT-RING-003: Invoice Inflation — 2 vendors, same registered agent.

    Invoices at 3x market rate for commodity IT services.
    """
    shared_routing = "061000052"
    shared_acct = "7730005500"

    entities: list[dict] = []

    vendors = [
        ("Ironclad Tech Services LLC", "GSA-IT-2024-0310", 4_200_000.0),
        ("Fortress Digital Solutions Inc", "GSA-IT-2024-0311", 3_800_000.0),
    ]
    for vname, cnum, amount in vendors:
        entities.append(_make_procurement_entity(
            entity_type="Vendor",
            vendor_name=vname,
            contract_number=cnum,
            award_amount=amount,
            sole_source=False,
            bank_routing=shared_routing,
            bank_account=shared_acct,
            fraud_type="invoice_inflation",
        ))

    ring = {
        "id": "IT-RING-003",
        "name": "Invoice Inflation Ring",
        "ring_type": "ACCOUNT_CLUSTER",
        "status": "MONITORING",
        "risk_score": 72,
        "total_exposure": 8_000_000,
        "entity_count": 2,
        "created_at": "2025-08-05T10:15:00Z",
        "schema": "procurement",
    }
    return ring, entities


PROCUREMENT_RING_BUILDERS = [
    _build_procurement_ring_001,
    _build_procurement_ring_002,
    _build_procurement_ring_003,
]


def seed_procurement_rings() -> list[dict]:
    """Build all 3 procurement fraud rings and return them.

    Returns list of ring dicts with embedded entity IDs.
    """
    rings: list[dict] = []
    for builder in PROCUREMENT_RING_BUILDERS:
        ring, entities = builder()
        ring["entities"] = [e["entity_id"] for e in entities]
        rings.append(ring)
    return rings


def seed_ppp_rings() -> list[dict]:
    """Build all 5 PPP fraud rings (existing behavior)."""
    rings, _ = build_all_rings()
    return rings


if __name__ == "__main__":
    import sys

    schema = sys.argv[1] if len(sys.argv) > 1 else "all"
    if schema in ("all", "ppp"):
        seed_ppp_rings()
    if schema in ("all", "procurement"):
        seed_procurement_rings()
    print(f"Seeded {schema} rings.")
