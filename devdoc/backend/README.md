# Dev-Doc Copilot — FastAPI Backend

Cognee-powered knowledge graph API for the Next.js frontend.

## Quick Start

```bash
# 1. Create virtual environment
python -m venv .venv
source .venv/bin/activate

# 2. Install
pip install -r requirements.txt

# 3. Configure
cp .env.example .env
# Edit .env and set OPENAI_API_KEY

# 4. Run
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Query the knowledge graph |
| POST | `/api/ingest/docs` | Ingest URLs and files |
| POST | `/api/ingest/code` | Ingest repo via CodeGraph |
| POST | `/api/memory/forget` | Remove a source |
| POST | `/api/memory/improve` | Feedback enrichment |
| GET | `/health` | Health check |

## Architecture

- `main.py` — FastAPI routes, CORS, request models
- `cognee_service.py` — Business logic wrapping Cognee SDK
- `config.py` — Environment and settings
