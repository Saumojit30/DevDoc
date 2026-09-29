# Design: Synchronize Cognee's Internal LLM Config

## Context
See `proposal.md` for motivation. Currently, `devdoc/backend/main.py` sets up a FastAPI instance without a startup hook or lifespan context manager for Cognee. While `CogneeService` implements custom LLM calls for chat recall, Cognee's internal `cognify` and entity extraction pipelines rely on Cognee's global configuration manager (`cognee.config.set_llm_config`). When unconfigured, Cognee attempts to parse standard default environment variables, which can fail or misroute LLM requests when non-default providers (Groq, Ollama, OpenAI) or customized models are chosen.

## Goals / Non-Goals

**Goals:**
- Provide a clean, robust startup initialization in `devdoc/backend/main.py` (via lifespan or startup hook) that configures Cognee before any requests are accepted.
- Map DevDoc's `settings.LLM_PROVIDER`, `settings.LLM_MODEL`, `settings.LLM_API_KEY`, and `settings.LLM_ENDPOINT` into `cognee.config.set_llm_config(...)`.
- Synchronize critical environment variables (`LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_ENDPOINT`) in `os.environ` as defense-in-depth for any sub-components directly inspecting environment variables.
- Log initialization status cleanly without exposing secrets.

**Non-Goals:**
- Rewriting custom query endpoints or chat recall logic in `CogneeService`.
- Altering vector database or graph database storage engines.
- Refactoring the VS Code extension or frontend in this change.

## Decisions

### Decision 1: Use FastAPI Lifespan Handler in `main.py`
- **Choice:** Define an `asynccontextmanager` `lifespan(app: FastAPI)` that executes `init_cognee_config()` on startup.
- **Rationale:** The `@app.on_event("startup")` pattern is deprecated in newer FastAPI / Starlette releases. The `lifespan` handler is the current recommended pattern.
- **Alternative:** Keep `@app.on_event("startup")`. While compatible, it triggers deprecation warnings in newer Starlette versions.

### Decision 2: Helper Function `init_cognee_config()`
- **Choice:** Encapsulate configuration logic inside a dedicated helper function (in `backend/main.py` or `cognee_service.py`), handling dictionary construction and safe fallback if Cognee is run in mock/test mode.
- **Rationale:** Keeps startup code testable and cleanly separated from routing boilerplate.

### Decision 3: Sensitive Key Masking in Logs
- **Choice:** Log only provider, model, and presence/absence of API key (e.g., `api_key_set=True`).
- **Rationale:** Prevents credential leakage in server logs.

## Risks / Trade-offs

- **[Risk]** Cognee version differences in `set_llm_config` signature across minor releases.
  → **Mitigation:** Wrap the call with error handling and fallback to dictionary-based assignment if keyword parameters vary.
- **[Risk]** Providers with custom base URLs (e.g., Groq or Ollama OpenAI-compatible endpoints) require `llm_endpoint` in Cognee.
  → **Mitigation:** Explicitly include `llm_endpoint` in the configuration dictionary when set in `settings`.
