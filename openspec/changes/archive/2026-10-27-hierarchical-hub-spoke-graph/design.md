# Design: Hierarchical Hub-and-Spoke & Community Island Architecture

## Spatial Separation & Multi-Focal Island Layout

### 1. Multi-Focal Island Forces
In the D3 simulation, rather than pulling all nodes into a single global midpoint `(width/2, height/2)`, we compute dedicated spatial anchor points for each community:
```typescript
interface IslandCenter {
  x: number
  y: number
  radius: number
}

// Compute radial placement for N communities
const communityIds = Array.from(new Set(simNodes.map(n => n.community_id ?? 0))).sort()
const N = communityIds.length
const islandRadius = Math.max(340, Math.min(width, height) * 0.42)

const communityCenters = new Map<number, IslandCenter>()
communityIds.forEach((cId, idx) => {
  if (N === 1) {
    communityCenters.set(cId, { x: width / 2, y: height / 2, radius: 180 })
  } else {
    const angle = (2 * Math.PI * idx) / N - Math.PI / 2
    communityCenters.set(cId, {
      x: width / 2 + islandRadius * Math.cos(angle),
      y: height / 2 + islandRadius * Math.sin(angle),
      radius: 180
    })
  }
})
```
Forces applied:
- `d3.forceX((d) => communityCenters.get(d.community_id)?.x ?? width / 2).strength(0.35)`
- `d3.forceY((d) => communityCenters.get(d.community_id)?.y ?? height / 2).strength(0.35)`
- Custom inter-island separation collision force that keeps community convex hulls mutually disjoint.

### 2. Hub-and-Spoke Radial Constellations ("One Big Node to Many Small Ones")
Every file/module or community is structured hierarchically:
- **Primary Architectural Hub (Big Node)**: Represents the CodeFile / Class / God Node. Styled as a prominent card or large central core with glowing badge and label.
- **Radial Satellites (Small Nodes)**: Internal methods, functions, and symbols orbit their parent Hub.
- **Spoke Links**: Soft, translucent dashed connectors (`PALETTE.links.spoke`, `stroke-dasharray: 2, 3`, `width: 1.2`) anchoring satellites to their Hub.
- **Highway Links**: Bold inter-hub coupling edges representing cross-module imports and calls (`width: 2.5 - 5px`, vibrant palette).

### 3. Radial Satellite Orbiting Force
To maintain a clean circular/elliptical satellite ring around each parent Hub:
- Spoke links have short target distance: `distance: 65 - 85px` and strong link tension: `strength: 0.85`.
- Satellites have angle distribution `\theta_i = (2\pi \cdot i) / K` around their parent Hub during initialization and simulation tick, preventing tangential drifting.

### 4. Progressive Disclosure & Collapsible Drill-Down
- **Collapsible State**: `expandedHubs: Set<string>` tracks which Hubs have their satellites revealed.
- In "Architecture" mode: Clicking a file card or its expansion badge smoothly reveals/hides its satellite constellation.
- In "Satellites" / "Constellation" mode: All hubs reveal their orbiting satellites, or users can collapse specific crowded hubs.
- Inspector Panel displays the Hub's satellites list, with click-to-focus and direct jump.
