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

        # Filter to project-scoped if needed (Cognee handles this via dataset)
        # Return as serializable dicts
        node_list = []
        for n in nodes:
            d = dict(n) if hasattr(n, "__dict__") else n
            node_list.append({
                "id": str(d.get("id", d.get("node_id", hash(str(d))))),
                "label": d.get("name", d.get("label", d.get("type", "Node"))),
                "type": d.get("type", d.get("node_type", "unknown")),
                "source": d.get("source", "")[:200],
            })

        edge_list = []
        for e in edges:
            d = dict(e) if hasattr(e, "__dict__") else e
            edge_list.append({
                "source": str(d.get("source_id", d.get("source", ""))),
                "target": str(d.get("target_id", d.get("target", ""))),
                "relation": d.get("relation", d.get("label", "related")),
                "weight": d.get("weight", 1.0),
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
    Useful for dashboard summaries and color coding.
    """
    try:
        inventory = await cognee.get_schema_inventory(
            dataset=None,  # TODO: scope by dataset if API supports
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
