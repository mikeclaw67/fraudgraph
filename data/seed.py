#!/usr/bin/env python3
# Database Seeder — loads generated data into Neo4j and PostgreSQL.
# Reads generated JSON records and populates both storage layers:
# Neo4j gets the graph ontology (nodes + relationships), PostgreSQL
# gets the flat relational records for SQL queries and API serving.

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import sys
import uuid
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def seed_neo4j(records: list[dict], uri: str, user: str, password: str) -> None:
    """Seed Neo4j with loan records as a graph ontology."""
    try:
        from backend.graph.neo4j_client import Neo4jClient
    except ImportError:
        logger.warning("Neo4j client not available — skipping graph seeding")
        return

    client = Neo4jClient(uri=uri, user=user, password=password)
    await client.connect()

    try:
        await client.create_indexes()
        logger.info("Neo4j indexes created")

        for i, record in enumerate(records):
            loan_id = str(uuid.uuid4())

            await client.upsert_borrower(record)
            await client.upsert_business(record)
            await client.upsert_loan(record, loan_id)
            await client.upsert_bank_account(record)
            await client.upsert_address(record)

            # Create relationships
            await client.link_borrower_business(record["borrower_id"], record["ein"])
            await client.link_business_loan(record["ein"], loan_id)
            await client.link_loan_account(
                loan_id, record["bank_routing"], record["bank_account"]
            )

            addr_raw = "|".join([
                record.get("business_address", "").strip().lower(),
                record.get("business_city", "").strip().lower(),
                record.get("business_state", "").strip().upper(),
                record.get("business_zip", "").strip()[:5],
            ])
            addr_hash = hashlib.sha256(addr_raw.encode()).hexdigest()[:16]
            await client.link_business_address(record["ein"], addr_hash)

            if (i + 1) % 1000 == 0:
                logger.info("  Neo4j: %d/%d records seeded", i + 1, len(records))

        logger.info("Neo4j seeding complete: %d records", len(records))
    finally:
        await client.close()


async def seed_postgres(records: list[dict], db_url: str) -> None:
    """Seed PostgreSQL with loan records."""
    try:
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from backend.db.models import Base, LoanRecord
    except ImportError:
        logger.warning("SQLAlchemy not available — skipping PostgreSQL seeding")
        return

    engine = create_async_engine(db_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("PostgreSQL tables created")

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        for i, record in enumerate(records):
            loan = LoanRecord(
                borrower_id=record["borrower_id"],
                borrower_name=record["borrower_name"],
                ssn_last4=record["ssn_last4"],
                business_name=record["business_name"],
                ein=record["ein"],
                business_address=record["business_address"],
                business_city=record["business_city"],
                business_state=record["business_state"],
                business_zip=record["business_zip"],
                employee_count=record["employee_count"],
                business_age_months=record["business_age_months"],
                loan_program=record["loan_program"],
                loan_amount=record["loan_amount"],
                loan_date=record["loan_date"],
                lender_name=record["lender_name"],
                bank_routing=record["bank_routing"],
                bank_account=record["bank_account"],
                naics_code=record["naics_code"],
                industry=record["industry"],
                fraud_label=record["fraud_label"],
                fraud_type=record.get("fraud_type"),
            )
            session.add(loan)

            if (i + 1) % 5000 == 0:
                await session.commit()
                logger.info("  PostgreSQL: %d/%d records committed", i + 1, len(records))

        await session.commit()
        logger.info("PostgreSQL seeding complete: %d records", len(records))

    await engine.dispose()


async def main():
    """Load generated data and seed both databases."""
    import argparse
    parser = argparse.ArgumentParser(description="FraudGraph Database Seeder")
    parser.add_argument("--input", type=str, required=True, help="Path to generated JSON data")
    parser.add_argument("--neo4j-uri", default="bolt://localhost:7687")
    parser.add_argument("--neo4j-user", default="neo4j")
    parser.add_argument("--neo4j-password", default="fraudgraph")
    parser.add_argument("--postgres-url", default="postgresql+asyncpg://fraudgraph:fraudgraph@localhost:5432/fraudgraph")
    parser.add_argument("--skip-neo4j", action="store_true")
    parser.add_argument("--skip-postgres", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Limit records to seed (0 = all)")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        logger.error("Input file not found: %s", input_path)
        sys.exit(1)

    with open(input_path) as f:
        records = json.load(f)

    if args.limit > 0:
        records = records[:args.limit]

    logger.info("Loaded %d records from %s", len(records), input_path)

    if not args.skip_neo4j:
        await seed_neo4j(records, args.neo4j_uri, args.neo4j_user, args.neo4j_password)

    if not args.skip_postgres:
        await seed_postgres(records, args.postgres_url)

    logger.info("Seeding complete!")


if __name__ == "__main__":
    asyncio.run(main())
