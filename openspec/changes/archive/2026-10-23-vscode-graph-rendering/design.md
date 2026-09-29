# Design: VS Code Extension Graph Rendering

## Context
See `proposal.md` for motivation. In `devdoc/vscode-extension/src/extension.ts`, `case 'graphData':` currently formats raw JSON with `JSON.stringify(message.data, null, 2)` inside `<pre>`. The backend already exposes `GET /api/graph/visualize?project={project}` which serves an interactive Cognee-generated D3 visualization.

## Goals / Non-Goals

**Goals:**
- Update `extension.ts` to embed an iframe pointing to `${backendUrl}/api/graph/visualize?project=${project}`.
- Update WebView Content Security Policy (CSP) in `getWebviewContent()` to include `frame-src 'self' http://localhost:* http://127.0.0.1:* https:;`.
- Add visual indicators: metrics badge (`N nodes, M edges`), responsive container styling, and an external link to open full screen in a browser.
- Display a clean empty state if graph metrics indicate zero nodes.

**Non-Goals:**
- Rewriting backend visualization endpoints.
- Re-architecting the extension state management or protocol.

## Decisions

### Decision 1: Iframe vs Custom D3 Canvas in VS Code WebView
- **Choice:** Embed an iframe referencing `/api/graph/visualize?project=${project}` served by DevDoc backend.
- **Rationale:** Leverages existing Cognee graph visualization endpoint without duplicating heavy D3 bundle dependencies inside the extension bundle.
- **Alternative:** Bundle D3 and render nodes directly in the extension WebView. This would increase extension bundle size and require synchronizing layout algorithms between web frontend and VS Code extension.

### Decision 2: CSP Directives
- **Choice:** Add `frame-src 'self' http://localhost:* http://127.0.0.1:* https:;` and ensure `connect-src` supports backend hosts.
- **Rationale:** Strict VS Code WebViews disallow unlisted iframe sources by default.

## Risks / Trade-offs

- **[Risk]** Backend server not running when graph tab opened.
  → **Mitigation:** Catch connection errors and display a friendly connection warning with retry prompt in the WebView.
