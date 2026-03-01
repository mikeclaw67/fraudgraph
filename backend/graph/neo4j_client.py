# Neo4j Graph Client — manages the fraud ontology in Neo4j.
# Handles node/edge CRUD, ontology schema enforcement, and Cypher queries
# for the Sigma.js graph visualization layer. Designed for async operation
# with the official neo4j Python driver.

from __future__ import annotations

import hashlib
import logging
from contextlib import asynccontextmanager
from typing import Any

from neo4j import AsyncGraphDatabase, AsyncDriver

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ontology definition — node labels and relationship types
# ---------------------------------------------------------------------------

NODE_LABELS = [
    "Borrower", "Business", "LoanApplication",
    "BankAccount", "Address", "Alert", "Case",
]

RELATIONSHIP_TYPES = [
    "BORROWER_OWNS_BUSINESS",
    "BUSINESS_APPLIED_FOR",
    "APPLICATION_DEPOSITED_TO",
    "BORROWER_LIVES_AT",
    "BUSINESS_LOCATED_AT",
    "ADDRESS_SHARED_BY",
    "ACCOUNT_SHARED_BY",
    "ALERT_FLAGS",
    "CASE_CONTAINS",
]


class Neo4jClient:
    """Async Neo4j client for FraudGraph ontology operations."""

    def __init__(self, uri: str, user: str, password: str):
        self._uri = uri
        self._user = user
        self._password = password
        self._driver: AsyncDriver | None = None

    async def connect(self) -> None:
        """Initialize the Neo4j driver connection."""
        self._driver = AsyncGraphDatabase.driver(
            self._uri, auth=(self._user, self._password)
        )
        logger.info("Neo4j driver connected to %s", self._uri)

    async def close(self) -> None:
        """Close the Neo4j driver."""
        if self._driver:
            await self._driver.close()
            self._driver = None
            logger.info("Neo4j driver closed")

    @asynccontextmanager
    async def session(self):
        """Yield an async Neo4j session."""
        if not self._driver:
            raise RuntimeError("Neo4j driver not connected. Call connect() first.")
        async with self._driver.session() as s:
            yield s

    # ------------------------------------------------------------------
    # Schema setup
    # ------------------------------------------------------------------

    async def create_indexes(self) -> None:
        """Create uniqueness constraints and indexes for ontology nodes."""
        constraints = [
            ("Borrower", "borrower_id"),
            ("Business", "ein"),
            ("LoanApplication", "loan_id"),
            ("BankAccount", "account_key"),
            ("Address", "address_hash"),
            ("Alert", "alert_id"),
            ("Case", "case_id"),
        ]
        async with self.session() as session:
            for label, prop in constraints:
                query = (
                    f"CREATE CONSTRAINT IF NOT EXISTS "
                    f"FOR (n:{label}) REQUIRE n.{prop} IS UNIQUE"
                )
                await session.run(query)
                logger.info("Index ensured: %s.%s", label, prop)

    # ------------------------------------------------------------------
    # Node operations
    # ------------------------------------------------------------------

    async def upsert_borrower(self, data: dict) -> None:
        """Create or update a Borrower node."""
        query = """
        MERGE (b:Borrower {borrower_id: $borrower_id})
        SET b.name = $name, b.ssn_last4 = $ssn_last4
        """
        async with self.session() as session:
            await session.run(query, {
                "borrower_id": data["borrower_id"],
                "name": data.get("borrower_name", ""),
                "ssn_last4": data.get("ssn_last4", ""),
            })

    async def upsert_business(self, data: dict) -> None:
        """Create or update a Business node."""
        query = """
        MERGE (b:Business {ein: $ein})
        SET b.name = $name, b.employee_count = $employees,
            b.age_months = $age, b.naics = $naics, b.industry = $industry
        """
        async with self.session() as session:
            await session.run(query, {
                "ein": data["ein"],
                "name": data.get("business_name", ""),
                "employees": data.get("employee_count", 0),
                "age": data.get("business_age_months", 0),
                "naics": data.get("naics_code", ""),
                "industry": data.get("industry", ""),
            })

    async def upsert_loan(self, data: dict, loan_id: str) -> None:
        """Create or update a LoanApplication node."""
        query = """
        MERGE (l:LoanApplication {loan_id: $loan_id})
        SET l.program = $program, l.amount = $amount,
            l.date = $date, l.lender = $lender
        """
        async with self.session() as session:
            await session.run(query, {
                "loan_id": loan_id,
                "program": data.get("loan_program", ""),
                "amount": data.get("loan_amount", 0),
                "date": str(data.get("loan_date", "")),
                "lender": data.get("lender_name", ""),
            })

    async def upsert_bank_account(self, data: dict) -> None:
        """Create or update a BankAccount node."""
        account_key = f"{data.get('bank_routing', '')}:{data.get('bank_account', '')}"
        query = """
        MERGE (ba:BankAccount {account_key: $key})
        SET ba.routing = $routing, ba.account = $account
        """
        async with self.session() as session:
            await session.run(query, {
                "key": account_key,
                "routing": data.get("bank_routing", ""),
                "account": data.get("bank_account", ""),
            })

    async def upsert_address(self, data: dict) -> None:
        """Create or update an Address node."""
        addr_str = "|".join([
            data.get("business_address", "").strip().lower(),
            data.get("business_city", "").strip().lower(),
            data.get("business_state", "").strip().upper(),
            data.get("business_zip", "").strip()[:5],
        ])
        addr_hash = hashlib.sha256(addr_str.encode()).hexdigest()[:16]
        query = """
        MERGE (a:Address {address_hash: $hash})
        SET a.street = $street, a.city = $city,
            a.state = $state, a.zip = $zip
        """
        async with self.session() as session:
            await session.run(query, {
                "hash": addr_hash,
                "street": data.get("business_address", ""),
                "city": data.get("business_city", ""),
                "state": data.get("business_state", ""),
                "zip": data.get("business_zip", ""),
            })

    # ------------------------------------------------------------------
    # Relationship operations
    # ------------------------------------------------------------------

    async def link_borrower_business(self, borrower_id: str, ein: str) -> None:
        """BORROWER_OWNS_BUSINESS relationship."""
        query = """
        MATCH (b:Borrower {borrower_id: $bid})
        MATCH (biz:Business {ein: $ein})
        MERGE (b)-[:BORROWER_OWNS_BUSINESS]->(biz)
        """
        async with self.session() as session:
            await session.run(query, {"bid": borrower_id, "ein": ein})

    async def link_business_loan(self, ein: str, loan_id: str) -> None:
        """BUSINESS_APPLIED_FOR relationship."""
        query = """
        MATCH (biz:Business {ein: $ein})
        MATCH (l:LoanApplication {loan_id: $lid})
        MERGE (biz)-[:BUSINESS_APPLIED_FOR]->(l)
        """
        async with self.session() as session:
            await session.run(query, {"ein": ein, "lid": loan_id})

    async def link_loan_account(self, loan_id: str, routing: str, account: str) -> None:
        """APPLICATION_DEPOSITED_TO relationship."""
        account_key = f"{routing}:{account}"
        query = """
        MATCH (l:LoanApplication {loan_id: $lid})
        MATCH (ba:BankAccount {account_key: $key})
        MERGE (l)-[:APPLICATION_DEPOSITED_TO]->(ba)
        """
        async with self.session() as session:
            await session.run(query, {"lid": loan_id, "key": account_key})

    async def link_business_address(self, ein: str, address_hash: str) -> None:
        """BUSINESS_LOCATED_AT relationship."""
        query = """
        MATCH (biz:Business {ein: $ein})
        MATCH (a:Address {address_hash: $hash})
        MERGE (biz)-[:BUSINESS_LOCATED_AT]->(a)
        """
        async with self.session() as session:
            await session.run(query, {"ein": ein, "hash": address_hash})

    # ------------------------------------------------------------------
    # Graph queries for Sigma.js visualization
    # ------------------------------------------------------------------

    async def get_subgraph(
        self,
        center_id: str,
        center_label: str = "Borrower",
        depth: int = 2,
        limit: int = 200,
    ) -> dict[str, list]:
        """Return nodes and edges for a subgraph centered on an entity.

        Returns {"nodes": [...], "edges": [...]} formatted for Sigma.js.
        """
        id_field = {
            "Borrower": "borrower_id",
            "Business": "ein",
            "Address": "address_hash",
            "BankAccount": "account_key",
        }.get(center_label, "borrower_id")
        query = f"""
        MATCH path = (center:{center_label} {{{id_field}: $center_id}})-[*1..{depth}]-(connected)
        WITH nodes(path) AS ns, relationships(path) AS rs
        UNWIND ns AS n
        WITH COLLECT(DISTINCT n) AS nodes, COLLECT(DISTINCT rs) AS all_rels
        UNWIND all_rels AS rel_list
        UNWIND rel_list AS r
        WITH nodes, COLLECT(DISTINCT r) AS rels
        RETURN nodes, rels
        LIMIT {limit}
        """
        nodes = []
        edges = []
        async with self.session() as session:
            result = await session.run(query, {"center_id": center_id})
            async for record in result:
                for node in record.get("nodes", []):
                    labels = list(node.labels) if hasattr(node, "labels") else []
                    nodes.append({
                        "id": node.element_id,
                        "label": labels[0] if labels else "Unknown",
                        "properties": dict(node),
                    })
                for rel in record.get("rels", []):
                    edges.append({
                        "id": rel.element_id,
                        "source": rel.start_node.element_id,
                        "target": rel.end_node.element_id,
                        "type": rel.type,
                    })

        return {"nodes": nodes, "edges": edges}

    async def get_full_graph(self, limit: int = 500) -> dict[str, list]:
        """Return a sampled subgraph of the entire fraud network for overview viz."""
        query = """
        MATCH (n)-[r]->(m)
        RETURN n, r, m
        LIMIT $limit
        """
        nodes_map: dict[str, dict] = {}
        edges = []
        async with self.session() as session:
            result = await session.run(query, {"limit": limit})
            async for record in result:
                for key in ["n", "m"]:
                    node = record[key]
                    nid = node.element_id
                    if nid not in nodes_map:
                        labels = list(node.labels) if hasattr(node, "labels") else []
                        nodes_map[nid] = {
                            "id": nid,
                            "label": labels[0] if labels else "Unknown",
                            "properties": dict(node),
                        }
                rel = record["r"]
                edges.append({
                    "id": rel.element_id,
                    "source": rel.start_node.element_id,
                    "target": rel.end_node.element_id,
                    "type": rel.type,
                })

        return {"nodes": list(nodes_map.values()), "edges": edges}

    async def get_entity_connections(self, entity_id: str, label: str = "Borrower") -> list[dict]:
        """Get all direct connections for an entity (for 360 profile)."""
        id_field = {
            "Borrower": "borrower_id",
            "Business": "ein",
            "Address": "address_hash",
            "BankAccount": "account_key",
        }.get(label, "borrower_id")

        query = f"""
        MATCH (n:{label} {{{id_field}: $eid}})-[r]-(connected)
        RETURN type(r) AS rel_type, labels(connected) AS connected_labels,
               properties(connected) AS connected_props
        """
        connections = []
        async with self.session() as session:
            result = await session.run(query, {"eid": entity_id})
            async for record in result:
                connections.append({
                    "relationship": record["rel_type"],
                    "connected_type": record["connected_labels"][0] if record["connected_labels"] else "Unknown",
                    "properties": dict(record["connected_props"]),
                })
        return connections
