# architecture-codegraph Specification

## Purpose
Provides high-level architectural dependency visualization, module-level clustering, and upstream/downstream dependency path tracing for codebases.

## Requirements

### Requirement: Architecture View Mode
The graph visualizer SHALL support an Architecture View mode that collapses granular internal functions and classes into module and file nodes, with links representing aggregate file-to-file import and call dependencies.

#### Scenario: Switching between Architecture and Symbol views
- **WHEN** the user toggles the view mode between "Architecture" and "Deep Symbols"
- **THEN** the graph simulation MUST re-filter the node and link datasets accordingly and animate to the selected abstraction level.

#### Scenario: Viewing aggregate coupling weight
- **WHEN** viewing links in Architecture mode between two coupled files
- **THEN** the link line thickness MUST scale with the aggregate number of import and call connections between those files.

### Requirement: Upstream and Downstream Dependency Highlighting
The graph visualizer SHALL highlight upstream dependencies and downstream consumers when a node is selected or hovered, while dimming unrelated nodes.

#### Scenario: Selecting a file node
- **WHEN** the user clicks on a file node in the graph
- **THEN** all upstream dependencies (modules/files imported by it) MUST highlight in cyan, downstream consumers (files importing it) MUST highlight in amber, and unrelated nodes MUST dim.

### Requirement: Professional Monochromatic Palette
The graph visualizer SHALL render nodes and links using a high-contrast dark theme with semantic role accents rather than multi-color neon pastels.

#### Scenario: Rendering node visual elements
- **WHEN** nodes are rendered on the canvas
- **THEN** files and modules MUST display dark slate containers, crisp borders, and monospaced file extension badges without blurry glowing drop shadows or halo filters.

#### Scenario: JetBrains / VS Code IDE Matte Cards and Syntax Glyphs
- **WHEN** file and symbol nodes are rendered on the canvas
- **THEN** node bodies MUST use unified deep matte charcoal backgrounds (`#0f172a` with `#334155` borders) and display dedicated syntax glyph badges (`[ƒ]` for functions, `[C]` for classes, `[I]` for interfaces, `[M]` for modules) with high-contrast foreground accents.

### Requirement: Fullscreen Viewport Geometry
The graph container SHALL occupy the full remaining viewport height below the navigation header without vertical collapse or trailing empty space.

#### Scenario: Rendering in standard desktop browser
- **WHEN** the user navigates to the Knowledge Graph tab
- **THEN** the graph container MUST fill `h-[calc(100vh-64px)]` and offset left by `md:ml-64` to align seamlessly with the application top and side navigation bars.

### Requirement: Clean Edge Presentation
The graph canvas SHALL NOT render permanent text labels on edges by default to avoid visual congestion.

#### Scenario: Inspecting link coupling
- **WHEN** the graph renders file-to-file links
- **THEN** links MUST render as clean directional lines or curved paths without static text overlays, and coupling details MUST be accessible via node selection and the inspector panel.

#### Scenario: Focused connection highlighting
- **WHEN** a user hovers over or selects a node
- **THEN** all direct incoming and outgoing links for that node MUST highlight with an accent color (`#38bdf8` or `#60a5fa`), and all non-connected nodes and edges MUST dim to an opacity of 0.15 or lower.

### Requirement: Card Label Truncation and Collision Clearance
Architecture file cards SHALL sanitize directory paths and enforce sufficient collision spacing to prevent overlapping cards.

#### Scenario: Displaying long directory paths
- **WHEN** a file node belongs to a deep directory hierarchy
- **THEN** the card module subtitle MUST display only the relative or trailing directory segments (maximum 18 characters) rather than full absolute filesystem paths.

### Requirement: Community Island Spatial Separation
The graph visualizer SHALL compute distinct, non-overlapping spatial centers for architectural communities, anchoring nodes with multi-focal cluster forces so that community convex hulls form isolated islands without mutual collision.

#### Scenario: Rendering multiple communities
- **WHEN** the codebase contains multiple architectural communities
- **THEN** the simulation MUST assign each community a distinct radial spatial center and attract community nodes toward their respective island center using multi-focal forces.

#### Scenario: Rendering community convex hulls
- **WHEN** community hulls are rendered on the canvas
- **THEN** each hull MUST enclose only nodes of that community and maintain visual separation from neighboring community hulls without overlapping.

### Requirement: Hub-and-Spoke Radial Satellites
The graph visualizer SHALL represent files and modules as authoritative Hub nodes surrounded by their internal symbols (functions, methods, classes) orbiting as radial satellites.

#### Scenario: Visualizing file symbols
- **WHEN** symbols belonging to a parent file or module are displayed
- **THEN** the symbols MUST orbit in a radial satellite constellation around their parent Hub node rather than drifting across unrelated clusters.

#### Scenario: Differentiating edge hierarchy
- **WHEN** edges are rendered on the canvas
- **THEN** cross-module dependencies MUST render as prominent, high-contrast highways between Hubs, while internal symbol calls MUST render as subtle, localized intra-cluster links.

### Requirement: Collapsible Hub Progressive Disclosure
The graph visualizer SHALL support collapsible drill-down where Hubs can be expanded or collapsed to reveal or hide their satellite constellations.

#### Scenario: Clicking an architectural Hub
- **WHEN** a user clicks on an architectural Hub or its expansion toggle
- **THEN** its satellite symbols MUST smoothly toggle visibility and position around the Hub.

#### Scenario: Inspecting Hub satellites
- **WHEN** a Hub node is selected and the inspector panel is opened
- **THEN** the inspector MUST list all satellite symbols with their kinds and signatures, and allow direct navigation to any satellite.

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
- **THEN** horizontal guidelines and labels ("Entry Points", "Routing Layer", "Core Services", "AST & Parsing", "Configuration") MUST render across the background at each tier level using understated divider lines and left-anchored badges, without rendering full-width colored background rectangle bands.

#### Scenario: Dual-font typography system
- **WHEN** tier titles, tier descriptions, and toolbar controls are rendered
- **THEN** the system MUST render architectural headers and descriptive labels using clean sans-serif typography (`Hanken Grotesk`) with uppercase letter spacing, while preserving monospaced typography (`JetBrains Mono`) for file names, code symbols, and syntax signatures.
