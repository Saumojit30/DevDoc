import re

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
import cognee
from cognee.infrastructure.databases.graph import get_graph_engine

router = APIRouter(prefix="/api/graph", tags=["graph"])


def _dataset_name(project: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", project.lower().replace(" ", "_"))
    return f"project_{safe}"


class GraphDataRequest(BaseModel):
    project: str


class GraphInventoryRequest(BaseModel):
    project: str
    samples_per_type: int = 5


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


@router.post("/data")
async def get_graph_data(req: GraphDataRequest):
    """
    Returns raw nodes and edges from the graph engine for a project dataset.
    Consumed by D3.js force-directed visualization.
    """
    dataset = _dataset_name(req.project)
    try:
        graph_engine = await get_graph_engine()
        nodes, edges = await graph_engine.get_graph_data()
        nodes, edges = _filter_nodes_by_dataset(nodes, edges, dataset)

        node_list = []
        for n in nodes:
            node_id, props = n if isinstance(n, tuple) else (str(n), {})
            safe_props = {k: str(v) if not isinstance(v, (str, int, float, bool, list, dict)) else v for k, v in props.items()}
            node_list.append({
                "id": str(node_id),
                "label": safe_props.get("name") or safe_props.get("type") or safe_props.get("label", "Node"),
                "type": safe_props.get("type", safe_props.get("node_type", "unknown")),
                "source": str(safe_props.get("source") or safe_props.get("source_pipeline") or "")[:200],
                "properties": safe_props,
            })

        node_ids = {n["id"] for n in node_list}
        edge_list = []
        for e in edges:
            source_id, target_id, rel_name, props = e if isinstance(e, tuple) else (str(e), "", "", {})
            if source_id not in node_ids and target_id not in node_ids:
                continue
            safe_props = {k: str(v) if not isinstance(v, (str, int, float, bool, list, dict)) else v for k, v in props.items()}
            edge_list.append({
                "source": str(source_id),
                "target": str(target_id),
                "relation": rel_name or safe_props.get("relation", "related"),
                "weight": safe_props.get("weight", 1.0),
                "properties": safe_props,
            })

        return {
            "dataset": dataset,
            "nodes": node_list,
            "edges": edge_list,
            "metrics": {
                "num_nodes": len(node_list),
                "num_edges": len(edge_list),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        graph_engine = await get_graph_engine()
        nodes, edges = await graph_engine.get_graph_data()
        nodes, _ = _filter_nodes_by_dataset(nodes, edges, dataset)

        num_nodes = len(nodes)
        unique_edge_pairs = set()
        total_degree = 0
        for source_id, target_id, *_ in edges:
            if source_id in {n[0] for n in nodes} or target_id in {n[0] for n in nodes}:
                unique_edge_pairs.add((source_id, target_id))
                total_degree += 1

        return {
            "dataset": dataset,
            "metrics": {
                "num_nodes": num_nodes,
                "num_edges": len(unique_edge_pairs),
                "num_connected_components": 0,
                "mean_degree": round(total_degree / num_nodes, 2) if num_nodes else 0,
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
