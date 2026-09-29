# Proposal: Fix VS Code Extension Graph Rendering

## Why
When developers switch to the "Graph" tab inside the Dev-Doc VS Code extension WebView, the panel currently dumps raw JSON text inside a `<pre>` tag. This provides poor user experience and fails to deliver on Dev-Doc's core value proposition: visual knowledge graph exploration directly within the developer's editor.

## What Changes
- Replace raw `<pre>` JSON dump in `vscode-extension/src/extension.ts` with an embedded interactive visualization `<iframe>` pointing to the backend's `/api/graph/visualize?project=...` endpoint.
- Adjust the WebView Content Security Policy (CSP) in `getWebviewContent()` to allow frame loading from configured backend endpoints (`frame-src http://localhost:* http://127.0.0.1:* https:;`).
- Add metric counters (nodes and edges badges), empty-state guidance when no nodes are indexed, and an external browser link ("Open in Browser").
- Ensure styling integrates with VS Code theme variables (`--vscode-*`).

## Capabilities

### New Capabilities
- `vscode-graph-visualization`: Render live interactive knowledge graphs in the VS Code extension sidebar WebView.

### Modified Capabilities
<!-- None -->

## Impact
- `devdoc/vscode-extension/src/extension.ts`: Update `getWebviewContent()` CSP and `graphData` command handler.
- Builds: Extension compiles cleanly via `npm run compile`.
