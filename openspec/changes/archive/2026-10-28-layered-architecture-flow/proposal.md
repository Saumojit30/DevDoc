# Proposal: Layered Architectural Top-to-Bottom Flow (Hierarchical DAG)

## Why

Developers exploring a codebase often struggle to understand the directional caller-to-callee dependencies and system hierarchy when nodes are scattered radially or organically. A layered architectural top-to-bottom Directed Acyclic Graph (DAG) layout provides immediate mental clarity on architectural tiers (Entry Points -> Routing Controllers -> Core Business Logic & Topology Engines -> Parsers & Symbol Managers -> Configuration & State) and cleanly routes dependencies downward without circular cross-cutting lines.

## What Changes

1. **Topological Layering & Tier Calculation**:
   - Compute automatic layer (rank) calculation for all file/module nodes based on dependency flow (topological depth / longest path from entry points).
   - Establish well-defined tiers:
     - Tier 0: Entry Points & Server Root (`main.py`)
     - Tier 1: HTTP Controllers & Routing (`graph_routes.py`)
     - Tier 2: Core Business Logic & Topology Engines (`cognee_service.py`, `graph_topology.py`)
     - Tier 3: Parsers, Symbol Table, Manifest Manager (`ast_parser.py`, `symbol_table.py`, `manifest_manager.py`)
     - Tier 4: Configuration & State (`config.py`)
     - Side Utility Tier: Dock isolated non-code files (e.g. `README.md`, specs) neatly in an offset utility column.
2. **Structured Tiered Coordinate Positioning & Physics**:
   - Constrain $Y$-coordinates by tier level with clear vertical spacing (180px–220px per tier).
   - Distribute nodes within each tier horizontally with balanced spacing and collision clearance.
   - Configure D3 force simulation with `d3.forceY().y(d => tierY[d.tier]).strength(0.85)` and `d3.forceX().strength(0.4)` with collision avoidance so cards never overlap while maintaining strict vertical hierarchy.
3. **Downward Flowing Bézier Edge Routing**:
   - Route edges with smooth cubic Béziers: `M s.x,s.y C s.x, s.y + 60, t.x, t.y - 60, t.x, t.y` with downward directional arrows indicating data and call flow from callers to callees.
4. **Hierarchical Sub-Grid Symbol Expansion**:
   - When a file card is clicked or expanded, its child symbols/methods expand neatly directly beneath or adjacent to the card in a clean sub-tier without obscuring lower tiers.
5. **Visual Tier Controls & Dividers**:
   - Add visual tier indicators (subtle horizontal dividers and tier row headers: "Entry Points", "Routing Layer", "Core Services", "AST & Parsing", "Configuration").

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `architecture-codegraph`: Adds requirements for topological tier calculation, structured vertical coordinate positioning, downward Bézier edge routing, hierarchical sub-grid symbol expansion, and visual tier dividers.

## Impact

- **Frontend**: `KnowledgeGraph.tsx` updated with DAG topological leveling, tier-based force constraints, cubic Bézier edge paths, sub-grid symbol alignment, and tier divider guides.
- **Backend**: Fully compatible with existing codegraph elevation APIs and tests.
