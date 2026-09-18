<div align="center">

# 🧠 DevDoc

### *The Graph-Aware Developer Assistant & Codebase Knowledge Engine*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js 16](https://img.shields.io/badge/Next.js%2016-App%20Router-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Cognee](https://img.shields.io/badge/Cognee-Knowledge%20Graph-7C3AED?style=for-the-badge)](https://cognee.ai)
[![D3.js](https://img.shields.io/badge/D3.js-Force%20Simulation-F9A03C?style=for-the-badge&logo=d3.js&logoColor=white)](https://d3js.org)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension%20Ready-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <strong>Unify documentation, architectural specs, and codebase AST hierarchies into a queryable Knowledge Graph.</strong>
  <br />
  Featuring source-attributed technical Q&A, real-time D3 force-directed topological exploration, surgical memory pruning, and native dual-client interfaces.
</p>

[Explore Architecture](#-system-architecture) •
[Why Graph RAG?](#-why-devdoc-graph-rag-vs-naive-vector-rag) •
[Key Features](#-core-capabilities) •
[Quick Start](#-quick-start) •
[API Reference](#-backend-api-reference) •
[Design System](docs/FRONTEND_DESIGN_SPEC.md)

---

</div>

## 📌 Executive Summary

Modern AI coding assistants (such as Cursor or GitHub Copilot) rely primarily on **Naive Chunk-based Vector RAG** or ephemeral workspace window buffers. When projects grow across hundreds of files, deep inheritance trees, and external documentation (PDFs, API specifications, and architectural wikis), flat vector chunking loses execution semantics and multi-hop dependencies.

**DevDoc** solves this by constructing a **deterministic Abstract Syntax Tree (AST) Knowledge Graph** paired with **Cognee Graph Memory**. It ingests heterogeneous documents (PDFs, Markdown, Web URLs) alongside source code repositories into a unified topological memory model—surfacing exact caller/callee paths, cross-domain documentation citations, and persistent multi-project knowledge across both a modern Next.js web dashboard and a native VS Code extension.

---

## 💡 Why DevDoc? (Graph RAG vs. Naive Vector RAG)

| Dimension | GitHub Copilot / Cursor | DevDoc Knowledge Engine |
| :--- | :--- | :--- |
| **Primary Data Source** | Active editor buffers, open tabs, and local workspace code files. | **Unified Heterogeneous Graph:** Combines external web docs, PDFs, API specs, and AST code trees into one memory model. |
| **Indexing Method** | **Vector Chunking (Naive RAG)** or Merkle-tree file hashing. Breaks code into arbitrary text chunks by line counts. | **Deterministic AST Knowledge Graph:** Parses code into semantic nodes (`Class`, `Function`, `Import`, `Caller`) with topological relationship edges. |
| **Cross-Doc Linking** | Weak / Ephemeral. Requires manual `@Web` lookups or pasting URLs into chat per prompt. | **Permanent Semantic Linking:** Mentions of functions/APIs in `.pdf` guides or `.md` specs are explicitly linked to physical AST nodes. |
| **Data Scope & Scope Isolation** | Scoped strictly to the currently open workspace window. | **Multi-Project Dataset Scoping:** Persistent, project-isolated knowledge base that survives across sessions, environments, and team members. |
| **Auditability & Explainability** | Black-box retrieval (cannot inspect *why* a chunk was retrieved). | **Interactive D3 Force Visualizer:** Real-time force-directed topology inspection showing exact graph traversal paths and node metrics. |
| **Memory Lifecycle** | Ephemeral context window; no pruning mechanism for outdated docs. | **Active Memory Management:** Built-in `forget` and `improve` APIs to prune stale knowledge and calibrate retrieval with reinforcement feedback. |

### The Core Architectural Problem DevDoc Solves

```
[ Traditional Naive RAG ]
Source Code / Docs ───> Arbitrary 500-token chunks ───> Vector DB ───> Flat Cosine Search
❌ Loses caller/callee execution chains
❌ Fails multi-hop reasoning (e.g., "Where is the auth handler used across all microservices?")
❌ Disconnects external architectural PDFs from actual implementations

[ DevDoc Graph RAG ]
Source Code ───> AST Parser ───┐
PDFs / Specs ──> Doc Parser ───┼───> Cognee Knowledge Graph ───> Topological Graph Retrieval
Web URLs ──────> HTML Scraper ──┘     (Classes, Functions, Calls, Docs)    + Exact Line Attributions
```

---

## 🏛️ System Architecture

DevDoc is engineered as a decoupled, client-agnostic monorepo with clean separation of concerns:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT SURFACES                                  │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│    Next.js 16 Web Dashboard            │       VS Code Native Extension          │
│    • Glassmorphic SPA (Tailwind + Framer)│       • WebView Chat & Quick Query      │
│    • D3 Force-Directed Graph Explorer  │       • Right-Click AST Context Action  │
│    • Ingestion Dropper & Memory Studio │       • Localhost Backend Bridge        │
└───────────────────┬────────────────────┴────────────────────┬────────────────────┘
                    │                                         │
                    ▼                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI BACKEND CORE (:8000)                             │
├──────────────────────────────────────────────────────────────────────────────────┤
│  • REST API Gateway & Next.js Proxy Forwarder (`/app/api/[...proxy]`)            │
│  • Ingestion Pipelines (File Multipart, URL Scraper, Git Clone Dispatcher)       │
│  • AST CodeGraph Engine (Deterministic Symbol Extraction & Call Hierarchy)       │
│  • Memory Controller (`/forget`, `/improve`, `/consolidate-entities`)           │
│  • Graph Export Engine (Formatted D3 Node/Edge Topology Serializer)              │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE & PERSISTENCE LAYER                             │
├──────────────────────────────────────────────────────────────────────────────────┤
│  • Cognee Graph Memory Engine (Dataset Isolation per Project Scope)              │
│  • Vector Embeddings & Relational Graph Store                                    │
│  • Local File Storage & Code Cache (`uploads/`, `system_root/`)                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Core Capabilities

### 🌳 1. Deterministic AST Code Graph Generation
Instead of slicing code into arbitrary character windows, DevDoc executes an Abstract Syntax Tree (AST) parsing pipeline. It extracts explicit topological relationships:
- `(FunctionA)-[:CALLS]->(FunctionB)`
- `(Class)-[:IMPLEMENTS]->(Interface)`
- `(EndpointRoute)-[:DEPENDS_ON]->(ServiceModule)`

### 📄 2. Heterogeneous Multi-Source Ingestion
Feed your project knowledge from diverse assets simultaneously:
- **Architecture Documentation:** Ingest `.pdf`, `.md`, `.txt`, `.docx`, and `.json` files via drag-and-drop.
- **Remote Web Documentation:** Crawl online API references, framework documentation, or wiki URLs.
- **Source Code Repositories:** Point DevDoc to a local filesystem folder or a remote Git clone URL (`https://github.com/...`).

### 🕸️ 3. Interactive D3.js Force-Directed Graph Visualizer
Inspect your knowledge graph in real-time. The visualizer renders nodes categorized by entity type (`File`, `Function`, `Class`, `Document`, `Entity`), complete with physics simulation (charge repulsion, collision detection, and edge elasticity), search filters, and an interactive slide-over node inspector.

### 🧹 4. Active Memory Pruning & Hygiene
Knowledge bases rot when code refactors happen. DevDoc provides first-class memory management:
- **`forget`**: Surgically remove stale files, superseded documentation, or obsolete endpoints from the graph.
- **`improve`**: Submit natural-language correction feedback to calibrate subsequent graph retrieval passes.

### 💻 5. Dual-Surface Client Ecosystem
- **Next.js 16 Web Dashboard:** A responsive, dark-mode glassmorphic workspace featuring chat with syntax-highlighted code blocks, citation badges, graph topology controls, and ingestion pipelines.
- **VS Code Extension:** Brings the full power of DevDoc directly into the developer's IDE via an integrated WebView panel and editor context menus ("*Query Copilot about Selection*").

---

## 📁 Repository Layout

```text
devDoc/
├── docs/                                  # Project & Architecture Specifications
│   └── FRONTEND_DESIGN_SPEC.md            # Design tokens, CSS system, and UI blueprint
├── devdoc/                                # Main application codebase
│   ├── backend/                           # FastAPI Application & Cognee Integration
│   │   ├── main.py                        # FastAPI routes, CORS, request schemas
│   │   ├── cognee_service.py              # Cognee SDK wrapper & AST pipeline logic
│   │   ├── graph_routes.py                # Graph data, metrics, and inventory endpoints
│   │   ├── config.py                      # Pydantic environment configuration
│   │   └── requirements.txt               # Python backend dependencies
│   ├── frontend/                          # Next.js 16 SPA Client
│   │   ├── app/                           # App router (Layout, Providers, API Proxy)
│   │   ├── components/                    # Dashboard, Chat, Ingest, Graph, Memory UI
│   │   ├── hooks/                         # Toast & reactive telemetry hooks
│   │   ├── lib/                           # API client, D3 helpers, utility routines
│   │   └── tailwind.config.ts             # Glassmorphism design token configuration
│   ├── vscode-extension/                  # VS Code Extension
│   │   ├── src/                           # Extension activation & WebView controller
│   │   ├── package.json                   # Extension manifest & command bindings
│   │   └── tsconfig.json                  # TypeScript compiler settings
│   ├── scripts/                           # Automation scripts
│   │   ├── devdoc_starter.py              # Interactive CLI starter & verification tool
│   │   ├── setup_and_run.bat              # Windows setup and launch automation
│   │   └── setup_and_run.sh               # Unix/macOS setup and launch automation
│   ├── tests/                             # Backend integration & endpoint test suite
│   │   ├── test_endpoints.py              # Pytest API route verification
│   │   ├── test_data.py                   # Mock ingestion fixtures
│   │   └── test_query.py                  # Knowledge graph query validation
│   ├── Makefile                           # Unified developer tasks (install, run, test)
│   └── setup_all.sh                       # Monorepo dependency installer
├── .env.example                           # Root environment variable template
└── README.md                              # Main documentation hub
```

---

## 🚀 Quick Start

### Prerequisites
- **Python:** `3.10` or higher
- **Node.js:** `18.x` or higher (with `npm`)
- **API Key:** An OpenAI (or compatible) API key for LLM and embeddings

---

### Step 1: Clone and Configure Environment

```bash
# Clone the repository
git clone https://github.com/Saumojit30/DevDoc.git
cd DevDoc

# Copy the environment template
cp .env.example .env
```

Edit `.env` with your preferred credentials:
```ini
LLM_PROVIDER="openai"
LLM_MODEL="gpt-4o"
LLM_API_KEY="sk-your-openai-key"

EMBEDDING_PROVIDER="openai"
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSIONS="1536"

COGNEE_SKIP_CONNECTION_TEST=true
CORS_ORIGINS="http://localhost:3000"
```

---

### Step 2: Automated Launch

#### Windows (PowerShell)
```powershell
cd devdoc
.\scripts\setup_and_run.bat
```

#### Linux / macOS (Bash)
```bash
cd devdoc
chmod +x scripts/setup_and_run.sh
./scripts/setup_and_run.sh
```

---

### Step 3: Manual Component Startup (Alternative)

If you prefer running the components in separate terminal windows:

#### Terminal 1 — Backend (FastAPI)
```bash
cd devdoc/backend
python -m venv .venv

# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
*Backend runs at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).*

#### Terminal 2 — Frontend (Next.js 16)
```bash
cd devdoc/frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:3000`.*

#### Terminal 3 — VS Code Extension (Optional)
```bash
cd devdoc/vscode-extension
npm install
npm run compile
```
*Press `F5` inside VS Code with the `vscode-extension` directory open to launch the Extension Development Host.*

---

## 📡 Backend API Reference

| Method | Endpoint | Request Body / Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | — | Health check, version status, and service liveness. |
| `POST` | `/api/chat` | `{ project: string, question: string, onlyContext?: bool, sessionId?: string }` | Queries the knowledge graph and generates citation-backed answers. |
| `POST` | `/api/ingest/docs` | `FormData(project: string, urls?: string, files?: File[])` | Ingests uploaded documents (`.pdf`, `.md`, `.txt`) and web URLs. |
| `POST` | `/api/ingest/code` | `{ project: string, repoPath: string, cloneUrl?: string, sessionId?: string }` | Ingests a local codebase or clones a remote Git repo into the AST graph. |
| `POST` | `/api/memory/forget` | `{ project: string, source: string, sessionId?: string }` | Removes a specific file, URL, or code node from project memory. |
| `POST` | `/api/memory/improve` | `{ project: string, feedback?: string, sessionIds: string[] }` | Refines and reinforces graph retrieval using feedback notes. |
| `POST` | `/api/memory/sources` | `{ project: string }` | Lists all active ingested sources and datasets for a project. |
| `POST` | `/api/graph/data` | `{ project: string }` | Returns node and edge collections formatted for D3 force rendering. |
| `POST` | `/api/graph/metrics` | `{ project: string }` | Computes graph metrics (node count, edge count, density). |
| `POST` | `/api/graph/inventory` | `{ project: string, samples_per_type?: number }` | Returns a categorized inventory of graph entity nodes. |

---

## 🧪 Testing & Verification

The repository includes test suites to validate endpoints, data handling, and query generation:

```bash
cd devdoc

# Run test suites with pytest
pytest tests/ -v
```

To run an end-to-end ingestion and query cycle via the automated starter CLI:
```bash
python devdoc/scripts/devdoc_starter.py
```

---

## 🎨 Design System & Visual Architecture

DevDoc's frontend follows strict design guidelines engineered for deep-work developer environments:
- **Glassmorphism**: Multi-layer backdrop filters (`blur(32px)` / `blur(40px)`) with subtle border glows.
- **Adaptive D3 Physics**: Configurable alpha decay, link distance, and charge strength for stable graph visualizations.
- **Framer Motion Transitions**: Smooth layout animations and view switching.

*For full details on typography, color tokens, and component structure, see [Frontend Design Specification](docs/FRONTEND_DESIGN_SPEC.md).*

---

## 🗺️ Roadmap

- [x] Deterministic AST parsing for Python, TypeScript, and JavaScript
- [x] Multi-source document ingestion (PDFs, Markdown, Web URLs)
- [x] D3.js interactive force-directed graph viewer
- [x] VS Code WebView extension integration
- [ ] Language server protocol (LSP) AST integration for C++, Rust, and Go
- [ ] Multi-tenant team graph synchronization via Neo4j / Memgraph connectors
- [ ] Automated CI/CD documentation diff ingestion via GitHub Actions

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
