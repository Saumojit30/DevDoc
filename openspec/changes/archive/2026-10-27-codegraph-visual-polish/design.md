# Design: CodeGraph Viewport & Visual Clarity Polish

## Architecture & Layout Changes

### 1. Viewport Layout Synchronization
In `KnowledgeGraph.tsx`, the root `<motion.main>` container must match the exact grid geometry of `ChatInterface.tsx`:
```tsx
<motion.main
  className="md:ml-64 mt-16 flex h-[calc(100vh-64px)] overflow-hidden bg-[#090d16] text-on-surface relative"
  ...
>
```
This guarantees:
- Top offset (`mt-16`) clears the fixed 64px `TopNavBar`.
- Left offset (`md:ml-64`) clears the fixed 256px `SideNavBar`.
- Fixed height `h-[calc(100vh-64px)]` forces the canvas to occupy 100% of the visible vertical screen height, completely eliminating the bottom black void.

### 2. Relative Directory Sanitization
Currently, `getDirName(filePath)` leaves raw absolute prefixes like `F:/Portfolio projects/Aisle(langgraph agent)/frontend/src/components/dashboard`.
We update `getDirName(filePath)` to:
- Strip common project root prefixes.
- Keep only the last 1-2 folder segments (e.g., `components/dashboard`).
- Truncate with an ellipsis if longer than 18 characters (e.g., `…/dashboard`).

### 3. Edge De-cluttering
Remove the static `<text>` elements in `linkLabelGroup` from rendering by default.
Instead, keep links clean:
- Lines with stroke width mapped to `Math.max(1.5, Math.min(4, Math.sqrt(d.weight)))`.
- Hovering a node or link activates upstream (cyan) / downstream (amber) styling.
- Exact coupling counts (`7x couplings`) remain prominently featured in the right-side inspector panel under "Dependencies (Imports)" and "Consumers (Imported By)".

### 4. D3 Physics & Force Calibration
- **Link Distance**: Increase from `190` to `240` in Architecture mode to provide comfortable breathing room between interconnected file nodes.
- **Charge Strength**: Increase repulsion from `-480` to `-650` (`distanceMax(900)`).
- **Collision Radius**: Increase from `85` to `115` to match card width (`148px`) and height (`46px`), preventing card overlapping.
- **Center Force**: Use actual container midpoint with smooth alpha decay.
