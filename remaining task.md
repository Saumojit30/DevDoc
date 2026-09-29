# DevDoc — Remaining Tasks Checklist

This document tracks all remaining tasks required to bring **DevDoc** from its current stage to a 100% completed, verified, and interview-ready product (local-first + live demo link).

---

## 🔴 Phase 1: Critical Codebase Fixes & Edge Cases

- [x] **Synchronize Cognee's Internal LLM Config (`backend/main.py`)**
  - **Issue:** Cognee starts without an explicit `cognee.config.set_llm_config(...)`. Even though custom `_call_llm()` supports Groq, OpenAI, and Ollama, Cognee's internal entity extraction during ingestion falls back to its default environment parser.
  - **Action:** Add explicit startup configuration in `main.py` using `settings.LLM_PROVIDER`, `settings.LLM_ENDPOINT`, `settings.LLM_MODEL`, and `settings.LLM_API_KEY`.

- [x] **Fix VS Code Extension Graph Rendering (`vscode-extension/src/extension.ts`)**
  - **Issue:** Clicking the "Graph" tab currently dumps raw JSON text inside a `<pre>` tag (`JSON.stringify(message.data)` at line 370).
  - **Action:** Embed an `<iframe>` pointing to `${backendUrl}/api/graph/visualize-html?project=${project}` or render an interactive SVG/canvas node visualization inside the WebView.

- [x] **Fix Unicode Typo in `backend/main.py`**
  - **Issue:** Line 179 contains a corrupted character string: `# MEMORY â€” IMPROVE`.
  - **Action:** Replace with clean UTF-8 text: `# MEMORY — IMPROVE`.

- [x] **Update `backend/.env.example` with Multi-Provider Templates**
  - **Issue:** Currently only documents Google Gemini.
  - **Action:** Add commented configuration blocks for Groq, OpenAI, Local Ollama, and Google AI Studio so developers can switch providers easily.

---

## 🟡 Phase 2: End-to-End Local Verification

- [x] **Run and Validate Test Suite**
  - Execute:
    ```bash
    cd devdoc/backend
    python ../tests/test_endpoints.py
    ```
  - Verify that:
    - Ingestion executes without LanceDB/KuzuDB path locking errors.
    - Chat query recall returns grounded answers and non-empty source citations.
    - Graph endpoints (`/api/graph/data`) return valid node and edge arrays.

- [x] **Verify Frontend Production Build**
  - Execute:
    ```bash
    cd devdoc/frontend
    npm run build
    ```
  - Ensure zero Next.js App Router / TypeScript strict mode compilation errors.

- [x] **Verify VS Code Extension Compilation**
  - Execute:
    ```bash
    cd devdoc/vscode-extension
    npm run compile
    ```
  - Ensure TypeScript compiles cleanly to `out/extension.js`.

---

## 🟢 Phase 3: Live Demo Packaging & Free Deployment

- [x] **Pre-seed Demo Knowledge Dataset**
  - Run a one-time local ingestion of a representative, well-known codebase (e.g. FastAPI docs + core source code) so `.data_storage/` is pre-populated.
  - Verify that D3 graph rendering and chat queries load instantaneously without requiring the user to trigger a new ingestion.

- [ ] **Deploy Frontend to Vercel**
  - Point Vercel root directory to `devdoc/frontend`.
  - Set Environment Variables:
    - `BACKEND_URL`: Public backend container URL (e.g., on Railway or Oracle VM).
    - `NEXT_PUBLIC_DEMO_MODE`: `true` (locks public repository cloning/scraping to prevent token abuse).

- [ ] **Deploy Backend to Container Host (Railway / Oracle Cloud Free VM)**
  - Build and launch using `devdoc/backend/Dockerfile`.
  - Attach a persistent volume to `/app/.data_storage` to ensure vector and graph files survive container restarts.

---

## 🟣 Phase 4: Portfolio Showcase Polish

- [ ] **Add 15–30 Second Demo Walkthrough GIF to Root README**
  - Record a concise demonstration showing:
    1. Chat interface answering an architectural question with live citations.
    2. Exploring the D3 force-directed graph (dragging nodes, filtering classes/functions, inspecting degree centrality).
    3. Querying code from inside the VS Code WebView.
  - Embed the GIF at the top of `devdoc/README.md`.

- [ ] **Final Architecture & Differentiator Section Check**
  - Ensure the "How DevDoc Differs from Cursor & Copilot" table is prominent in the README to showcase senior technical trade-off awareness to recruiters and lead engineers.
