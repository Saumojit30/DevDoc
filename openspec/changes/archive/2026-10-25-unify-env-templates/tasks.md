# Tasks

## 1. Environment Template Standardization

- [x] 1.1 Author the canonical multi-provider template in `devdoc/backend/.env.example` with categorized provider blocks (Groq, Ollama, OpenAI, Gemini, Custom) and valid application settings. Verify the file exists with all sections present.
- [x] 1.2 Mirror the canonical template to repository root `.env.example`, removing all obsolete parameters. Verify root `.env.example` matches `devdoc/backend/.env.example`.

## 2. Verification

- [x] 2.1 Verify that every variable listed in `.env.example` is accounted for in `devdoc/backend/config.py` and run a configuration smoke test.
