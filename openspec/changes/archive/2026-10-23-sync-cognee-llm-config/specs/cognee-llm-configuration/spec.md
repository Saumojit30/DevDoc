# Spec Delta

## Purpose

Enforces explicit synchronization of backend LLM configuration settings into Cognee's internal runtime environment during application startup.

## ADDED Requirements

### Requirement: Startup LLM Configuration Synchronization
The backend service SHALL programmatically configure Cognee's internal LLM settings during application startup using the active application configuration values for provider, model, API key, and endpoint.

#### Scenario: Startup with primary Gemini provider
- **WHEN** the backend application starts up with `LLM_PROVIDER` configured as `gemini`
- **THEN** Cognee's runtime configuration MUST be explicitly updated with the Gemini provider name, model identifier, and API key before accepting ingestion or graph requests.

#### Scenario: Startup with alternative provider
- **WHEN** the backend application starts up with `LLM_PROVIDER` set to an alternative provider (`groq`, `openai`, or `ollama`)
- **THEN** Cognee's runtime configuration MUST be configured with the corresponding provider name, model name, API key, and custom endpoint URL.

### Requirement: Configuration Logging and Verification
The backend service SHALL log the synchronized Cognee LLM provider and model target during startup without exposing sensitive API keys.

#### Scenario: Startup log output
- **WHEN** startup synchronization completes successfully
- **THEN** the application log MUST display a confirmation message indicating the active LLM provider and model configured for Cognee.
