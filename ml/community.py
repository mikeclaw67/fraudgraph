#!/usr/bin/env python3
# Community Detection — Louvain algorithm for identifying fraud clusters
# in the entity graph. Builds a NetworkX graph from loan records, runs
# Louvain community detection, and computes graph centrality scores that
# feed into the composite risk scorer (weight: 0.25 default).
# Communities with high intra-cluster connectivity are potential fraud rings.

from __future__ import annotations

import hashlib
import logging
from typing import Any

import networkx as nx

logger = logging.getLogger(__name__)


def build_entity_graph(records: list[dict]) -> nx.Graph:
    """Build a NetworkX graph from loan records.

    Nodes: borrowers, businesses (by EIN), addresses (hashed), bank accounts (routing).
    Edges: ownership, location, banking relationships.
    """
    G = nx.Graph()

    for r in records:
        bid = r.get("borrower_id", "")
        ein = r.get("ein", "")
        routing = r.get("bank_routing", "")

        addr_raw = "|".join([
            r.get("business_address", "").strip().lower(),
            r.get("business_city", "").strip().lower(),
            r.get("business_state", "").strip().upper(),
            r.get("business_zip", "").strip()[:5],
        ])
        addr_hash = hashlib.sha256(addr_raw.encode()).hexdigest()[:16]

        # Add nodes with type attributes
        if bid:
            G.add_node(bid, type="Borrower", name=r.get("borrower_name", ""))
        if ein:
            biz_node = f"biz:{ein}"
            G.add_node(biz_node, type="Business", name=r.get("business_name", ""))
        if addr_hash:
            addr_node = f"addr:{addr_hash}"
            G.add_node(addr_node, type="Address")
        if routing:
            bank_node = f"bank:{routing}"
            G.add_node(bank_node, type="BankAccount")

        # Add edges
        if bid and ein:
            G.add_edge(bid, f"biz:{ein}", relationship="OWNS")
        if ein and addr_hash:
            G.add_edge(f"biz:{ein}", f"addr:{addr_hash}", relationship="LOCATED_AT")
        if ein and routing:
            G.add_edge(f"biz:{ein}", f"bank:{routing}", relationship="BANKS_AT")

    logger.info("Built graph: %d nodes, %d edges", G.number_of_nodes(), G.number_of_edges())
    return G


def detect_communities(G: nx.Graph) -> dict[str, int]:
    """Run Louvain community detection and return node -> community_id mapping."""
    try:
        communities = nx.community.louvain_communities(G, seed=42)
    except AttributeError:
        # Fallback for older NetworkX versions
        try:
            from community import best_partition
            partition = best_partition(G, random_state=42)
            return partition
        except ImportError:
            logger.warning("Louvain not available — assigning all nodes to community 0")
            return {node: 0 for node in G.nodes()}

    node_to_community = {}
    for community_id, members in enumerate(communities):
        for node in members:
            node_to_community[node] = community_id

    logger.info("Detected %d communities", len(communities))
    return node_to_community


def compute_centrality_scores(
    G: nx.Graph,
    records: list[dict],
) -> dict[str, float]:
    """Compute graph-based risk scores for borrowers.

    Uses degree centrality and community density to generate a 0-100 score
    per borrower. High centrality in a dense cluster = higher fraud risk.

    Returns borrower_id -> graph_score (0-100).
    """
    if G.number_of_nodes() == 0:
        return {}

    # Degree centrality (normalized 0-1)
    degree_cent = nx.degree_centrality(G)

    # Community detection
    communities = detect_communities(G)

    # Community sizes for density scoring
    from collections import Counter
    community_sizes = Counter(communities.values())

    # Score each borrower
    scores = {}
    for r in records:
        bid = r.get("borrower_id", "")
        if not bid or bid not in G:
            scores[bid] = 0.0
            continue

        # Component 1: degree centrality (how connected is this entity)
        deg_score = degree_cent.get(bid, 0.0) * 100

        # Component 2: community density (is this entity in a suspicious cluster)
        comm_id = communities.get(bid, -1)
        comm_size = community_sizes.get(comm_id, 1)
        # Larger communities with shared resources are more suspicious
        density_score = min(100.0, (comm_size / 10.0) * 100)

        # Weighted combination: 60% centrality, 40% community density
        score = 0.6 * deg_score + 0.4 * density_score
        scores[bid] = float(min(100.0, max(0.0, score)))

    logger.info("Computed centrality scores for %d borrowers", len(scores))
    return scores


def analyze_communities(G: nx.Graph) -> list[dict[str, Any]]:
    """Analyze detected communities and return metadata for each.

    Returns list of community info dicts, sorted by size (largest first).
    """
    communities_map = detect_communities(G)

    from collections import Counter, defaultdict
    community_members: dict[int, list] = defaultdict(list)
    for node, comm_id in communities_map.items():
        community_members[comm_id].append(node)

    results = []
    for comm_id, members in community_members.items():
        # Count node types in community
        type_counts = Counter()
        for m in members:
            ntype = G.nodes[m].get("type", "Unknown") if m in G else "Unknown"
            type_counts[ntype] += 1

        subgraph = G.subgraph(members)
        results.append({
            "community_id": comm_id,
            "size": len(members),
            "node_types": dict(type_counts),
            "edge_count": subgraph.number_of_edges(),
            "density": nx.density(subgraph) if len(members) > 1 else 0.0,
        })

    results.sort(key=lambda x: x["size"], reverse=True)
    return results
