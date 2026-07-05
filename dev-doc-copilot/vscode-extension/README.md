# Dev-Doc Copilot — VS Code Extension

## What This Is

A VS Code extension that embeds the Dev-Doc Copilot directly inside your IDE.

## How It Works

1. The extension creates a **WebView panel** inside VS Code (a sandboxed iframe in the editor)
2. The WebView renders a chat interface + graph visualization using HTML/CSS/JS
3. The WebView communicates with the extension via `postMessage`
4. The extension makes HTTP requests to your FastAPI backend at `localhost:8000`
5. The backend queries the Cognee knowledge graph and returns answers

## Installation

```bash
cd vscode-extension
npm install
npm run compile
```

Then press F5 in VS Code to open the Extension Development Host.

## Usage

1. Start your FastAPI backend (`uvicorn main:app`)
2. Open VS Code with the extension installed
3. Press `Ctrl+Shift+P` → "Dev-Doc Copilot: Open"
4. A new panel opens in the editor with the chat interface
5. Select code in the editor → right-click → "Query Copilot about Selection"

## Architecture

```
VS Code Editor
├── WebView Panel (iframe)
│   ├── Chat UI (HTML/CSS/JS)
│   └── Graph View (HTML/CSS/JS)
│
└── Extension Host (Node.js)
    └── HTTP Client → localhost:8000
        └── FastAPI Backend
            └── Cognee SDK
```

## Features

- **Chat**: Ask questions about your docs and code
- **Graph**: View the live knowledge graph statistics
- **Context Menu**: Right-click selected code to query the copilot
- **Theme-aware**: Uses VS Code's color theme automatically
