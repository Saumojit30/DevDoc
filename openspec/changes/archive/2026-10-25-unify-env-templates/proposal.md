# Proposal: Unify Multi-Provider Environment Templates

## Why
The repository currently maintains divergent `.env.example` files across the root directory and `devdoc/backend/`. The root file contains obsolete Cognee variables that are never read by the application, while the backend file only documents Google Gemini and omits core multi-provider parameters (`LLM_ENDPOINT` and `LLM_API_KEY`). Unifying both files with clear, categorized presets matching `backend/config.py` eliminates configuration friction and makes onboarding seamless across providers (Groq, Ollama, OpenAI, Gemini).

## What Changes
- Remove obsolete parameters (`COGNEE_SKIP_CONNECTION_TEST`, `ENABLE_BACKEND_ACCESS_CONTROL`, `SYSTEM_ROOT_DIRECTORY`, `EMBEDDING_DIMENSIONS`) that are not recognized by `config.py`.
- Provide explicit, commented preset blocks for:
  - **Groq** (Recommended fast & free cloud tier)
  - **Local Ollama** (Recommended 100% offline & local)
  - **OpenAI** (Standard GPT-4o / GPT-4o-mini)
  - **Google Gemini** (Distinguishing AI Studio API key vs GCP Vertex AI)
  - **Generic OpenAI-Compatible** (OpenRouter, Together, DeepSeek, vLLM)
- Document active runtime defaults for local embeddings (`fastembed`), storage paths, and server bindings.
- Harmonize `devdoc/backend/.env.example` and the root `.env.example` into a synchronized, authoritative schema.

## Capabilities

### New Capabilities
- `environment-configuration`: Standardized multi-provider environment variable template and documentation matching runtime settings.

### Modified Capabilities
<!-- None -->

## Impact
- `devdoc/backend/.env.example`: Overwritten with clean, categorized multi-provider template.
- `.env.example`: Synchronized with `devdoc/backend/.env.example`.
- Developer onboarding: Instant copy-to-`.env` setup without guessing variable names.
