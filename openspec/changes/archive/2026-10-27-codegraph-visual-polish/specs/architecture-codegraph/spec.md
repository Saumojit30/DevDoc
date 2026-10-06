# architecture-codegraph Specification (Delta)

## ADDED Requirements

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
