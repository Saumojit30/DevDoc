# Design: Architecture-First CodeGraph Redesign

## Context
See `proposal.md` for motivation. Currently, `KnowledgeGraph.tsx` renders all nodes returned from `/api/graph/data` as circles with colors mapped through `TYPE_COLORS` (`#06b6d4`, `#10b981`, `#f59e0b`, `#8b5cf6`, `#3b82f6`). Because each function and class is a separate node, even a small 8-file backend generates 112 nodes and 267 edges, producing an unreadable dot cloud.

## Goals / Non-Goals

**Goals:**
- Provide a dual-mode toggle in the header: `[ 🏢 File Architecture ]` vs `[ 🔬 Deep Symbols ]`.
- In **Architecture View**, dynamically aggregate symbols by parent file:
  - Generate a file node for each unique file/module.
  - Collapse all internal symbol relations into file-to-file links (`IMPORTS` and `CROSS_FILE_CALLS`).
  - Calculate `couplingWeight` (count of relations between file A and file B) and render thicker lines for heavy couplings.
- In **Deep Symbols View**, keep full AST details available for granular inspection.
- Update palette:
  - Dark container `#090d16` canvas background with subtle grid dot pattern.
  - File nodes: Rounded dark slate cards (`#151c2c`) with steel borders (`#28354d`), file type badge (`.py`, `.ts`, `.tsx`), and clean monospaced label.
  - Edges: Subtle zinc arrows (`#334155`), glowing on hover.
- Add active path tracing:
  - Upstream dependencies highlighted in `#38bdf8` (sky/cyan).
  - Downstream consumers highlighted in `#fbbf24` (amber).
  - Unconnected nodes dimmed to `0.15` opacity.
- Node details sidebar: Show inbound dependencies, outbound dependencies, and coupling metrics.

**Non-Goals:**
- Modifying backend AST parsing logic (the existing parsed output already includes all needed file, import, and call relations).

## Decisions

### Decision 1: Client-Side Dynamic Graph Aggregation in React
- **Choice:** Compute the Architecture view aggregation in `KnowledgeGraph.tsx` using `useMemo` from the raw graph data.
- **Rationale:** Instant, snappy switching between Architecture View and Deep Symbols View without any network roundtrips.
- **Alternative:** Add a new backend endpoint `/api/graph/architecture`. While possible, client-side transformation allows instant toggling and retains full client-side search across both views.

### Decision 2: SVG Marker & Bezier Link Rendering
- **Choice:** Use directional arrows with SVG marker definitions and curved paths (`path` elements) rather than simple straight lines.
- **Rationale:** Directionality is critical for understanding dependency flow (`A imports B` vs `B imports A`).

## Risks / Trade-offs

- **[Risk]** Files with many mutual connections might have overlapping bidirectional edges.
  → **Mitigation:** Calculate arc curvature offsets for bidirectional pairs so import and export paths don't collide.
