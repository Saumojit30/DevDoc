# Tasks: Native CodeGraph Engine Elevation

## 1. Precision AST Call & Symbol Resolution
- [x] 1.1 In `devdoc/backend/ast_parser.py`, define `CallReference` dataclass and extract structured call references preserving receiver and member flags from `ast.Attribute` and `ast.Name`.
- [x] 1.2 In `devdoc/backend/ast_parser.py`, extract type references from annotations and class instantiations.
- [x] 1.3 In `devdoc/backend/symbol_table.py`, rewrite call resolution with the 3-tier lookup hierarchy (Tier 1: same class/scope; Tier 2: import-aware receiver matching; Tier 3: REFERENCES and USES edge emission).

## 2. Native NetworkX Topology & Community Detection
- [x] 2.1 Create `devdoc/backend/graph_topology.py` implementing `GraphTopologyEngine` with Louvain community detection and degree/betweenness centrality calculations.
- [x] 2.2 Implement God Node classification (`is_god_node: True` when degree >= 12 or betweenness >= 0.15) and community naming via highest-degree hub nodes.
- [x] 2.3 Integrate `GraphTopologyEngine.enrich_graph` into `graph_routes.py` and `cognee_service.py`.
- [x] 2.4 Pre-seed/update `.data_storage/ast_graphs/main.json` and `project_main.json` with topological community and centrality metadata.

## 3. D3 Visualizer Polish
- [x] 3.1 In `devdoc/frontend/components/KnowledgeGraph.tsx`, implement zero-wobble off-screen pre-stabilization running 120-150 simulation ticks before DOM rendering.
- [x] 3.2 In `devdoc/frontend/components/KnowledgeGraph.tsx`, implement Catmull-Rom convex bubble hulls using `d3.polygonHull` grouped by `community_id`.
- [x] 3.3 In `devdoc/frontend/components/KnowledgeGraph.tsx`, implement quadratic Bézier edge routing (`Q cx cy`) with curvature to avoid straight overlapping links.
- [x] 3.4 In `devdoc/frontend/components/KnowledgeGraph.tsx`, implement centrality-based node radius scaling and level-of-detail (LOD) semantic label culling prioritizing God Nodes.

## 4. Verification & Validation
- [x] 4.1 Create and run automated unit tests verifying the 3-tier resolver and NetworkX topology engine.
- [x] 4.2 Verify Next.js frontend builds cleanly (`npm run build`).
- [x] 4.3 Validate and archive the OpenSpec change with `openspec validate` and `openspec archive`.
