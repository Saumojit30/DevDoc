# Spec Delta

## MODIFIED Requirements

### Requirement: Professional Monochromatic Palette
The graph visualizer SHALL render nodes and links using a high-contrast dark theme with semantic role accents rather than multi-color neon pastels.

#### Scenario: Rendering node visual elements
- **WHEN** nodes are rendered on the canvas
- **THEN** files and modules MUST display dark slate containers, crisp borders, and monospaced file extension badges without blurry glowing drop shadows or halo filters.

#### Scenario: JetBrains / VS Code IDE Matte Cards and Syntax Glyphs
- **WHEN** file and symbol nodes are rendered on the canvas
- **THEN** node bodies MUST use unified deep matte charcoal backgrounds (`#0f172a` with `#334155` borders) and display dedicated syntax glyph badges (`[ƒ]` for functions, `[C]` for classes, `[I]` for interfaces, `[M]` for modules) with high-contrast foreground accents.

### Requirement: Clean Edge Presentation
The graph canvas SHALL NOT render permanent text labels on edges by default to avoid visual congestion.

#### Scenario: Inspecting link coupling
- **WHEN** the graph renders file-to-file links
- **THEN** links MUST render as clean directional lines or curved paths without static text overlays, and coupling details MUST be accessible via node selection and the inspector panel.

#### Scenario: Focused connection highlighting
- **WHEN** a user hovers over or selects a node
- **THEN** all direct incoming and outgoing links for that node MUST highlight with an accent color (`#38bdf8` or `#60a5fa`), and all non-connected nodes and edges MUST dim to an opacity of 0.15 or lower.

### Requirement: Visual Tier Dividers and Headers
The graph canvas SHALL render subtle horizontal tier dividers and semantic labels indicating each architectural layer.

#### Scenario: Displaying architectural layer dividers
- **WHEN** the layered architecture view is rendered
- **THEN** horizontal guidelines and labels ("Entry Points", "Routing Layer", "Core Services", "AST & Parsing", "Configuration") MUST render across the background at each tier level using understated divider lines and left-anchored badges, without rendering full-width colored background rectangle bands.

#### Scenario: Dual-font typography system
- **WHEN** tier titles, tier descriptions, and toolbar controls are rendered
- **THEN** the system MUST render architectural headers and descriptive labels using clean sans-serif typography (`Hanken Grotesk`) with uppercase letter spacing, while preserving monospaced typography (`JetBrains Mono`) for file names, code symbols, and syntax signatures.
