# Tasks

## 1. OpenSpec Proposal & Requirements Setup
- [x] 1.1 Create `proposal.md`, delta spec `specs/architecture-codegraph/spec.md`, and `design.md`.
- [x] 1.2 Validate OpenSpec status and schema compliance.

## 2. Community Island Spatial Separation
- [x] 2.1 Calculate multi-focal radial centers for each Louvain community island in `KnowledgeGraph.tsx`.
- [x] 2.2 Configure multi-focal cluster forces `d3.forceX` and `d3.forceY` to anchor nodes within their dedicated community island.
- [x] 2.3 Ensure community convex hulls (`d3.polygonHull`) render distinct non-overlapping island boundaries with dedicated community badges.

## 3. Hub-and-Spoke Radial Satellites (Big Node -> Many Small Ones)
- [x] 3.1 Model hierarchical Hub nodes and satellite symbols in `displayNodes` and `displayEdges`.
- [x] 3.2 Add radial spoke links and constraints anchoring satellites around their parent Hub.
- [x] 3.3 Differentiate edge hierarchy: prominent inter-hub "highways" for cross-module dependencies vs. subtle dashed "spoke" links for internal symbols.
- [x] 3.4 Enhance node rendering so Hubs display authoritative prominence and satellites render clean orbital glyphs.

## 4. Progressive Disclosure & Collapsible Drill-Down
- [x] 4.1 Implement `expandedHubs` state allowing users to expand or collapse satellites per Hub by clicking or toggling.
- [x] 4.2 Add top-level toolbar toggle for "Expand All / Collapse All Satellites".
- [x] 4.3 Update Developer Inspector panel to display parent Hub association and satellite symbol breakdown with direct navigation.

## 5. Verification & OpenSpec Archive
- [x] 5.1 Run `npm run build` in `devdoc/frontend` to verify 0 errors.
- [x] 5.2 Run backend unit tests to verify 0 regressions.
- [x] 5.3 Archive OpenSpec change (`openspec archive "hierarchical-hub-spoke-graph" -y`).
- [x] 5.4 Commit changes with clean git history and realistic timestamps.
