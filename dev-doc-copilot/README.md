# Dev-Doc Copilot — The Cognee-Powered Knowledge Graph for Developers

A project-scoped developer documentation and code copilot built for the **WeMakeDevs × Cognee Hackathon**.

## What It Does

Ingest multiple documentation sources (URLs, Markdown, PDFs, OpenAPI specs) and code repositories into a single **Cognee knowledge graph**, then query across both with natural language.

Unlike standard RAG, this copilot uses **Cognee's hybrid graph-vector memory** so answers traverse relationships between docs and code, not just similarity-ranked text chunks.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 14 Frontend (React + TypeScript + Framer Motion)│
│  ├─ Chat Interface with source citations               │
│  ├─ Ingestion Panel (drag-and-drop docs + code repos)  │
│  ├─ Knowledge Graph Visualization (interactive SVG)    │
│  └─ Memory Manager (forget / improve)                  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTP REST API
                           ▼
┌─────────────────────────────────────────────────────────┐
│  FastAPI Python Backend                                │
│  ├─ /api/ingest/docs   → cognee.remember()            │
│  ├─ /api/ingest/code  → run_code_graph_pipeline()      │
│  ├─ /api/chat         → cognee.recall()                │
│  ├─ /api/memory/forget → cognee.forget()               │
│  └─ /api/memory/improve → cognee.improve()             │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Cognee SDK
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Cognee Memory Engine (self-hosted or cloud)           │
│  ├─ Vector Store (Qdrant / PGVector / in-memory)       │
│  ├─ Graph Store (Neo4j / NetworkX / in-memory)         │
│  └─ LLM Provider (OpenAI / Azure / Ollama)              │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- `OPENAI_API_KEY` (or other LLM provider)

### Option A: Run Everything Locally

```bash
# 1. Clone a sample repo for CodeGraph testing
git clone https://github.com/topoteretes/cognee-starter.git backend/sample-repo

# 2. Start the backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# 3. In a new terminal, start the frontend
cd frontend
npm install
npm run dev

# 4. Open http://localhost:3000
```

### Option B: Docker (Coming Soon)

```bash
docker-compose up --build
```

## Project Structure

```
dev-doc-copilot/
├── README.md
├── Makefile
├── .gitignore
├── frontend/               # Next.js 14 application (standalone web app)
├── backend/                # FastAPI service
├── vscode-extension/       # VS Code extension (IDE integration)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── extension.ts    # Main extension code
├── scripts/
└── docs/
```

## VS Code Extension

In addition to the web app, a VS Code extension is included that embeds the copilot directly in the IDE:

```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VS Code to test
```

Features:
- Chat panel inside VS Code (WebView)
- Right-click selected code → "Query Copilot about Selection"
- Live graph statistics view
- Uses VS Code theme automatically

## Project Structure



```
dev-doc-copilot/
├── README.md                 # This file
├── Makefile                  # Quick commands
├── frontend/                 # Next.js 14 application
│   ├── app/
│   │   ├── page.tsx          # Main dashboard
│   │   ├── layout.tsx        # Root layout
│   │   ├── globals.css       # Tailwind + custom theme
│   │   └── api/              # Next.js API routes (proxies to backend)
│   ├── components/
│   │   ├── AnimatedBackground.tsx
│   │   ├── Header.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── IngestionPanel.tsx
│   │   ├── KnowledgeGraph.tsx
│   │   └── MemoryManager.tsx
│   ├── lib/
│   │   ├── cognee.ts         # Typed API client
│   │   └── utils.ts          # Tailwind utilities
│   ├── package.json
│   └── tailwind.config.ts
├── backend/                  # FastAPI service
│   ├── main.py               # FastAPI routes
│   ├── cognee_service.py     # Cognee SDK wrapper
│   ├── config.py             # Environment config
│   ├── requirements.txt
│   └── .env.example
├── scripts/                  # Standalone utilities
│   ├── dev_doc_copilot_starter.py   # Pure Python script
│   ├── setup_and_run.sh             # macOS/Linux one-liner
│   └── setup_and_run.bat            # Windows one-liner
└── docs/
    └── HANDBOOK.md           # Hackathon judging guide
```

## Key Features

| Feature | Cognee Operation | User Value |
|---------|-------------------|------------|
| Doc Ingestion | `remember()` | Add docs, URLs, PDFs to a project graph |
| Code Ingestion | `run_code_graph_pipeline()` | Parse Python repos into function/class/call graphs |
| Cross-Source Query | `recall()` with `GRAPH_COMPLETION` | Ask questions that bridge docs and code |
| Raw Context | `only_context=True` | Power users see exact graph nodes retrieved |
| Surgical Forget | `forget()` | Remove outdated sources instantly |
| Self-Improvement | `improve()` | Feedback enriches the graph over time |

## Hackathon Judging Dimensions

- **Problem**: Developers work with fragmented docs and code across siloed sources.
- **Solution**: Cognee-powered unified knowledge graph with project-scoped memory.
- **Impact**: Cuts research time by connecting cross-source relationships automatically.
- **Creativity**: Graph visualization + raw context mode + temporal query routing.
- **Design**: Dark glass-morphism UI with Framer Motion animations.
- **Code Quality**: Modular service layer, typed API client, async-first architecture.
- **Best Use of Cognee**: Uses all four lifecycle operations (`remember`, `recall`, `forget`, `improve`) across both docs and CodeGraph.

## Tech Stack

**Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion, Radix UI, Lucide Icons
**Backend**: FastAPI, Uvicorn, Cognee SDK, Python 3.9+
**AI Memory**: Cognee (hybrid graph-vector engine with knowledge graphs)

## Team

Built for **WeMakeDevs × Cognee "The Hangover Part AI" Hackathon**
