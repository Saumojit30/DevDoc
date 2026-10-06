# Proposal: CodeGraph Viewport & Visual Clarity Polish

## Why

The recent Architecture CodeGraph visualization suffers from critical viewport and clutter issues when rendered in the browser:
1. **Viewport Height Collapse**: The main `<motion.main>` container in `KnowledgeGraph.tsx` does not declare `md:ml-64 mt-16 h-[calc(100vh-64px)]`. In Next.js, this causes `flex-1` to collapse to an arbitrary ~350px height, rendering a massive empty black void across the bottom half of the screen while pushing nodes against the top edge.
2. **Absolute Path Card Overflow**: Node cards render full 70-character absolute OS paths (e.g., `F:/Portfolio projects/Aisle(langgraph agent)/frontend/...`) as the module subtitle, blowing out card boundaries and causing adjacent cards to collide.
3. **Link Label Hairball**: Permanent text labels (e.g., `7.2x IMPORTS / CALLS`) are rendered on every single edge, overlapping into an unreadable mass of text.
4. **Weak Simulation Repulsion**: The force simulation's link distance (190px) and collision radius (85px) are insufficient for wide cards, causing cards to clump on top of each other.

## What

1. **Full-Viewport Container Layout**:
   - Update `KnowledgeGraph.tsx` main container to `md:ml-64 mt-16 flex h-[calc(100vh-64px)] overflow-hidden`.
   - Ensure D3 ResizeObserver correctly sizes SVG to full available viewport dimensions on mount.
2. **Concise Directory & File Sanitization**:
   - Truncate long module paths to concise relative segments (e.g., `components/dashboard` or last 2 directories, max 18 chars).
   - Ensure card labels and badges remain strictly within card boundaries.
3. **Clean Edge Aesthetics**:
   - Hide permanent edge text labels on the canvas to eliminate visual clutter.
   - Show edge coupling metrics on link hover or in the dedicated side inspector panel.
4. **Calibrated Physics & Centering**:
   - Increase link distance (240px), charge repulsion (-650), and collision radius (115px) so architecture cards breathe naturally without overlapping.
   - Position the bottom floating control bar cleanly above the bottom edge without masking nodes.

## Impact

- **Frontend**: `KnowledgeGraph.tsx` full-screen immersion matching `ChatInterface.tsx` and `Dashboard.tsx`.
- **User Experience**: Architecture view becomes instantly legible, professional, and presentation-ready without visual overlapping or cut-offs.
