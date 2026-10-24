# Design: IDE Visualizer Presentation Refinement (Option A Theme & Split Typography)

## Context
See `proposal.md` for motivation. The Layered DAG visualizer (`KnowledgeGraph.tsx`) renders SVG-based card nodes, swimlanes, and highway links. All text elements currently default to `JetBrains Mono, monospace`, and card styles use neon-tinted background fills (`rgba(..., 0.12)`).

## Goals / Non-Goals
**Goals:**
- Implement split typography in SVG rendering and React DOM overlays:
  - Sans-serif (`Hanken Grotesk, var(--font-hanken), system-ui, sans-serif`) for tier titles, tier sublabels, HUD toolbar, metrics badges, and legend category titles.
  - Monospace (`JetBrains Mono, var(--font-jetbrains), monospace`) for file labels, signatures, symbol names, and line numbers.
- Implement JetBrains / VS Code IDE matte theme:
  - Card body fills: `#111622` with `#1e293b` 1px borders, `#334155` on hover.
  - Dedicated syntax glyph pills:
    - `[ƒ]` Functions / Methods: Amber `#f59e0b` / fill `#2d1f0d`
    - `[C]` Classes / Structs: Emerald `#10b981` / fill `#0d2a1d`
    - `[I]` Interfaces / Types: Indigo `#818cf8` / fill `#1a1b3a`
    - `[M]` Modules / CodeFiles: Sky Blue `#38bdf8` / fill `#0e2738`
  - High-clarity resting highway links (`#334155`), with directional arrows and responsive hover highlighting (`#38bdf8` upstream / `#fbbf24` downstream).

**Non-Goals:**
- Modifying topological DAG math, tier assignment, or sub-grid clearance algorithms.
- Changing backend data structures or ingestion logic.

## Decisions
1. **Font Family Selection in D3 SVG Elements**:
   - D3 `.attr("font-family", ...)` will specify `"var(--font-hanken), Hanken Grotesk, system-ui, -apple-system, sans-serif"` for tier titles and headers.
   - For code labels and glyphs, `"var(--font-jetbrains), JetBrains Mono, monospace"` will be used.
   - Rationale: Ensures seamless font rendering across both CSS Tailwind elements and SVG `<text>` elements.

2. **Matte Palette over Tinted Neon**:
   - Standardize all node card rectangles to `#111622` with a subtle inner shadow / crisp border.
   - Use color accents exclusively on the glyph icon badge and type indicator pill.
   - Rationale: Reduces visual fatigue when inspecting dense codebases and gives an authentic IDE look.

3. **Subdued Highway Edge Styling**:
   - Resting highway stroke: `#334155` at 1.5px with 0.65 opacity.
   - Active highway stroke: 2.5px width with full saturation and glowing arrowhead markers.
   - Rationale: Code-graph highways should provide subtle structure without drawing attention away from active call stacks.

## Risks / Trade-offs
- *[Risk: Font loading delay in SVG]*: If custom Google fonts take time to load, SVG text might reflow.
  - *Mitigation*: Fallback fonts `system-ui, sans-serif` and `monospace` have matching metrics.
