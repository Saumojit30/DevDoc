# Tasks

## 1. WebView CSP and Layout Update

- [x] 1.1 Update Content Security Policy (CSP) in `devdoc/vscode-extension/src/extension.ts` to allow `frame-src` for local and HTTPS backend hosts. Verify CSP header contains valid `frame-src`.
- [x] 1.2 Update HTML styling for `.graph-view` and `#graph-visualization` in `extension.ts` to support full-height responsive iframe display. Verify CSS layout rules exist in the WebView HTML.

## 2. Interactive Graph Rendering Implementation

- [x] 2.1 Replace raw JSON stringification in `case 'graphData'` with interactive iframe embedding, metrics badges, and external browser link. Verify code replaces `<pre>` with iframe elements.
- [x] 2.2 Compile extension with `npm run compile` in `devdoc/vscode-extension/` and verify TypeScript compiles to `out/extension.js` without errors.
