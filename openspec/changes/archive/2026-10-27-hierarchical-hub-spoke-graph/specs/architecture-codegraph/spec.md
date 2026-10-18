# architecture-codegraph Specification (Delta)

## ADDED Requirements

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
