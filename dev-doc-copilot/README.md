# Dev-Doc Copilot

Dev-Doc Copilot is a project-scoped documentation and code assistant built around Cognee’s graph memory. It ingests docs, URLs, files, and code repositories into a knowledge graph, then answers questions with source-aware responses that connect documentation to implementation details.

The repository contains three parts:

- a Next.js frontend for chat, ingestion, graph exploration, and memory actions
- a FastAPI backend that wraps the Cognee SDK and exposes REST endpoints
- a VS Code extension that brings the assistant into the editor

## Architecture

Dev-Doc Copilot uses a simple three-layer architecture:

1. The frontend collects user intent through a dashboard, chat UI, ingestion panel, graph view, and memory controls.
2. The backend turns those actions into Cognee operations and normalizes responses for the web app and the VS Code extension.
3. Cognee stores project-scoped knowledge as a graph so future questions can traverse related documentation and code instead of searching isolated text chunks.

### High-level flow

```text
User action
	→ Next.js UI or VS Code WebView
	→ Next.js API route or direct HTTP request
	→ FastAPI backend
	→ Cognee service layer
	→ project knowledge graph + retrieval response
	→ citations, graph data, or memory status back to the UI
```

### Frontend layer

The frontend in `frontend/` is the primary product surface. It is a Next.js app that renders the main dashboard and switches between the major project tabs:

- Dashboard: shows project state and backend health
- Chat: sends questions to the backend and renders answers with citations
- Ingest: uploads files, URLs, and repositories into the current project dataset
- Graph: visualizes the nodes and edges that were ingested
- Memory: exposes forget and improve workflows for project hygiene

The frontend also contains small shared components such as the top navigation, side navigation, toast system, and modal panels for improvement and profile actions.

### API layer

The frontend does not talk to Cognee directly. Instead, it uses Next.js API routes as a thin proxy layer so the browser only needs to know about the web app origin. This keeps the UI simple and lets the backend remain the single source of truth for ingestion, recall, and memory operations.

### Backend layer

The backend in `backend/` is a FastAPI service that owns request validation, file handling, and Cognee calls. It provides endpoints for:

- chat and recall
- document ingestion
- code ingestion
- URL ingestion
- memory actions such as forget, improve, and source listing
- graph metrics and graph inventory data

Each route maps UI intent to a focused service method, which keeps the API predictable and makes it easier to extend the project with more graph operations later.

### Cognee layer

Cognee is the persistence and reasoning layer. It stores each project in its own dataset and links documentation, code, and derived graph entities together. That structure is what allows the assistant to answer questions like “how does this code path relate to the deployment guide?” rather than only returning similar paragraphs.

### VS Code extension layer

The VS Code extension in `vscode-extension/` gives the same backend access inside the editor. It opens a WebView panel, uses the backend API on `localhost:8000`, and lets developers query selected code without leaving VS Code. That makes the extension a second client for the same backend, not a separate knowledge system.

## What it does

- Ingests documentation sources and code into a project-specific dataset
- Answers questions with graph-aware retrieval instead of plain chunk search
- Supports memory actions like forget, improve, and source listing
- Shows a visual knowledge graph and project dashboard in the web app
- Mirrors the workflow in VS Code through a WebView-based extension

## Project layout

```text
dev-doc-copilot/
├── backend/          FastAPI service and Cognee integration
├── frontend/         Next.js app with chat, graph, and ingestion UI
├── vscode-extension/ VS Code extension for IDE integration
├── scripts/          Setup and demo helpers
└── docs/             Supporting project docs
```

## Requirements

- Python 3.9 or newer
- Node.js 18 or newer
- A Cognee-compatible LLM configuration in `.env`

## Environment

The root `.env` file controls the backend runtime. Typical settings include:

- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_ENDPOINT`
- `LLM_API_KEY`
- `EMBEDDING_PROVIDER`
- `EMBEDDING_MODEL`
- `EMBEDDING_DIMENSIONS`
- `SYSTEM_ROOT_DIRECTORY`
- `DATA_ROOT_DIRECTORY`

If you are using a different provider, update those values before starting the backend.

## Quick Start

### Windows

```powershell
cd c:\Users\Jit\Hackathons\Dev-doc
.\start.ps1
```

If you want to run the apps manually instead of the helper script:

```powershell
cd c:\Users\Jit\Hackathons\Dev-doc
python start.py
```

### Manual setup

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the web app at `http://localhost:3000` and the backend at `http://localhost:8000`.

## Main features

- Dashboard with project switching and backend status
- Chat interface for asking project-scoped questions
- Ingestion panel for URLs, files, and code repositories
- Knowledge graph visualization for exploring connected sources
- Memory manager for forgetting and improving sources
- Improve and profile panels for project maintenance
- VS Code extension for in-editor access to the same backend

## Backend API

The FastAPI service exposes endpoints such as:

- `GET /health`
- `POST /api/chat`
- `POST /api/ingest/docs`
- `POST /api/ingest/code`
- `POST /api/ingest/url`
- `POST /api/memory/forget`
- `POST /api/memory/improve`
- `POST /api/memory/sources`
- `POST /api/memory/triplet-embeddings`
- `POST /api/memory/consolidate-entities`
- `POST /api/graph/data`
- `POST /api/graph/inventory`
- `POST /api/graph/metrics`

## VS Code extension

The extension in `vscode-extension/` opens a WebView panel, talks to the FastAPI backend on `localhost:8000`, and adds a context-menu action for querying selected code.

```bash
cd vscode-extension
npm install
npm run compile
```

Then press `F5` in VS Code to launch the Extension Development Host.

## Scripts

- `setup_all.sh` installs backend and frontend dependencies from the project root
- `start.py` runs the sample ingestion and query flow against Cognee
- `scripts/setup_and_run.sh` and `scripts/setup_and_run.bat` automate the starter workflow

## Tech stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Framer Motion, D3, React Markdown
- Backend: FastAPI, Uvicorn, Python, Cognee SDK
- Extension: VS Code Extension API, TypeScript, WebView UI

## Overview

This project was designed to make developer context persistent, searchable, and project-local. Instead of treating docs and code as separate search problems, it links them into one graph so answers can follow relationships across sources.
