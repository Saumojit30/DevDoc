# Spec Delta: architecture-codegraph

## MODIFIED Requirements

### Requirement: Professional Monochromatic Palette
The graph visualizer SHALL render nodes and links using a high-contrast dark theme with semantic role accents rather than multi-color neon pastels.

#### Scenario: Rendering node visual elements
- **WHEN** nodes are rendered on the canvas
- **THEN** files and modules MUST display dark slate containers, crisp borders, and monospaced file extension badges.

#### Scenario: JetBrains / VS Code IDE Matte Cards and Syntax Glyphs
- **WHEN** file and symbol nodes are rendered on the canvas
- **THEN** node bodies MUST use unified deep matte charcoal backgrounds (`#111622` with `#1e293b` borders) and display dedicated syntax glyph badges (`[ƒ]` for functions, `[C]` for classes, `[I]` for interfaces, `[M]` for modules) with high-contrast foreground accents.

### Requirement: Visual Tier Dividers and Headers
The graph canvas SHALL render subtle horizontal tier dividers and semantic labels indicating each architectural layer.

#### Scenario: Displaying architectural layer dividers
- **WHEN** the layered architecture view is rendered
- **THEN** horizontal guidelines and labels ("Entry Points", "Routing Layer", "Core Services", "AST & Parsing", "Configuration") MUST render across the background at each tier level.

#### Scenario: Dual-font typography system
- **WHEN** tier titles, tier descriptions, and toolbar controls are rendered
- **THEN** the system MUST render architectural headers and descriptive labels using clean sans-serif typography (`Hanken Grotesk`) with uppercase letter spacing, while preserving monospaced typography (`JetBrains Mono`) for file names, code symbols, and syntax signatures.
