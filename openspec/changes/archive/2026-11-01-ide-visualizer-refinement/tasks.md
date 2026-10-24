# Tasks

## 1. Palette & Typography Token Refinement

- [x] 1.1 Update `PALETTE` and role styling in `KnowledgeGraph.tsx` to JetBrains/VS Code matte slate bodies (`#111622`) and syntax glyph badge fills and borders. Verify token definitions compile with TypeScript.
- [x] 1.2 Update SVG typography bindings in `KnowledgeGraph.tsx` to apply `Hanken Grotesk, sans-serif` for tier titles, tier guidelines, and descriptions, while retaining `JetBrains Mono, monospace` for code symbols and signatures.

## 2. Card & Edge Presentation Polish

- [x] 2.1 Refactor file card and sub-grid satellite SVG rendering in `KnowledgeGraph.tsx` to use matte background cards, subtle borders, syntax glyph badges (`[ƒ]`, `[C]`, `[I]`, `[M]`), and clean typography hierarchy.
- [x] 2.2 Refine highway link curves and arrowhead markers in `KnowledgeGraph.tsx` to use structural slate resting strokes (`#334155`) with high-visibility reactive glow on hover/active.

## 3. Build & Visual Verification

- [x] 3.1 Run frontend build (`npm run build`) in `devdoc/frontend` and verify Turbopack compiles with zero TypeScript errors.
- [x] 3.2 Restart frontend server on port 3001, verify `http://localhost:3001` responds with 200 OK, and inspect the rendered visualizer.
