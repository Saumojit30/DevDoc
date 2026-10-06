# Tasks

## 1. Viewport Geometry & Layout Fix

- [x] 1.1 Update `KnowledgeGraph.tsx` root container to include `md:ml-64 mt-16 flex h-[calc(100vh-64px)] overflow-hidden` to match the application navigation layout and eliminate the bottom black void.
- [x] 1.2 Verify `ResizeObserver` initializes `dimensions` to the full viewport height.

## 2. Card Label Sanitization & Text Truncation

- [x] 2.1 Update `getDirName` helper in `KnowledgeGraph.tsx` to strip absolute filesystem paths and extract concise trailing directory segments (e.g. `components/dashboard`, max 18 chars).
- [x] 2.2 Verify node card titles and subtitles remain strictly within the rectangular card boundary.

## 3. Edge De-cluttering & Physics Calibration

- [x] 3.1 Remove static edge label text rendering from the canvas to eliminate the "hairball" text clutter, preserving coupling metrics in the right inspector panel.
- [x] 3.2 Adjust D3 simulation parameters: link distance to 240, repulsion charge to -650, and collision radius to 115 to prevent card overlapping.
- [x] 3.3 Test production build with `npm run build` in `devdoc/frontend` to verify zero errors.
