#!/usr/bin/env python3
# PPP Importer — transforms real SBA PPP loan CSVs into FraudGraph internal
# JSON format compatible with seed.py. Includes demo slice extraction that
# guarantees the output contains real shared-address fraud rings.
#
# Data source: https://data.sba.gov/dataset/ppp-foia (Public Domain)
# CSV: public_150k_plus_240930.csv (~431MB, loans >= $150K)
#
# Usage:
#   python data/ppp_importer.py --input public_150k_plus_240930.csv --output data/ppp_demo.json
#   python data/ppp_importer.py --input public_150k_plus_240930.csv --output data/ppp_demo.json --demo-slice
#   python data/ppp_importer.py --input public_150k_plus_240930.csv --output data/ppp_demo.json --demo-slice --limit 5000

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import sys
import uuid
from pathlib import Path

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# PPP per-employee ceiling: $20,833.33 (2.5 months of $100K salary)
PPP_PER_EMPLOYEE_CEILING = 20_833

# States with highest PPP fraud rates (DOJ prosecution data)
DEMO_STATES = ["CA", "FL", "TX", "GA", "IL", "NY"]

# Minimum ring members to count as shared-address ring
MIN_RING_SIZE = 2

# Demo slice target sizes
DEMO_RING_ROWS = 2000
DEMO_CLEAN_ROWS = 3000


def transform_ppp_row(row: dict) -> dict:
    """Transform a single SBA PPP CSV row into FraudGraph internal schema.

    Maps SBA fields to the borrower/business/loan schema expected by seed.py.
    Computes fraud signals: over_ceiling, new_business, zero_jobs.
    """
    loan_amount = float(row.get("InitialApprovalAmount", 0) or 0)
    jobs = int(float(row.get("JobsReported", 0) or 0))
    forgiveness = float(row.get("ForgivenessAmount", 0) or 0)

    per_employee = (loan_amount / jobs) if jobs > 0 else loan_amount
    fraud_signals = []
    if per_employee > PPP_PER_EMPLOYEE_CEILING:
        fraud_signals.append("over_ceiling")
    if "New Business" in str(row.get("BusinessAgeDescription", "")):
        fraud_signals.append("new_business")
    if jobs == 0 and loan_amount > 0:
        fraud_signals.append("zero_jobs")

    loan_number = str(row.get("LoanNumber", ""))

    return {
        "borrower_id": str(uuid.uuid5(uuid.NAMESPACE_DNS, loan_number)),
        "borrower_name": str(row.get("BorrowerName", "") or ""),
        "ssn_last4": "0000",
        "business_name": str(row.get("BorrowerName", "") or ""),
        "ein": loan_number,
        "business_address": str(row.get("BorrowerAddress", "") or ""),
        "business_city": str(row.get("BorrowerCity", "") or ""),
        "business_state": str(row.get("BorrowerState", "") or ""),
        "business_zip": str(row.get("BorrowerZip", "") or "")[:5],
        "employee_count": jobs,
        "business_age_months": 12 if "New Business" in str(row.get("BusinessAgeDescription", "")) else 60,
        "loan_program": "PPP",
        "loan_amount": loan_amount,
        "loan_date": str(row.get("DateApproved", "") or ""),
        "lender_name": str(row.get("OriginatingLender", "") or ""),
        "bank_routing": str(row.get("OriginatingLenderLocationID", "") or ""),
        "bank_account": hashlib.sha256(loan_number.encode()).hexdigest()[:12],
        "naics_code": str(row.get("NAICSCode", "") or ""),
        "industry": "Other",
        "fraud_label": len(fraud_signals) > 0,
        "fraud_type": fraud_signals[0] if fraud_signals else None,
        "forgiveness_amount": forgiveness,
        "loan_status": str(row.get("LoanStatus", "") or ""),
    }


def extract_demo_slice(
    df: pd.DataFrame,
    ring_rows: int = DEMO_RING_ROWS,
    clean_rows: int = DEMO_CLEAN_ROWS,
) -> pd.DataFrame:
    """Extract a demo slice guaranteed to contain real shared-address fraud rings.

    Strategy:
    1. Filter to high-fraud states (CA, FL, TX, GA, IL, NY)
    2. Find addresses shared by 2+ businesses (real ring candidates)
    3. Take ring_rows from shared-address records + clean_rows from non-ring records
    """
    logger.info("Extracting demo slice from %d rows...", len(df))

    # Filter to high-signal states
    state_df = df[df["BorrowerState"].isin(DEMO_STATES)].copy()
    logger.info("  After state filter (%s): %d rows", ", ".join(DEMO_STATES), len(state_df))

    # Find shared addresses (real fraud ring candidates)
    addr_counts = state_df.groupby(["BorrowerAddress", "BorrowerZip"]).size()
    shared_addrs = addr_counts[addr_counts >= MIN_RING_SIZE].index
    state_df["is_ring"] = state_df.set_index(["BorrowerAddress", "BorrowerZip"]).index.isin(shared_addrs)

    ring_df = state_df[state_df["is_ring"]]
    non_ring_df = state_df[~state_df["is_ring"]]

    logger.info("  Ring candidates: %d rows at %d shared addresses", len(ring_df), len(shared_addrs))
    logger.info("  Non-ring: %d rows", len(non_ring_df))

    # Build demo slice
    demo = pd.concat([
        ring_df.head(ring_rows),
        non_ring_df.head(clean_rows),
    ])
    demo = demo.drop(columns=["is_ring"], errors="ignore")

    logger.info("  Demo slice: %d rows (%d ring + %d clean)",
                len(demo), min(ring_rows, len(ring_df)), min(clean_rows, len(non_ring_df)))
    return demo


def transform_dataframe(df: pd.DataFrame, limit: int = 0) -> list[dict]:
    """Transform an entire DataFrame of SBA PPP rows into FraudGraph records."""
    records = []
    rows = df.to_dict("records")
    if limit > 0:
        rows = rows[:limit]

    for i, row in enumerate(rows):
        records.append(transform_ppp_row(row))
        if (i + 1) % 5000 == 0:
            logger.info("  Transformed %d/%d rows", i + 1, len(rows))

    logger.info("Transform complete: %d records", len(records))

    # Stats
    fraud_count = sum(1 for r in records if r["fraud_label"])
    fraud_rate = (fraud_count / len(records) * 100) if records else 0
    logger.info("  Fraud signals: %d (%.1f%%)", fraud_count, fraud_rate)

    from collections import Counter
    type_counts = Counter(r["fraud_type"] for r in records if r["fraud_type"])
    for ftype, cnt in type_counts.most_common():
        logger.info("    %s: %d", ftype, cnt)

    return records


def main():
    parser = argparse.ArgumentParser(
        description="FraudGraph PPP Importer — SBA CSV to internal JSON"
    )
    parser.add_argument(
        "--input", type=str, required=True,
        help="Path to SBA PPP CSV (e.g., public_150k_plus_240930.csv)"
    )
    parser.add_argument(
        "--output", type=str, required=True,
        help="Output JSON file path"
    )
    parser.add_argument(
        "--demo-slice", action="store_true",
        help="Extract 5K-row demo slice with guaranteed fraud rings"
    )
    parser.add_argument(
        "--limit", type=int, default=0,
        help="Limit output records (0 = all)"
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        logger.error("Input file not found: %s", input_path)
        sys.exit(1)

    logger.info("Reading %s ...", input_path)
    df = pd.read_csv(input_path, low_memory=False, encoding='latin-1')
    logger.info("Loaded %d rows, %d columns", len(df), len(df.columns))

    if args.demo_slice:
        df = extract_demo_slice(df)

    records = transform_dataframe(df, limit=args.limit)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(records, f, indent=2, default=str)

    logger.info("Written %d records to %s", len(records), output_path)


if __name__ == "__main__":
    main()
