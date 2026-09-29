# Proposal: Synchronize Cognee's Internal LLM Config

## Why
Cognee performs internal LLM entity extraction and graph cognify operations during ingestion. When started without an explicit `cognee.config.set_llm_config(...)`, Cognee falls back to its default environment parser instead of honoring DevDoc's application settings (`LLM_PROVIDER`, `LLM_ENDPOINT`, `LLM_MODEL`, and `LLM_API_KEY`). This leads to ingestion failures, unexpected default provider attempts, or missing extracted entities when running with alternative providers such as Groq, OpenAI, Ollama, or Gemini.

## What Changes
- Add explicit startup synchronization in `backend/main.py` using FastAPI's lifespan (or startup event) that invokes `cognee.config.set_llm_config(...)`.
- Pass application settings (`LLM_PROVIDER`, `LLM_ENDPOINT`, `LLM_MODEL`, and `LLM_API_KEY`) to Cognee's internal config dictionary.
- Include appropriate mapping for OpenAI-compatible endpoints, Groq, Ollama, and Google Gemini to ensure Cognee's internal pipelines invoke the configured model correctly.
- Add logging at startup to clearly verify that Cognee's internal LLM configuration is synchronized with DevDoc's active settings.

## Capabilities

### New Capabilities
- `cognee-llm-configuration`: Synchronize and enforce DevDoc LLM provider, endpoint, and model settings into Cognee's runtime configuration on backend startup.

### Modified Capabilities
<!-- None -->

## Impact
- `devdoc/backend/main.py`: Add startup/lifespan initialization hook for `cognee.config.set_llm_config`.
- `devdoc/backend/cognee_service.py`: Compatible with Cognee's configured internal pipelines during `cognify`, `remember`, and entity extraction.
- External systems: Ingestion will reliably query the configured LLM endpoint without fallback errors.
