"""
Native Graph Topology Engine for DevDoc.
Leverages NetworkX to perform Louvain community detection, calculate degree and betweenness
centrality, identify God Nodes, and enrich code graph nodes and edges with topological metadata.
"""

from __future__ import annotations

import logging
from typing import Any
import networkx as nx

logger = logging.getLogger(__name__)


class GraphTopologyEngine:
    GOD_NODE_DEGREE_THRESHOLD: int = 12
    GOD_NODE_BETWEENNESS_THRESHOLD: float = 0.15

    @classmethod
    def enrich_graph(
        cls,
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """
        Enriches graph nodes with Louvain community detection (community_id, community_name),
        degree centrality, betweenness centrality, and is_god_node flag.
        """
        if not nodes:
            return nodes, edges

        # Build undirected graph for community detection & degree centrality
        G = nx.Graph()

        # Build node id map
        node_map = {str(n.get("id")): n for n in nodes if n.get("id")}

        for nid in node_map:
            G.add_node(nid)

        for e in edges:
            src = e.get("source")
            tgt = e.get("target")
            src_id = str(src.get("id")) if isinstance(src, dict) else str(src)
            tgt_id = str(tgt.get("id")) if isinstance(tgt, dict) else str(tgt)
            if src_id in node_map and tgt_id in node_map and src_id != tgt_id:
                w = float(e.get("weight", 1.0) or 1.0)
                if G.has_edge(src_id, tgt_id):
                    G[src_id][tgt_id]["weight"] = G[src_id][tgt_id].get("weight", 1.0) + w
                else:
                    G.add_edge(src_id, tgt_id, weight=w)

        # 1. Degree and Centrality Metrics
        try:
            deg_centrality = nx.degree_centrality(G)
        except Exception as exc:
            logger.warning(f"Failed to calculate degree centrality: {exc}")
            deg_centrality = {n: 0.0 for n in G.nodes()}

        # Compute distance attribute for shortest path betweenness (distance = 1 / weight)
        for _, _, d in G.edges(data=True):
            edge_w = float(d.get("weight", 1.0) or 1.0)
            d["distance"] = 1.0 / max(edge_w, 0.001)

        try:
            bet_centrality = nx.betweenness_centrality(G, weight="distance")
        except Exception as exc:
            logger.warning(f"Failed to calculate betweenness centrality: {exc}")
            bet_centrality = {n: 0.0 for n in G.nodes()}

        # 2. Louvain Community Detection
        try:
            raw_communities = nx.community.louvain_communities(G, weight="weight", seed=42)
            communities = sorted(raw_communities, key=lambda c: len(c), reverse=True)
        except Exception as exc:
            logger.warning(f"Louvain community detection fallback: {exc}")
            communities = list(nx.connected_components(G))

        # Assign community IDs and derive community names from the highest-degree hub node
        node_to_comm: dict[str, tuple[int, str]] = {}
        for comm_idx, comm_nodes in enumerate(communities):
            if not comm_nodes:
                continue
            hub_id = max(comm_nodes, key=lambda nid: (G.degree(nid), str(nid)))
            hub_node = node_map.get(hub_id)
            hub_name = None
            if hub_node:
                hub_name = hub_node.get("label") or hub_node.get("properties", {}).get("name")
            if not hub_name:
                hub_name = hub_id.split("::")[-1].replace("file://", "")
            comm_name = str(hub_name)

            for nid in comm_nodes:
                node_to_comm[nid] = (comm_idx, comm_name)

        # 3. Enrich Node Properties
        for n in nodes:
            nid = str(n.get("id"))
            deg = G.degree(nid) if G.has_node(nid) else 0
            deg_c = round(float(deg_centrality.get(nid, 0.0)), 4)
            bet_c = round(float(bet_centrality.get(nid, 0.0)), 4)

            is_god = bool(
                deg >= cls.GOD_NODE_DEGREE_THRESHOLD
                or bet_c >= cls.GOD_NODE_BETWEENNESS_THRESHOLD
            )

            comm_id, comm_name = node_to_comm.get(nid, (0, "Default"))

            props = n.setdefault("properties", {})
            props["degree"] = deg
            props["degree_centrality"] = deg_c
            props["betweenness_centrality"] = bet_c
            props["is_god_node"] = is_god
            props["community_id"] = comm_id
            props["community_name"] = comm_name

            # Mirror top-level fields for fast D3 and API access
            n["degree"] = deg
            n["degree_centrality"] = deg_c
            n["betweenness_centrality"] = bet_c
            n["is_god_node"] = is_god
            n["community_id"] = comm_id
            n["community_name"] = comm_name

        return nodes, edges
