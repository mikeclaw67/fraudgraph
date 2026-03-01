#!/usr/bin/env python3
# Data Generator — produces 50K realistic PPP/EIDL loan records with 5 fraud
# archetypes at ~5% fraud rate. Uses Faker for realistic PII and business data.
# Each fraud archetype models a real-world pattern observed in COVID-era loan fraud:
# address farms, EIN recycling, straw companies, network clusters, threshold gaming.

from __future__ import annotations

import argparse
import json
import random
import sys
import uuid
from datetime import date, timedelta
from pathlib import Path

from faker import Faker
from faker.providers import company, address, date_time

fake = Faker()
Faker.seed(42)
random.seed(42)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

LOAN_PROGRAMS = ["PPP", "EIDL"]
LOAN_DATE_START = date(2020, 4, 1)
LOAN_DATE_END = date(2021, 3, 31)
DATE_RANGE_DAYS = (LOAN_DATE_END - LOAN_DATE_START).days

NAICS_CODES = {
    "722511": "Full-Service Restaurants",
    "812111": "Barber Shops",
    "541110": "Offices of Lawyers",
    "621111": "Offices of Physicians",
    "236220": "Commercial Construction",
    "541512": "Computer Systems Design",
    "423450": "Medical Equipment Wholesale",
    "238220": "Plumbing & HVAC Contractors",
    "531210": "Real Estate Agents",
    "561720": "Janitorial Services",
    "484110": "General Freight Trucking",
    "811111": "Auto Repair Shops",
    "524210": "Insurance Agencies",
    "541611": "Management Consulting",
    "713940": "Fitness Centers",
}

LENDERS = [
    "JPMorgan Chase", "Bank of America", "Wells Fargo", "Citibank",
    "Cross River Bank", "Celtic Bank", "Kabbage Inc", "Harvest SBF",
    "Customers Bank", "WebBank", "Ready Capital", "Benworth Capital",
    "Fountainhead SBF", "Newtek Small Business", "BBVA USA",
]


def _random_ein() -> str:
    return f"{random.randint(10, 99)}-{random.randint(1000000, 9999999)}"


def _random_routing() -> str:
    return f"{random.randint(100000000, 999999999)}"


def _random_account() -> str:
    return f"{random.randint(10000000, 9999999999)}"


def _random_loan_date() -> str:
    offset = random.randint(0, DATE_RANGE_DAYS)
    d = LOAN_DATE_START + timedelta(days=offset)
    return d.isoformat()


def _random_naics() -> tuple[str, str]:
    code = random.choice(list(NAICS_CODES.keys()))
    return code, NAICS_CODES[code]


def _clean_record() -> dict:
    """Generate a single clean (non-fraudulent) loan record."""
    naics, industry = _random_naics()
    return {
        "borrower_id": str(uuid.uuid4()),
        "borrower_name": fake.name(),
        "ssn_last4": f"{random.randint(1000, 9999)}",
        "business_name": fake.company(),
        "ein": _random_ein(),
        "business_address": fake.street_address(),
        "business_city": fake.city(),
        "business_state": fake.state_abbr(),
        "business_zip": fake.zipcode(),
        "employee_count": random.randint(1, 200),
        "business_age_months": random.randint(13, 240),
        "loan_program": random.choice(LOAN_PROGRAMS),
        "loan_amount": round(random.uniform(5_000, 500_000), 2),
        "loan_date": _random_loan_date(),
        "lender_name": random.choice(LENDERS),
        "bank_routing": _random_routing(),
        "bank_account": _random_account(),
        "naics_code": naics,
        "industry": industry,
        "fraud_label": False,
        "fraud_type": None,
    }


# ---------------------------------------------------------------------------
# Fraud Archetype Generators
# ---------------------------------------------------------------------------

def _generate_address_farm(count: int = 400) -> list[dict]:
    """Archetype 1: 8 addresses each shared by 50 businesses.

    Models strip mall / office suite address farms where dozens of
    shell businesses register at the same physical location.
    """
    records = []
    num_addresses = 8
    per_address = count // num_addresses

    farm_addresses = []
    for _ in range(num_addresses):
        suite = f"Suite {random.randint(100, 999)}"
        farm_addresses.append({
            "street": f"{fake.building_number()} {fake.street_name()} {suite}",
            "city": fake.city(),
            "state": fake.state_abbr(),
            "zip": fake.zipcode(),
        })

    for addr in farm_addresses:
        for _ in range(per_address):
            naics, industry = _random_naics()
            records.append({
                "borrower_id": str(uuid.uuid4()),
                "borrower_name": fake.name(),
                "ssn_last4": f"{random.randint(1000, 9999)}",
                "business_name": fake.company(),
                "ein": _random_ein(),
                "business_address": addr["street"],
                "business_city": addr["city"],
                "business_state": addr["state"],
                "business_zip": addr["zip"],
                "employee_count": random.randint(1, 15),
                "business_age_months": random.randint(6, 60),
                "loan_program": random.choice(LOAN_PROGRAMS),
                "loan_amount": round(random.uniform(20_000, 149_000), 2),
                "loan_date": _random_loan_date(),
                "lender_name": random.choice(LENDERS),
                "bank_routing": _random_routing(),
                "bank_account": _random_account(),
                "naics_code": naics,
                "industry": industry,
                "fraud_label": True,
                "fraud_type": "address_farm",
            })
    return records


def _generate_ein_recycler(count: int = 300) -> list[dict]:
    """Archetype 2: 100 EINs each used by 3 businesses.

    Models identity theft / EIN fraud where the same tax ID appears
    on multiple unrelated business loan applications.
    """
    records = []
    num_eins = 100
    per_ein = count // num_eins

    recycled_eins = [_random_ein() for _ in range(num_eins)]

    for ein in recycled_eins:
        for _ in range(per_ein):
            naics, industry = _random_naics()
            records.append({
                "borrower_id": str(uuid.uuid4()),
                "borrower_name": fake.name(),
                "ssn_last4": f"{random.randint(1000, 9999)}",
                "business_name": fake.company(),
                "ein": ein,
                "business_address": fake.street_address(),
                "business_city": fake.city(),
                "business_state": fake.state_abbr(),
                "business_zip": fake.zipcode(),
                "employee_count": random.randint(1, 50),
                "business_age_months": random.randint(12, 120),
                "loan_program": random.choice(LOAN_PROGRAMS),
                "loan_amount": round(random.uniform(25_000, 200_000), 2),
                "loan_date": _random_loan_date(),
                "lender_name": random.choice(LENDERS),
                "bank_routing": _random_routing(),
                "bank_account": _random_account(),
                "naics_code": naics,
                "industry": industry,
                "fraud_label": True,
                "fraud_type": "ein_recycler",
            })
    return records


def _generate_straw_company(count: int = 500) -> list[dict]:
    """Archetype 3: 0 employees, young business, high loan.

    Models straw companies created solely to obtain fraudulent loans.
    Zero employees, less than 6 months old, loan > $100K but capped
    at $149K to avoid SBA threshold review.
    """
    records = []
    for _ in range(count):
        naics, industry = _random_naics()
        records.append({
            "borrower_id": str(uuid.uuid4()),
            "borrower_name": fake.name(),
            "ssn_last4": f"{random.randint(1000, 9999)}",
            "business_name": fake.company(),
            "ein": _random_ein(),
            "business_address": fake.street_address(),
            "business_city": fake.city(),
            "business_state": fake.state_abbr(),
            "business_zip": fake.zipcode(),
            "employee_count": 0,
            "business_age_months": random.randint(1, 5),
            "loan_program": random.choice(LOAN_PROGRAMS),
            "loan_amount": round(random.uniform(100_001, 149_000), 2),
            "loan_date": _random_loan_date(),
            "lender_name": random.choice(LENDERS),
            "bank_routing": _random_routing(),
            "bank_account": _random_account(),
            "naics_code": naics,
            "industry": industry,
            "fraud_label": True,
            "fraud_type": "straw_company",
        })
    return records


def _generate_network_cluster(count: int = 350) -> list[dict]:
    """Archetype 4: 35 routing numbers each shared by 10 businesses.

    Models money mule networks where multiple shell businesses deposit
    loan proceeds into shared bank accounts (same routing number).
    """
    records = []
    num_routings = 35
    per_routing = count // num_routings

    shared_routings = [_random_routing() for _ in range(num_routings)]

    for routing in shared_routings:
        for _ in range(per_routing):
            naics, industry = _random_naics()
            records.append({
                "borrower_id": str(uuid.uuid4()),
                "borrower_name": fake.name(),
                "ssn_last4": f"{random.randint(1000, 9999)}",
                "business_name": fake.company(),
                "ein": _random_ein(),
                "business_address": fake.street_address(),
                "business_city": fake.city(),
                "business_state": fake.state_abbr(),
                "business_zip": fake.zipcode(),
                "employee_count": random.randint(1, 30),
                "business_age_months": random.randint(3, 48),
                "loan_program": random.choice(LOAN_PROGRAMS),
                "loan_amount": round(random.uniform(30_000, 200_000), 2),
                "loan_date": _random_loan_date(),
                "lender_name": random.choice(LENDERS),
                "bank_routing": routing,
                "bank_account": _random_account(),
                "naics_code": naics,
                "industry": industry,
                "fraud_label": True,
                "fraud_type": "network_cluster",
            })
    return records


def _generate_threshold_gamer(count: int = 450) -> list[dict]:
    """Archetype 5: Loan amounts clustered near $150K SBA threshold.

    Models applicants who intentionally set loan amounts just below the
    $150K SBA enhanced review threshold ($145K-$149,999).
    """
    records = []
    for _ in range(count):
        naics, industry = _random_naics()
        records.append({
            "borrower_id": str(uuid.uuid4()),
            "borrower_name": fake.name(),
            "ssn_last4": f"{random.randint(1000, 9999)}",
            "business_name": fake.company(),
            "ein": _random_ein(),
            "business_address": fake.street_address(),
            "business_city": fake.city(),
            "business_state": fake.state_abbr(),
            "business_zip": fake.zipcode(),
            "employee_count": random.randint(5, 100),
            "business_age_months": random.randint(12, 120),
            "loan_program": random.choice(LOAN_PROGRAMS),
            "loan_amount": round(random.uniform(145_000, 149_999.99), 2),
            "loan_date": _random_loan_date(),
            "lender_name": random.choice(LENDERS),
            "bank_routing": _random_routing(),
            "bank_account": _random_account(),
            "naics_code": naics,
            "industry": industry,
            "fraud_label": True,
            "fraud_type": "threshold_gamer",
        })
    return records


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_dataset(total: int = 50_000) -> list[dict]:
    """Generate a complete dataset with ~5% fraud rate across 5 archetypes.

    Fraud allocation (scaled proportionally if total != 50K):
        address_farm:     400 (0.8%)
        ein_recycler:     300 (0.6%)
        straw_company:    500 (1.0%)
        network_cluster:  350 (0.7%)
        threshold_gamer:  450 (0.9%)
        ---------------------------
        Total fraud:     2000 (4.0%)  +  some natural overlap

    Remaining records are clean with realistic noise.
    """
    scale = total / 50_000

    fraud_records = []
    fraud_records.extend(_generate_address_farm(max(8, int(400 * scale))))
    fraud_records.extend(_generate_ein_recycler(max(3, int(300 * scale))))
    fraud_records.extend(_generate_straw_company(max(1, int(500 * scale))))
    fraud_records.extend(_generate_network_cluster(max(7, int(350 * scale))))
    fraud_records.extend(_generate_threshold_gamer(max(1, int(450 * scale))))

    clean_count = total - len(fraud_records)
    clean_records = [_clean_record() for _ in range(max(0, clean_count))]

    all_records = fraud_records + clean_records
    random.shuffle(all_records)

    return all_records


def main():
    parser = argparse.ArgumentParser(description="FraudGraph — PPP/EIDL Loan Data Generator")
    parser.add_argument("--count", type=int, default=50_000, help="Total records to generate")
    parser.add_argument("--output", type=str, default=None, help="Output JSON file path")
    parser.add_argument("--stats", action="store_true", help="Print dataset statistics")
    args = parser.parse_args()

    print(f"Generating {args.count:,} loan records...")
    records = generate_dataset(args.count)
    print(f"Generated {len(records):,} records")

    # Stats
    fraud_count = sum(1 for r in records if r["fraud_label"])
    fraud_rate = (fraud_count / len(records)) * 100
    print(f"  Fraud: {fraud_count:,} ({fraud_rate:.1f}%)")
    print(f"  Clean: {len(records) - fraud_count:,}")

    if args.stats:
        from collections import Counter
        type_counts = Counter(r["fraud_type"] for r in records if r["fraud_type"])
        print("\n  Fraud breakdown:")
        for ftype, cnt in type_counts.most_common():
            print(f"    {ftype}: {cnt:,}")

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(records, f, indent=2, default=str)
        print(f"\n  Written to {output_path}")
    else:
        # Write to stdout as JSON
        json.dump(records, sys.stdout, indent=2, default=str)

    return records


if __name__ == "__main__":
    main()
