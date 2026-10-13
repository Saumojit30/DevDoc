# Proposal: Native CodeGraph Engine Elevation

## Why
While DevDoc provides multi-language AST extraction and an architecture-first D3 visualizer, its graph precision and topological intelligence have clear room for elevation:
1. AST call resolution flattens member calls and discards the receiver object (e.g. `CogneeService.chat(...)` vs `chat(...)`), causing cross-file resolution to drop valid edges or mistakenly associate calls with identical local function names.
2. Type annotations and object instantiations do not generate explicit dependency edges (`REFERENCES` and `USES`), leaving semantic coupling under-represented.
3. The graph lacks topological graph analytics such as Louvain community detection and degree/betweenness centrality, which are essential for identifying architectural clusters and architectural "God Nodes".
4. The frontend D3 force simulation undergoes visual wobble/explosion on initial render, draws straight overlapping edges, and lacks community convex hull clustering and level-of-detail (LOD) semantic label culling.

This change elevates DevDoc's native code graph engine with precision 3-tier AST symbol resolution, NetworkX-powered Louvain community clustering and centrality analysis, and a zero-wobble pre-stabilized D3 visualizer with Catmull-Rom bubble hulls and quadratic Bézier edge routing.

## What Changes
- **Precision AST Call & Symbol Resolution (`ast_parser.py`, `symbol_table.py`)**:
  - Introduce `CallReference(callee, receiver, is_member)` in `ast_parser.py` preserving receiver context from `ast.Attribute` and `ast.Name`.
  - Implement a 3-tier symbol lookup hierarchy in `symbol_table.py`:
    - Tier 1: Same class / scope resolution for `self` or local invocations.
    - Tier 2: Import-aware receiver matching to correctly resolve cross-file class/module methods (e.g., `main.py::chat` calling `CogneeService.chat`).
    - Tier 3: Emit `REFERENCES` edges for type annotations and `USES` edges for instantiated dependencies.
- **Native NetworkX Topology & Community Detection (`graph_topology.py`)**:
  - Build `GraphTopologyEngine` in `devdoc/backend/graph_topology.py` using `networkx 3.7`.
  - Calculate Louvain community partitions, label clusters by their highest-degree hub, and compute degree and betweenness centrality.
  - Flag "God Nodes" (degree >= 12 or betweenness >= 0.15) for high-salience architectural visibility.
  - Enrich AST graphs during ingestion and API serving (`cognee_service.py` and `graph_routes.py`), pre-seeding cached AST graph datasets.
- **D3 Visualizer Polish (`KnowledgeGraph.tsx`)**:
  - Implement zero-wobble off-screen simulation pre-stabilization (120-150 ticks) for instant settled layout.
  - Render translucent Catmull-Rom convex bubble hulls around Louvain communities using `d3.polygonHull`.
  - Implement dynamic node radius scaling and LOD semantic label culling based on node centrality and God Node status.
  - Implement curved quadratic Bézier SVG edge routing to avoid straight-line edge occlusion.

## Capabilities

### New Capabilities
- `native-codegraph-elevation`: 3-tier AST symbol resolution, NetworkX community topology and centrality metrics, and pre-stabilized bubble hull D3 visualization.

### Modified Capabilities
- `architecture-codegraph`: Updated to incorporate community clustering IDs, centrality weights, and quadratic Bézier paths in both architecture and symbol view modes.

## Impact
- `devdoc/backend/ast_parser.py`: Call extraction and type reference parsing.
- `devdoc/backend/symbol_table.py`: 3-tier lookup resolution and typed edge emission.
- `devdoc/backend/graph_topology.py`: New NetworkX topology engine.
- `devdoc/backend/graph_routes.py`: Topological enrichment hook on graph endpoints.
- `devdoc/backend/cognee_service.py`: Topological enrichment during ingestion and saving.
- `devdoc/frontend/components/KnowledgeGraph.tsx`: Pre-stabilized force layout, convex hulls, curved paths, and LOD labels.
- Pre-seeded graph data in `.data_storage/ast_graphs/`.
