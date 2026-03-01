# Graph API — serves node and edge data for the Sigma.js fraud network
# visualization. GET /api/graph returns the graph structure formatted for
# direct consumption by the frontend graph renderer. Supports filtered
# subgraph queries and full-network overview mode.

from __future__ import annotations

import hashlib
from typing import Any

from fastapi import APIRouter, Query

router = APIRouter(prefix="/graph", tags=["graph"])

# In-memory graph for MVP (replaced by Neo4j queries in production)
_graph_data: dict[str, list[dict]] = {"nodes": [], "edges": []}


def build_graph_from_records(records: list[dict]) -> dict[str, list[dict]]:
    """Build a Sigma.js-compatible graph from loan records.

    Creates nodes for borrowers, businesses, addresses, and bank accounts,
    then links them according to the ontology.
    """
    nodes: dict[str, dict] = {}
    edges: list[dict] = []
    edge_id = 0

    for r in records:
        bid = r.get("borrower_id", "")
        ein = r.get("ein", "")
        addr_raw = "|".join([
            r.get("business_address", "").strip().lower(),
            r.get("business_city", "").strip().lower(),
            r.get("business_state", "").strip().upper(),
            r.get("business_zip", "").strip()[:5],
        ])
        addr_hash = hashlib.sha256(addr_raw.encode()).hexdigest()[:16]
        routing = r.get("bank_routing", "")

        # Borrower node
        if bid and bid not in nodes:
            nodes[bid] = {
                "id": bid,
                "label": r.get("borrower_name", bid),
                "type": "Borrower",
                "size": 8,
                "color": "#4f46e5",
            }

        # Business node
        biz_id = f"biz:{ein}"
        if ein and biz_id not in nodes:
            nodes[biz_id] = {
                "id": biz_id,
                "label": r.get("business_name", ein),
                "type": "Business",
                "size": 6,
                "color": "#059669",
            }

        # Address node
        addr_id = f"addr:{addr_hash}"
        if addr_hash and addr_id not in nodes:
            nodes[addr_id] = {
                "id": addr_id,
                "label": f"{r.get('business_address', '')}, {r.get('business_city', '')}",
                "type": "Address",
                "size": 5,
                "color": "#d97706",
            }

        # Bank account node
        bank_id = f"bank:{routing}"
        if routing and bank_id not in nodes:
            nodes[bank_id] = {
                "id": bank_id,
                "label": f"Routing: {routing}",
                "type": "BankAccount",
                "size": 5,
                "color": "#dc2626",
            }

        # Edges
        if bid and ein:
            edges.append({"id": str(edge_id), "source": bid, "target": biz_id, "type": "BORROWER_OWNS_BUSINESS"})
            edge_id += 1
        if ein and addr_hash:
            edges.append({"id": str(edge_id), "source": biz_id, "target": addr_id, "type": "BUSINESS_LOCATED_AT"})
            edge_id += 1
        if ein and routing:
            edges.append({"id": str(edge_id), "source": biz_id, "target": bank_id, "type": "APPLICATION_DEPOSITED_TO"})
            edge_id += 1

    return {"nodes": list(nodes.values()), "edges": edges}


def set_graph_data(data: dict[str, list[dict]]) -> None:
    """Set the graph data store."""
    global _graph_data
    _graph_data = data


@router.get("")
async def get_graph(
    node_type: str = Query("", description="Filter by node type (Borrower, Business, Address, BankAccount)"),
    limit: int = Query(500, ge=1, le=5000, description="Max nodes to return"),
    fraud_only: bool = Query(False, description="Only show nodes connected to fraud alerts"),
) -> dict[str, Any]:
    """Return graph nodes and edges for Sigma.js visualization."""
    nodes = _graph_data.get("nodes", [])
    edges = _graph_data.get("edges", [])

    if node_type:
        filtered_ids = {n["id"] for n in nodes if n.get("type") == node_type}
        nodes = [n for n in nodes if n["id"] in filtered_ids]
        edges = [e for e in edges if e["source"] in filtered_ids or e["target"] in filtered_ids]

    if len(nodes) > limit:
        node_ids = {n["id"] for n in nodes[:limit]}
        nodes = nodes[:limit]
        edges = [e for e in edges if e["source"] in node_ids and e["target"] in node_ids]

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
        },
    }
