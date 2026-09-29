# vscode-graph-visualization Specification

## Purpose
Enables interactive knowledge graph exploration within the Dev-Doc VS Code extension WebView sidebar.

## Requirements

### Requirement: Interactive Graph Visualization in WebView
The VS Code extension SHALL render an interactive graph visualization within an embedded iframe pointing to the backend visualization endpoint when graph data is requested.

#### Scenario: Switching to Graph Tab with indexed project
- **WHEN** the developer switches to the "Graph" tab and the active project contains indexed graph data
- **THEN** the WebView MUST render an iframe loading `/api/graph/visualize?project=<project>` along with node and edge count metrics.

#### Scenario: Switching to Graph Tab with zero indexed nodes
- **WHEN** the backend returns 0 nodes for the requested project
- **THEN** the WebView MUST render an informative empty state suggesting that the user ingest documentation or code.

### Requirement: Permissive Frame CSP Policy
The WebView Content Security Policy SHALL permit iframe sources from the configured backend URL and local hosts.

#### Scenario: Frame loading under Content Security Policy
- **WHEN** the iframe points to the backend host (localhost, 127.0.0.1, or remote URL)
- **THEN** the WebView MUST NOT block the iframe due to CSP directive violations.
