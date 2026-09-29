# Design: Unify Multi-Provider Environment Templates

## Context
See `proposal.md` for motivation. In `devdoc/backend/config.py`, the `Settings` class resolves settings via `dotenv` and has built-in provider-aware defaults for Groq, Ollama, OpenAI, and Gemini. However, existing `.env.example` files are out of sync with these settings.

## Goals / Non-Goals

**Goals:**
- Design a single canonical `.env.example` layout that cleanly separates:
  1. Provider presets (Groq, Ollama, OpenAI, Google Gemini, Custom OpenAI-Compatible)
  2. Embeddings configuration (fastembed defaults)
  3. Storage & Server bindings (`DATA_ROOT_DIRECTORY`, `UPLOAD_DIR`, `HOST`, `PORT`, `CORS_ORIGINS`)
  4. Code ingestion filters (`CODE_EXTENSIONS`, `MAX_CODE_FILES`, `MAX_CODE_FILE_BYTES`)
- Apply this identical layout to both `.env.example` (repo root) and `devdoc/backend/.env.example`.
- Ensure all variable names map 1:1 with `Settings` in `devdoc/backend/config.py`.

**Non-Goals:**
- Changing code logic in `config.py` (which already supports this unified model).

## Decisions

### Decision 1: Single Canonical Template Shared Between Root and Backend
- **Choice:** Maintain identical content in `devdoc/backend/.env.example` and `.env.example`.
- **Rationale:** Prevents developer confusion regardless of whether they run commands from the repository root or the `devdoc/backend` subdirectory.

### Decision 2: Provider-Grouped Comment Blocks
- **Choice:** Comment out all alternative provider blocks except the default recommended setup, allowing developers to switch providers by simply uncommenting a 4-line block.
- **Rationale:** Minimizes human error and typo-prone manual endpoint/model entry.

## Risks / Trade-offs

- **[Risk]** Existing developers may have local `.env` files with old variable names.
  → **Mitigation:** `config.py` already includes backward-compatible fallbacks for `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, and `GOOGLE_CLOUD_PROJECT`.
