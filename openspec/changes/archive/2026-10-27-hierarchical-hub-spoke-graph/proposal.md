# Proposal: Hierarchical Hub-and-Spoke & Community Island Architecture

## Why

Developers exploring complex codebases in the Knowledge Graph face visual clutter and loss of spatial context:
1. **Community Hull Overlap ("Messy Illustration")**: Currently, all nodes in the force simulation are drawn towards a single unified canvas center. As a result, Louvain communities and modules overlap in the center, causing community bubble hulls (`d3.polygonHull`) to collide and obscure one another instead of forming distinct architectural islands.
2. **Missing Hub-to-Satellite Hierarchy ("One Big Node to Many Small Ones")**: Symbols (functions, methods, classes) drift freely across the canvas without spatial allegiance to their parent file or module. A developer cannot visually perceive the natural structure of a codebase: a primary Architectural Hub connected to its internal satellite functions and methods.
3. **Flat Edge Congestion**: All edges (cross-file imports, internal method calls, and module relations) are rendered with similar visual weight, creating a tangled hairball where critical inter-module dependencies cannot be distinguished from internal implementation calls.
4. **Lack of Progressive Disclosure**: Showing all symbols simultaneously causes cognitive overload. Users need a high-level architectural view with the ability to click any Hub to smoothly expand and drill down into its satellite constellation.

## What

1. **Community Island Spatial Separation**:
   - Compute distinct, non-overlapping spatial centers for each community (arranged radially around the canvas with multi-focal cluster forces `d3.forceX` and `d3.forceY`).
   - Prevent community convex hulls from colliding, rendering clean, isolated architectural "continents" / "islands" with dedicated hull badges and glow accents.
2. **Hub-and-Spoke Radial Satellites**:
   - For each file/module or community, identify its primary Architectural Hub (CodeFile card / primary God Node).
   - Position internal functions, methods, and symbols in tight radial satellite rings orbiting their parent Hub rather than drifting freely across the canvas.
   - Establish a visual edge hierarchy: prominent inter-module "highways" for cross-file imports and calls vs. subtle, localized "spoke" links for internal satellite symbols.
3. **Progressive Disclosure & Collapsible Drill-Down**:
   - Provide an expandable Hub-and-Spoke view where Hubs display satellite counts and can be expanded or collapsed by clicking the Hub or toggling in the toolbar.
   - When expanded, satellites gracefully orbit their parent Hub.
   - Update the side inspector panel to display the parent Hub, satellite breakdown, and quick drill-down navigation.

## Impact

- **Frontend**: Significant UX elevation in `KnowledgeGraph.tsx` with multi-focal D3 force simulation, radial satellite constraints, hierarchical edge styling, and collapsible hub states.
- **Developer Value**: Transforms the graph from an overwhelming illustration into an intuitive mental model of the codebase: distinct architectural islands containing authoritative hubs and their satellite components.
