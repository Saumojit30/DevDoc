# Proposal: IDE Visualizer Presentation Refinement (Option A Theme & Split Typography)

## Why
While Option B's topological DAG architecture cleanly organizes codebases into hierarchical swimlanes, the visual presentation layer currently suffers from font flattening (using monospace everywhere, including long descriptions and tier headers) and excessive neon color saturation across card bodies. Adopting a JetBrains / VS Code IDE aesthetic with split typography improves readability, decreases visual fatigue, and provides a sleek, developer-grade UI/UX.

## What Changes
- **Split Typography System**:
  - Use `Hanken Grotesk` (sans-serif) for architectural meta-layers: tier titles, layer descriptions, toolbar buttons, filter dropdowns, and search controls with crisp uppercase letter spacing.
  - Retain `JetBrains Mono` exclusively for code-level entities: file paths, symbol identifiers, method signatures, call count badges, and line numbers.
- **JetBrains / VS Code Matte Palette**:
  - Replace candy-tinted node backgrounds with a unified deep matte slate (`#111622` body fill, `#1e293b` border, `#334155` hover border).
  - Introduce syntax accent glyph pills for symbol types:
    - `[ƒ]` Functions & Methods: Syntax Amber (`#f59e0b` on `#2d1f0d`)
    - `[C]` Classes & Structs: Syntax Emerald (`#10b981` on `#0d2a1d`)
    - `[I]` Interfaces & Types: Syntax Indigo (`#818cf8` on `#1a1b3a`)
    - `[M]` Modules & Code Files: Syntax Sky Blue (`#38bdf8` on `#0e2738`)
  - Subdue resting highway links to clean structural slate (`#334155`), lighting up with vibrant upstream/downstream accents on hover or selection.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `architecture-codegraph`: Refine visual styling requirements for professional palette and dual-font typography in the code graph visualizer.

## Impact
- Frontend: `devdoc/frontend/components/KnowledgeGraph.tsx`
- No backend API or data structure changes.
