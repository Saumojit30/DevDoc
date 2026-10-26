# Proposal: Clean Architecture Canvas

## Why

The recent visual styling of the code graph visualizer introduced excessive decorative elements—specifically full-width multi-colored background tier stripes, heavy multi-layered neon glow shadows, thick link connectors, and crowded multi-badge node headers. These elements caused extreme visual clutter ("nightmare" / visual fatigue) rather than aiding codebase comprehension. Developers need a clean, minimalist, and legible architectural diagram (in the vein of GitHub dependency views, Mermaid.js, and Linear) that makes the code organization immediately understandable at a glance.

## What Changes

- **Eliminate Full-Width Tier Stripes**: Remove the large colored rectangle bands across the canvas background. Replace them with subtle, low-contrast horizontal divider guides and clean, pinned tier titles on the left (`Tier 0 · Entry Points`, `Tier 1 · Routing & APIs`, etc.).
- **Minimalist Matte Node Cards**: Strip out blurry `drop-shadow` neon halos. Render file cards with a clean dark slate surface (`#0f172a`), crisp 1px borders (`#334155`), a subtle 3px tier accent notch, and legible typography (`#f8fafc` text, `#94a3b8` directory subtitle).
- **Refined Link Geometry & Interaction**: Reduce default link stroke width to 1.2px–1.5px with subtle slate colors (`#475569`). On hover or selection of any node, highlight its direct upstream and downstream connections while gracefully dimming unrelated nodes and edges to 0.15 opacity.
- **Decluttered Card Badges**: Remove stacked redundant pills. Display a simple file icon glyph, concise file basename, and a quiet symbol count badge.
- **Sub-Grid Satellite Simplification**: Keep expanded symbol nodes compact, orderly, and calm without intrusive glows or oversized capsules.

## Capabilities

### Modified Capabilities
- `architecture-codegraph`: Update the visual presentation requirements to mandate a clean, minimalist, glow-free developer architecture diagram with subtle tier dividers and high-legibility cards.

## Impact

- Frontend: `devdoc/frontend/components/KnowledgeGraph.tsx`
- No backend API or data structure changes are required; the underlying topological DAG and AST extraction remain 100% intact.
