# Tasks

## 1. Remove Visual Clutter & Striped Tier Rectangles

- [x] 1.1 Remove `tierGroup.append("rect")` full-screen colored stripes and replace with subtle horizontal dashed divider guidelines and left-anchored badges, verifying no colored background bands render across the canvas
- [x] 1.2 Strip out glowing drop-shadow SVG filters and CSS blur halos from card definitions, verifying cards have clean 1px solid borders

## 2. Refine Cards, Connectors & Interactive Dimming

- [x] 2.1 Simplify file card styling to dark matte `#0f172a` containers with 1px `#334155` border, neat icon, crisp filename, and clean symbol pill
- [x] 2.2 Slim edge connectors down to 1.2px–1.5px subtle paths (`#475569`) with compact arrowheads, removing static text labels
- [x] 2.3 Implement clean hover and selection focus highlighting (highlight direct incoming/outgoing edges in `#38bdf8`, dimming unrelated nodes and links to 0.15 opacity)

## 3. Build & Integration Verification

- [x] 3.1 Build Next.js frontend with `npm run build` and verify 0 compile errors
- [x] 3.2 Verify live frontend at `http://localhost:3001` renders the clean architecture diagram without visual noise
