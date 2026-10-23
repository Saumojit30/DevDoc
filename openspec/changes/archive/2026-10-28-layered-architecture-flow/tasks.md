# Tasks

## 1. Topological Tier Calculation & Layout Data Model

- [x] 1.1 Implement topological depth and semantic tier calculation algorithm for file nodes in `KnowledgeGraph.tsx`
- [x] 1.2 Structure tier coordinate bands ($Y$-offsets: Tier 0 to Tier 4 + Utility column) and initial horizontal grid balancing

## 2. Physics Simulation, Edge Routing & Sub-Grid Expansion

- [x] 2.1 Configure D3 force simulation with strict vertical tier constraint `d3.forceY().y(d => tierY[d.tier]).strength(0.85)` and horizontal collision avoidance
- [x] 2.2 Implement downward flowing cubic Bézier edge routing `M s.x,s.y C s.x, s.y + 60, t.x, t.y - 60, t.x, t.y` with downward directional markers
- [x] 2.3 Implement hierarchical sub-grid symbol expansion directly beneath parent file cards without obscuring lower tiers
- [x] 2.4 Add background visual tier dividers and semantic layer labels ("Entry Points", "Routing Layer", "Core Services", "AST & Parsing", "Configuration")

## 3. Verification & Validation

- [x] 3.1 Verify frontend compilation with `npm run build` in `devdoc/frontend`
- [x] 3.2 Verify backend test suite with `.\.venv\Scripts\python.exe -m unittest test_codegraph_elevation.py` in `devdoc/backend`
- [x] 3.3 Validate OpenSpec change with `openspec validate "layered-architecture-flow"`
