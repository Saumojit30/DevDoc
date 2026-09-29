# Tasks

## 1. Startup Configuration Hook

- [x] 1.1 Implement `init_cognee_config()` to programmatically call `cognee.config.set_llm_config(...)` with active application settings (`LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_ENDPOINT`) and sync corresponding environment variables. Verify that calling `init_cognee_config()` successfully sets Cognee configuration without errors.
- [x] 1.2 Wire `init_cognee_config()` into `devdoc/backend/main.py` using FastAPI's `lifespan` context manager on `app = FastAPI(...)`. Verify FastAPI application boots and completes lifespan setup without errors.

## 2. Verification & Logging

- [x] 2.1 Add safe structured logging in `init_cognee_config()` that outputs the active LLM provider and model while masking API keys. Verify that running the backend logs the configuration line.
- [x] 2.2 Validate initialization across provider profiles (e.g. Gemini, Groq, Ollama) using an automated test in `devdoc/tests/` or direct execution to ensure no unhandled exceptions.
