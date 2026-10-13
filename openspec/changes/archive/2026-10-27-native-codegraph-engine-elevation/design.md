# Design: Native CodeGraph Engine Elevation

## Architectural Context
DevDoc's knowledge graph architecture operates across three synchronized tiers:
1. **Backend AST Analysis (`ast_parser.py`, `symbol_table.py`)**:
   - Parses multi-language source trees (Python, TypeScript, Go, Rust) into syntactic symbols.
   - Now enriched with structured `CallReference(callee: str, receiver: Optional[str], is_member: bool)` and `type_references: list[str]`.
   - The symbol table employs a 3-tier resolution engine:
     - Tier 1: Local / parent scope matching (e.g. `self.foo()` -> enclosing class `foo`).
     - Tier 2: Import-aware receiver matching (e.g. `CogneeService.chat` matching imported `from cognee_service import CogneeService`).
     - Tier 3: Type annotation references (`REFERENCES`) and object instantiations (`USES`).
2. **Topological Analytics (`graph_topology.py`)**:
   - Ingests raw symbol nodes and directional edges into a NetworkX directed and undirected graph (`nx.DiGraph` / `nx.Graph`).
   - Uses Louvain community detection (`nx.community.louvain_communities`) to assign modular clusters.
   - Names each community by the most central hub node in that cluster.
   - Calculates degree and betweenness centrality, flagging nodes meeting the God Node threshold (`degree >= 12` or `betweenness >= 0.15`).
   - Hooks into `cognee_service.py` (`save_ast_graph`) and `graph_routes.py` (`get_graph_data`).
3. **Frontend Presentation (`KnowledgeGraph.tsx`)**:
   - Force simulation pre-computes 120-150 ticks synchronously before attaching to the DOM (`sim.stop()` followed by iterative `sim.tick()`).
   - Communities are visualized with convex hulls computed via `d3.polygonHull`, expanded outward radially from their centroid, and rendered as Catmull-Rom closed SVG paths (`d3.curveCatmullRomClosed`).
   - Links are rendered using quadratic Bézier curve paths (`d="M sx sy Q cx cy tx ty"`), calculating a perpendicular control point offset.
   - Node radii scale according to degree centrality, with semantic label culling prioritizing God Nodes.

## Migration and Pre-seeding
- The pre-existing cached graphs in `.data_storage/ast_graphs/main.json` and `project_main.json` will be updated with the enriched topology fields so existing projects immediately experience the elevated visualization without requiring manual re-indexing.
