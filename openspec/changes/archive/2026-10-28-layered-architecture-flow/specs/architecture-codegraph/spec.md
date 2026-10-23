# architecture-codegraph Specification (Delta)

## ADDED Requirements

### Requirement: Topological Layering and Tier Calculation
The graph visualizer SHALL compute automatic tier levels for all architectural file nodes based on dependency flow and topological depth from entry points down to leaves.

#### Scenario: Categorizing entry points and server root
- **WHEN** a file has zero incoming file-to-file call dependencies or is designated as a main application entry point (e.g., `main.py`)
- **THEN** the system MUST assign it to Tier 0 (Entry Points & Server Root).

#### Scenario: Computing dependency ranks for downstream files
- **WHEN** files depend on higher-tier controllers and services
- **THEN** the visualizer MUST rank HTTP routes into Tier 1, business services and topology engines into Tier 2, parsers and symbols into Tier 3, and configuration files into Tier 4.

#### Scenario: Docking non-code and utility files
- **WHEN** isolated non-code files (such as `README.md` or standalone documentation) exist in the graph
- **THEN** the system MUST dock them in a dedicated side utility tier without disturbing the main vertical DAG flow.

### Requirement: Structured Tiered Coordinate Positioning and Physics
The graph visualizer SHALL constrain node Y-coordinates strictly by tier level with uniform vertical tier spacing while distributing nodes horizontally within each tier.

#### Scenario: Positioning nodes along vertical tiers
- **WHEN** the D3 force simulation is initialized
- **THEN** each node MUST be attracted to its tier's vertical band using `d3.forceY().y(d => tierY[d.tier]).strength(0.85)` and spaced with 180px–220px vertical tier separation.

#### Scenario: Horizontal distribution and collision clearance
- **WHEN** multiple file cards occupy the same architectural tier
- **THEN** the simulation MUST space them horizontally with balanced positioning and collision avoidance to prevent cards from overlapping.

### Requirement: Downward Flowing Bézier Edge Routing
The graph canvas SHALL route dependency edges using smooth cubic Béziers with downward-oriented directional arrows indicating caller-to-callee data flow.

#### Scenario: Routing edges between architectural tiers
- **WHEN** rendering a dependency edge from a caller card at $(s.x, s.y)$ to a callee card at $(t.x, t.y)$
- **THEN** the edge MUST be drawn as a smooth cubic Bézier curve `M s.x,s.y C s.x, s.y + 60, t.x, t.y - 60, t.x, t.y` with a downward directional arrow marker.

### Requirement: Hierarchical Sub-Grid Symbol Expansion
The graph visualizer SHALL support expandable file cards where child symbols expand cleanly in a structured sub-tier directly beneath or adjacent to the parent card.

#### Scenario: Expanding child symbols from a file card
- **WHEN** a user clicks on an architectural file card or its expansion badge
- **THEN** the card's child symbols (classes, functions, methods) MUST expand in a neat sub-grid without overlapping cards in lower tiers.

### Requirement: Visual Tier Dividers and Headers
The graph canvas SHALL render subtle horizontal tier dividers and semantic labels indicating each architectural layer.

#### Scenario: Displaying architectural layer dividers
- **WHEN** the layered architecture view is rendered
- **THEN** horizontal guidelines and labels ("Entry Points", "Routing Layer", "Core Services", "AST & Parsing", "Configuration") MUST render across the background at each tier level.
