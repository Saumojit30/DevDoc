import json
import os
import re
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
import cognee
from cognee.infrastructure.databases.graph import get_graph_engine

from cognee_service import load_ast_graph

router = APIRouter(prefix="/api/graph", tags=["graph"])


def _dataset_name(project: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", project.lower().replace(" ", "_"))
    return f"project_{safe}"


class GraphDataRequest(BaseModel):
    project: str


class GraphInventoryRequest(BaseModel):
    project: str
    samples_per_type: int = 5


class SymbolLookupRequest(BaseModel):
    project: str
    symbol_id: str


def _filter_nodes_by_dataset(nodes: list, edges: list, dataset: str) -> tuple[list, list]:
    dataset_node_ids = set()
    filtered_nodes = []
    for node_id, props in nodes:
        node_dataset = props.get("dataset_name")
        if node_dataset is None or node_dataset == dataset or node_dataset == "None":
            dataset_node_ids.add(node_id)
            filtered_nodes.append((node_id, props))

    filtered_edges = []
    for source_id, target_id, rel_name, props in edges:
        if source_id in dataset_node_ids or target_id in dataset_node_ids:
            filtered_edges.append((source_id, target_id, rel_name, props))

    return filtered_nodes, filtered_edges


def _extract_source_snippet(file_path: str, start_line: int, end_line: int) -> str:
    try:
        p = Path(file_path)
        if not p.exists():
            return ""
        lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        start = max(0, start_line - 1)
        end = min(len(lines), max(end_line, start_line))
        return "\n".join(lines[start:end])
    except Exception:
        return ""


@router.post("/data")
async def get_graph_data(req: GraphDataRequest):
    """
    Returns raw nodes and edges from the graph engine and deep AST parser for a project dataset.
    Consumed by D3.js force-directed visualization and inspector.
    """
    dataset = _dataset_name(req.project)
    try:
        # 1. Fetch Cognee graph engine data
        cognee_nodes: list = []
        cognee_edges: list = []
        try:
            graph_engine = await get_graph_engine()
            raw_nodes, raw_edges = await graph_engine.get_graph_data()
            cognee_nodes, cognee_edges = _filter_nodes_by_dataset(raw_nodes, raw_edges, dataset)
        except Exception:
            cognee_nodes, cognee_edges = [], []

        # 2. Fetch Deep AST Graph nodes & edges
        ast_nodes, ast_edges = load_ast_graph(dataset)

        node_dict: dict[str, dict[str, Any]] = {}

        # Add Cognee nodes
        for n in cognee_nodes:
            node_id, props = n if isinstance(n, tuple) else (str(n), {})
            safe_props = {k: str(v) if not isinstance(v, (str, int, float, bool, list, dict)) else v for k, v in props.items()}
            nid = str(node_id)
            node_dict[nid] = {
                "id": nid,
                "label": safe_props.get("name") or safe_props.get("type") or safe_props.get("label", "Node"),
                "type": safe_props.get("type", safe_props.get("node_type", "unknown")),
                "source": str(safe_props.get("source") or safe_props.get("source_pipeline") or "")[:200],
                "properties": safe_props,
            }

        # Add / Merge AST nodes (AST nodes take priority for code symbols with line numbers, signatures)
        for n in ast_nodes:
            nid = str(n.get("id"))
            props = n.get("properties", {})
            safe_props = {k: str(v) if not isinstance(v, (str, int, float, bool, list, dict)) else v for k, v in props.items()}
            node_dict[nid] = {
                "id": nid,
                "label": n.get("label") or safe_props.get("name", "Node"),
                "type": n.get("type") or safe_props.get("type", "CodeSymbol"),
                "source": str(n.get("source") or safe_props.get("file_path", ""))[:200],
                "properties": safe_props,
            }

        node_list = list(node_dict.values())
        node_ids = set(node_dict.keys())

        edge_list: list[dict[str, Any]] = []
        seen_edges: set[tuple[str, str, str]] = set()

        # Add Cognee edges
        for e in cognee_edges:
            source_id, target_id, rel_name, props = e if isinstance(e, tuple) else (str(e), "", "", {})
            sid, tid = str(source_id), str(target_id)
            if sid not in node_ids and tid not in node_ids:
                continue
            rel = rel_name or props.get("relation", "related")
            key = (sid, tid, rel)
            if key in seen_edges:
                continue
            seen_edges.add(key)
            safe_props = {k: str(v) if not isinstance(v, (str, int, float, bool, list, dict)) else v for k, v in props.items()}
            edge_list.append({
                "source": sid,
                "target": tid,
                "relation": rel,
                "weight": safe_props.get("weight", 1.0),
                "properties": safe_props,
            })

        # Add AST edges
        for e in ast_edges:
            sid = str(e.get("source"))
            tid = str(e.get("target"))
            rel = str(e.get("relation", "related"))
            if sid not in node_ids or tid not in node_ids:
                continue
            key = (sid, tid, rel)
            if key in seen_edges:
                continue
            seen_edges.add(key)
            props = e.get("properties", {})
            safe_props = {k: str(v) if not isinstance(v, (str, int, float, bool, list, dict)) else v for k, v in props.items()}
            edge_list.append({
                "source": sid,
                "target": tid,
                "relation": rel,
                "weight": e.get("weight", 1.0),
                "properties": safe_props,
            })

        return {
            "dataset": dataset,
            "nodes": node_list,
            "edges": edge_list,
            "metrics": {
                "num_nodes": len(node_list),
                "num_edges": len(edge_list),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/symbol")
async def get_symbol_details(req: SymbolLookupRequest):
    """
    Fetch deep symbol details, line snippets, callers, and callees.
    """
    dataset = _dataset_name(req.project)
    ast_nodes, _ = load_ast_graph(dataset)

    node_map = {n["id"]: n for n in ast_nodes}
    target_node = node_map.get(req.symbol_id)

    if not target_node:
        raise HTTPException(status_code=404, detail=f"Symbol '{req.symbol_id}' not found in dataset '{dataset}'")

    props = target_node.get("properties", {})
    file_path = props.get("file_path", "")
    start_line = props.get("start_line", 1)
    end_line = props.get("end_line", start_line)

    snippet = _extract_source_snippet(file_path, start_line, end_line)

    callers_data = []
    for c_id in props.get("callers", []):
        if c_id in node_map:
            callers_data.append({
                "id": c_id,
                "label": node_map[c_id].get("label"),
                "type": node_map[c_id].get("type"),
                "signature": node_map[c_id].get("properties", {}).get("signature", ""),
            })

    callees_data = []
    for c_id in props.get("callees", []):
        if c_id in node_map:
            callees_data.append({
                "id": c_id,
                "label": node_map[c_id].get("label"),
                "type": node_map[c_id].get("type"),
                "signature": node_map[c_id].get("properties", {}).get("signature", ""),
            })

    return {
        "symbol": target_node,
        "code_snippet": snippet,
        "callers": callers_data,
        "callees": callees_data,
    }


@router.post("/inventory")
async def get_graph_inventory(req: GraphInventoryRequest):
    """
    Returns schema inventory: type counts, samples, and relationship distributions.
    """
    try:
        inventory = await cognee.get_schema_inventory(
            dataset=_dataset_name(req.project),
            samples_per_type=req.samples_per_type,
            sort="count",
        )
        return {"inventory": inventory}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/metrics")
async def get_graph_metrics(req: GraphDataRequest):
    """
    Quick metrics endpoint for the sidebar stats, scoped to the project dataset.
    """
    dataset = _dataset_name(req.project)
    try:
        data = await get_graph_data(req)
        nodes = data["nodes"]
        edges = data["edges"]
        num_nodes = len(nodes)
        num_edges = len(edges)

        return {
            "dataset": dataset,
            "metrics": {
                "num_nodes": num_nodes,
                "num_edges": num_edges,
                "num_connected_components": 0,
                "mean_degree": round((2 * num_edges) / num_nodes, 2) if num_nodes else 0,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/visualize")
async def get_graph_visualize(project: str = Query("main", description="Project name for dataset")):
    """
    Generates and returns the self-contained HTML visualization from Cognee.
    The HTML is served as plain text so the frontend can offer it as a file download.
    """
    dataset = _dataset_name(project)
    try:
        html = await cognee.visualize_graph(dataset=dataset, include_session_events=True)
        return PlainTextResponse(html, media_type="text/html", headers={
            "Content-Disposition": f"attachment; filename=\"cognee_graph_{dataset}.html\"",
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/visualize-html")
async def get_graph_visualize_html(req: GraphDataRequest):
    """
    Returns Cognee's built-in graph visualization HTML as a JSON string
    so the frontend can embed it inline (e.g., in an iframe).
    """
    dataset = _dataset_name(req.project)
    try:
        html = await cognee.visualize_graph(dataset=dataset, include_session_events=True)
        return {"html": html, "dataset": dataset}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
