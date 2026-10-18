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
- **THEN** files and modules MUST display dark slate containers, crisp borders, and monospaced file extension badges.

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
