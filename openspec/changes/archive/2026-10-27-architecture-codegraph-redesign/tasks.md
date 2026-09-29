# Tasks

## 1. Palette & Dark Theme Modernization

- [x] 1.1 Update `KnowledgeGraph.tsx` color mapping and typography to a professional dark theme (Linear/Raycast palette with slate, zinc, and role-based subtle accents) replacing neon rainbow colors. Verify color definitions compile without errors.
- [x] 1.2 Implement directional arrow markers and styled SVG edges with hover glow effects. Verify SVG marker definitions are rendered in the SVG defs.

## 2. Architecture View & Dynamic Aggregation

- [x] 2.1 Implement Architecture View aggregation logic in `KnowledgeGraph.tsx` to group symbols by parent file and compute aggregate file-to-file dependency links and coupling weights. Verify aggregation produces a concise file-level node/link dataset.
- [x] 2.2 Add view mode toggle button in `KnowledgeGraph.tsx` header (`[ 🏢 File Architecture ]` / `[ 🔬 Deep Symbols ]`) with smooth simulation transition. Verify toggling updates graph view mode.

## 3. Dependency Path Highlighting & Inspector

- [x] 3.1 Implement upstream (imported by selected) and downstream (imports selected) dependency path highlighting with node dimming on selection or hover. Verify connected paths highlight while unconnected nodes dim.
- [x] 3.2 Update node details inspector panel to display file-level dependency breakdown (Imports, Imported By, Coupling degree). Verify inspector displays dependency sections.
- [x] 3.3 Verify frontend production build with `npm run build` in `devdoc/frontend`. Ensure zero TypeScript and build errors.
