# Design: Layered Architectural Top-to-Bottom Flow (Hierarchical DAG)

## Context

See `proposal.md` for motivation. Currently, the graph visualization renders nodes either organically or radially around island centers. To clearly communicate the architecture and call flow of the codebase, a layered Directed Acyclic Graph (DAG) layout is implemented, organizing files into vertical hierarchical tiers with downward flowing Bézier curves.

## Goals / Non-Goals

**Goals:**
- Implement topological depth and tier rank calculation for file nodes based on caller-to-callee dependencies.
- Enforce vertical tier coordinate bands ($Y$-coordinates) spaced 180px–220px apart with `d3.forceY().strength(0.85)`.
- Distribute nodes horizontally within each tier with collision clearance and initial slot balancing.
- Route dependency links using smooth vertical cubic Bézier curves (`M s.x,s.y C s.x, s.y + 60, t.x, t.y - 60, t.x, t.y`) with downward arrows.
- Position expanded child symbols in a clean sub-tier grid directly under the parent file card.
- Render background architectural tier divider lines and header labels.

**Non-Goals:**
- Modifying backend AST extraction or graph serialization APIs.
- Replacing the collapsible side symbol inspector or global zoom/pan controls.

## Decisions

### 1. Hybrid Topological and Semantic Tier Calculation
- **Choice**: Combine topological depth from entry points with semantic module role heuristics.
- **Rationale**: Real-world codebases often contain cyclic imports or external leaf modules that could distort pure topological sort. By combining topological longest-path depth from root files (`main.py`, `app.py`) with semantic naming patterns (`routes` -> Tier 1, `service` / `topology` -> Tier 2, `parser` / `manifest` -> Tier 3, `config` -> Tier 4), the system guarantees predictable, clean architecture layers.
- **Alternatives Considered**: Pure topological sort (fails on import cycles); static manual mapping (fails to generalize to new user repositories).

### 2. Vertical Tier Physics with Horizontal Freedom
- **Choice**: Use high-strength vertical forces (`d3.forceY` at strength 0.85) combined with horizontal repulsion and collision forces (`d3.forceCollide`).
- **Rationale**: Keeps cards strictly in their architectural tier while allowing natural horizontal spacing to minimize link crossings.

### 3. Downward Flowing Cubic Béziers
- **Choice**: Cubic Bézier curves with vertical control tangents:
  `M s.x,s.y C s.x, s.y + 60, t.x, t.y - 60, t.x, t.y`
- **Rationale**: Creates an elegant "waterfall" / circuit-board flow where edges exit the bottom of caller cards and enter the top of callee cards without cluttering the center.

### 4. Sub-Grid Symbol Expansion
- **Choice**: Display child symbols in a compact horizontal sub-tier directly beneath the parent file card ($Y + 54$ to $Y + 90$).
- **Rationale**: Keeps satellites neatly organized under their owning component without sprawling across other architectural layers.

## Risks / Trade-offs

- **[Tightly packed tiers with many files]** → *Mitigation*: Dynamically compute horizontal tier bandwidth and apply robust collision radius (`CARD_W / 2 + 20`).
- **[Long-range cross-tier links]** → *Mitigation*: Cubic Bézier tangents preserve curve elegance even across multiple vertical tier jumps.
