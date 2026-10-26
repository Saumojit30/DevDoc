# Design: Clean Architecture Canvas

## Context

The current layered DAG implementation in `KnowledgeGraph.tsx` provides accurate 5-tier topological positioning and AST dependency data, but suffers from visual clutter caused by full-width colored background bands, heavy glowing drop-shadows, thick connection lines, and redundant card badges. See `proposal.md` for background.

## Goals / Non-Goals

**Goals:**
- Eliminate background colored stripes completely in favor of subtle horizontal dashed divider guides and clean left-pinned tier labels.
- Eliminate all blurry SVG glow filters and drop-shadow halos from node cards, standardizing on clean, matte `#0f172a` containers with crisp 1px `#334155` borders.
- Slim default link paths to 1.2px–1.5px subtle slate paths (`#475569`), implementing interactive hover/select focus that dims unrelated nodes and edges to 0.15 opacity.
- Simplify card layouts to display only essential information: a neat file glyph, high-contrast file basename (`#f8fafc`), clean directory subtitle (`#94a3b8`), and a quiet symbol count pill.
- Ensure crisp typography using sans-serif for UI labels and monospaced font for code filenames and symbols.

**Non-Goals:**
- Altering the backend AST dependency extraction or NetworkX topological tier computation.
- Changing the 5 architectural tier definitions (Entry Points, Routing, Services, AST/Parsers, Config).

## Decisions

### Decision 1: Remove full-width colored tier rects in favor of minimal horizontal guidelines
- **Choice**: Remove `tierGroup.append("rect")` that drew full-canvas colored stripes. Render only a single subtle horizontal guideline (`stroke: #1e293b`, `stroke-dasharray: 4,4`) and a clean left-anchored tier label.
- **Rationale**: Full-width colored stripes make the canvas look like rainbow bands, causing cognitive overload. A unified dark canvas (`#0b0f17`) with minimal guidelines creates a calm, GitHub/Mermaid-like architecture presentation.
- **Alternatives Considered**: Reducing opacity of the tier rectangles to 0.03. This was tested previously and still produced visible banded stripes across the viewport.

### Decision 2: Eliminate SVG glow filters and drop-shadows
- **Choice**: Delete multi-pass SVG blur/glow filter defs (`drop-shadow(0 0 16px ...)`) and use clean, solid flat borders (`border: 1px solid #334155`).
- **Rationale**: Glow filters cause cards and text to look blurry and fuzzy on standard and high-DPI displays, which makes the UI feel "faded" and "pathetic". Crisp vector edges look sharp, modern, and developer-friendly.

### Decision 3: Thin subtle edges with interactive illumination
- **Choice**: Default edge stroke to 1.2px `#475569` with small arrowheads (`markerWidth: 5, markerHeight: 5`). On hover or selection of a card, highlight its direct incoming and outgoing links with `#38bdf8` (1.8px) and dim non-participating nodes and edges to 0.15 opacity.
- **Rationale**: When 20+ edges cross tiers, thick edges form an unreadable web. Thin lines keep the canvas tranquil, and stateful focus illuminates only the relevant dependency path when needed.

## Risks / Trade-offs

- **[Risk] High-density tiers may have overlapping cards** → **Mitigation**: Maintain horizontal force collision radius and enforce minimum horizontal card spacing of 220px.
- **[Risk] Faint divider lines may be hard to distinguish on poorly calibrated monitors** → **Mitigation**: Use `#334155` with clean left-pinned badges displaying tier index and name with high contrast.
