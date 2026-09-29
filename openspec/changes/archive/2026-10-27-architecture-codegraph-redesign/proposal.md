# Proposal: Architecture-First CodeGraph Redesign

## Why
The current D3 knowledge graph renders all symbols (classes, functions, methods, and files) simultaneously as identical circular nodes using a high-saturation rainbow neon palette ("AI slop"). This creates a cluttered "dot soup" that obscures codebase architecture rather than illuminating it. Developers and engineering leads need to see high-level architectural connectivity—specifically how modules, packages, and files depend on and interact with one another—with a sleek, professional developer-grade aesthetic inspired by Linear and GitHub dependency graphs.

## What Changes
- Introduce a dual-view mode toggle in `KnowledgeGraph.tsx`:
  - **Architecture View (Default)**: Aggregates granular symbol nodes into clean file and module nodes with weighted coupling links representing imports and cross-file calls.
  - **Deep Symbols View**: Detailed AST inspection view exposing granular classes, methods, and functions.
- Replace neon rainbow color styling (`TYPE_COLORS`) with a refined, high-contrast dark theme (slate, deep indigo, ice-blue, and zinc borders).
- Add directional dependency path highlighting: clicking or hovering on a node dims unrelated elements and highlights upstream dependencies in electric cyan and downstream consumers in warm amber.
- Enhance the node inspector sidebar to clearly display module groupings, incoming/outgoing file dependencies, and coupling metrics.

## Capabilities

### New Capabilities
- `architecture-codegraph`: Architecture-first dependency graph visualization featuring module/file aggregation, developer-grade dark styling, and upstream/downstream dependency path exploration.

### Modified Capabilities
<!-- None -->

## Impact
- `devdoc/frontend/components/KnowledgeGraph.tsx`: Update D3 layout, simulation physics, node rendering, palette definitions, and inspector details.
- Frontend Build: Must compile cleanly via `npm run build`.
