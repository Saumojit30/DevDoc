# Spec Delta: Native CodeGraph Elevation

## Purpose
Provides high-precision AST call and reference resolution, native NetworkX graph topology and community detection, and an elevated zero-wobble D3 visualizer with community bubble hulls and Bézier routing.

## ADDED Requirements

### Requirement: Precision AST Call and Reference Resolution
The backend AST parser and symbol table SHALL extract structured call references containing receiver context and resolve them using a 3-tier lookup hierarchy, while emitting typed dependency edges for type annotations and instantiations.

#### Scenario: Preserving receiver in member call extraction
- **WHEN** Python code contains a member call such as `CogneeService.chat(...)` or `self.update(...)`
- **THEN** the parser MUST record a structured `CallReference` preserving both the callee name (`chat`) and the receiver (`CogneeService` or `self`).

#### Scenario: Resolving imported member invocations
- **WHEN** a function invokes an imported symbol's member method (e.g. `main.py::chat` calling `CogneeService.chat`)
- **THEN** the symbol table MUST resolve the call directly to the target method in the imported module/class instead of discarding it due to identical local names.

#### Scenario: Emitting REFERENCES and USES edges
- **WHEN** a symbol declares parameter/return type annotations or instantiates dependencies
- **THEN** the symbol table MUST emit `REFERENCES` edges to the annotated type symbols and `USES` edges to instantiated classes.

### Requirement: Native NetworkX Topology and Community Detection
The backend SHALL calculate Louvain community partitions, degree centrality, betweenness centrality, and God Node classifications using NetworkX.

#### Scenario: Louvain community partitioning
- **WHEN** an AST graph is enriched by `GraphTopologyEngine`
- **THEN** every node MUST be assigned a `community_id` (integer) and `community_name` derived from the highest-degree hub in that cluster.

#### Scenario: Centrality calculation and God Node flagging
- **WHEN** computing graph topology metrics
- **THEN** nodes MUST receive `degree_centrality`, `betweenness_centrality`, and `degree` properties, and nodes with degree >= 12 or betweenness >= 0.15 MUST be flagged with `is_god_node: True`.

### Requirement: Pre-stabilized D3 Force Layout and Bubble Hulls
The frontend D3 visualizer SHALL pre-stabilize the force simulation off-screen before initial render, render translucent Catmull-Rom convex bubble hulls for communities, and route edges as curved quadratic Bézier paths.

#### Scenario: Instant settled render without physics wobble
- **WHEN** the knowledge graph mounts or dataset loads
- **THEN** the simulation MUST execute 120-150 physics ticks off-screen prior to visible presentation so nodes do not violently explode or wobble.

#### Scenario: Rendering community convex hulls
- **WHEN** nodes with `community_id` properties are rendered
- **THEN** the visualizer MUST compute `d3.polygonHull` boundaries around clustered nodes, expand them outward by padding from the centroid, and render closed Catmull-Rom curved SVG paths.

#### Scenario: Curved quadratic Bézier edge paths
- **WHEN** rendering links between nodes
- **THEN** links MUST be rendered as curved quadratic Bézier SVG paths with control points offset from the chord midpoint.
