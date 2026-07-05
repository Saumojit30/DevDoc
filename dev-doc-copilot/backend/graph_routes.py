"""
Graph data endpoints for real-time D3.js visualization.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import cognee
from cognee.infrastructure.databases.graph import get_graph_engine

router = APIRouter(prefix="/api/graph", tags=["graph"])

class GraphDataRequest(BaseModel):
    project: str

class GraphInventoryRequest(BaseModel):
    project: str
    samples_per_type: int = 5

@router.post("/data")
async def get_graph_data(req: GraphDataRequest):
    """
    Returns raw nodes and edges from the graph engine for a project dataset.
    Consumed by D3.js force-directed visualization.
    """
    try:
        dataset = f"project-{req.project}"
        graph_engine = await get_graph_engine()
        nodes, edges = await graph_engine.get_graph_data()

        node_list = []
        for n in nodes:
            node_id, props = n if isinstance(n, tuple) else (str(n), {})
            node_list.append({
                "id": str(node_id),
                "label": props.get("name", props.get("label", props.get("type", "Node"))),
                "type": props.get("type", props.get("node_type", "unknown")),
                "source": str(props.get("source", ""))[:200],
            })

        edge_list = []
        for e in edges:
            source_id, target_id, rel_name, props = e if isinstance(e, tuple) else (str(e), "", "", {})
            edge_list.append({
                "source": str(source_id),
                "target": str(target_id),
                "relation": rel_name or props.get("relation", "related"),
                "weight": props.get("weight", 1.0),
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
            dataset=None,
            samples_per_type=req.samples_per_type,
            sort="count",
        )
        return {"inventory": inventory}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/metrics")
async def get_graph_metrics(req: GraphDataRequest):
    """
    Quick metrics endpoint for the sidebar stats.
    """
    try:
        graph_engine = await get_graph_engine()
        metrics = await graph_engine.get_graph_metrics()
        return {"dataset": f"project-{req.project}", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
