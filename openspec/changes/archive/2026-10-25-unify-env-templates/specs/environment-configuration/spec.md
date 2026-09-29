# Spec Delta

## Purpose

Defines the authoritative environment configuration contract and multi-provider presets across DevDoc deployment targets.

## ADDED Requirements

### Requirement: Unified Multi-Provider Environment Template
The repository SHALL provide identical, synchronized environment template files in both the repository root and backend directory that document all supported LLM providers and runtime variables recognized by `config.py`.

#### Scenario: Developer configures Groq provider
- **WHEN** a developer selects the Groq preset in `.env`
- **THEN** the template MUST supply `LLM_PROVIDER=groq`, `LLM_MODEL=llama-3.1-8b-instant`, `LLM_ENDPOINT=https://api.groq.com/openai/v1`, and `LLM_API_KEY=gsk_...`.

#### Scenario: Developer configures Local Ollama
- **WHEN** a developer selects the Ollama preset in `.env`
- **THEN** the template MUST supply `LLM_PROVIDER=ollama`, `LLM_MODEL=qwen2.5-coder:7b`, and `LLM_ENDPOINT=http://localhost:11434/v1` without requiring an API key.

#### Scenario: Developer configures Google Gemini
- **WHEN** a developer selects Google Gemini in `.env`
- **THEN** the template MUST provide distinct options for Google AI Studio API key access and Google Cloud Vertex AI project/location configuration.

### Requirement: Removal of Obsolete Variables
The environment template files SHALL NOT include deprecated or unused parameters that are not parsed by the application settings.

#### Scenario: Environment validation check
- **WHEN** inspecting `.env.example`
- **THEN** obsolete variables such as `COGNEE_SKIP_CONNECTION_TEST` and `SYSTEM_ROOT_DIRECTORY` MUST NOT be present.
