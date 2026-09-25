import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import aiofiles
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from cognee_service import CogneeService
from config import settings
from graph_routes import router as graph_router

from contextlib import asynccontextmanager
import logging

logger = logging.getLogger("devdoc")

def init_cognee_config() -> dict:
    """
    Synchronizes DevDoc settings with Cognee's internal LLM configuration.
    Also ensures required environment variables are synchronized for any
    subsystems that directly inspect os.environ.
    """
    # 1. Sync environment variables as defense-in-depth
    if settings.LLM_PROVIDER:
        os.environ["LLM_PROVIDER"] = settings.LLM_PROVIDER
    if settings.LLM_MODEL:
        os.environ["LLM_MODEL"] = settings.LLM_MODEL
    if settings.LLM_ENDPOINT:
        os.environ["LLM_ENDPOINT"] = settings.LLM_ENDPOINT
    if settings.LLM_API_KEY:
        os.environ["LLM_API_KEY"] = settings.LLM_API_KEY
        if settings.LLM_PROVIDER == "gemini":
            os.environ.setdefault("GEMINI_API_KEY", settings.LLM_API_KEY)
            os.environ.setdefault("GOOGLE_API_KEY", settings.LLM_API_KEY)
        elif settings.LLM_PROVIDER == "groq":
            os.environ.setdefault("GROQ_API_KEY", settings.LLM_API_KEY)
        elif settings.LLM_PROVIDER == "openai":
            os.environ.setdefault("OPENAI_API_KEY", settings.LLM_API_KEY)

    config_payload = {
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.LLM_MODEL,
    }
    if settings.LLM_API_KEY:
        config_payload["llm_api_key"] = settings.LLM_API_KEY
    if settings.LLM_ENDPOINT:
        config_payload["llm_endpoint"] = settings.LLM_ENDPOINT

    # 2. Configure Cognee runtime if cognee is available
    try:
        import cognee
        if hasattr(cognee, "config") and hasattr(cognee.config, "set_llm_config"):
            try:
                cognee.config.set_llm_config(config_payload)
            except TypeError:
                cognee.config.set_llm_config(**config_payload)
            logger.info(
                f"[Cognee] LLM synchronized: provider='{settings.LLM_PROVIDER}', "
                f"model='{settings.LLM_MODEL}', endpoint='{settings.LLM_ENDPOINT or 'default'}', "
                f"api_key_set={bool(settings.LLM_API_KEY)}"
            )
        else:
            logger.warning("[Cognee] cognee.config.set_llm_config not available on installed cognee package.")
    except ImportError:
        logger.warning("[Cognee] cognee library not imported; skipping runtime config sync.")
    except Exception as e:
        logger.error(f"[Cognee] Error synchronizing LLM config: {e}")

    return config_payload

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_cognee_config()
    yield

app = FastAPI(
    title="Dev-Doc Copilot API",
    description="Cognee-powered knowledge graph backend for developer documentation and code.",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph_router)

# ------------------------------------------------------------------
# Pydantic Models
# ------------------------------------------------------------------
class ChatRequest(BaseModel):
    project: str
    question: str
    onlyContext: bool = False
    sessionId: Optional[str] = None

class IngestCodeRequest(BaseModel):
    project: str
    repoPath: str
    cloneUrl: Optional[str] = None
    sessionId: Optional[str] = None

class IngestUrlRequest(BaseModel):
    project: str
    url: str
    sessionId: Optional[str] = None

class ForgetRequest(BaseModel):
    project: str
    source: str
    sessionId: Optional[str] = None

class ImproveRequest(BaseModel):
    project: str
    feedback: Optional[str] = None
    sessionIds: list[str] = []

class SourcesRequest(BaseModel):
    project: str

class ProjectRequest(BaseModel):
    project: str

# ------------------------------------------------------------------
# HEALTH
# ------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.1.0"}

# ------------------------------------------------------------------
# CHAT
# ------------------------------------------------------------------
@app.post("/api/chat")
async def chat(req: ChatRequest):
    try:
        result = await CogneeService.chat(
            project=req.project,
            question=req.question,
            only_context=req.onlyContext,
            session_id=req.sessionId,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# INGEST — DOCS
# ------------------------------------------------------------------
@app.post("/api/ingest/docs")
async def ingest_docs(
    project: str = Form(...),
    urls: list[str] = Form(default=[]),
    files: list[UploadFile] = File(default=[]),
    sessionId: Optional[str] = Form(None),
):
    try:
        saved_files: list[Path] = []
        for f in files:
            safe_name = Path(f.filename).name if f.filename else "doc_upload.txt"
            dest = settings.UPLOAD_DIR / safe_name
            async with aiofiles.open(dest, "wb") as out:
                content = await f.read()
                await out.write(content)
            saved_files.append(dest)

        result = await CogneeService.ingest_docs(project, urls, saved_files, session_id=sessionId)
        return result
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# INGEST — CODE
# ------------------------------------------------------------------
@app.post("/api/ingest/code")
async def ingest_code(req: IngestCodeRequest):
    try:
        result = await CogneeService.ingest_code(
            project=req.project,
            repo_path=req.repoPath,
            clone_url=req.cloneUrl,
            session_id=req.sessionId,
        )
        return result
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail=f"Git clone failed: {e}")
    except RuntimeError as e:
        if "Git clone failed:" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))
    except (FileNotFoundError, NotADirectoryError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# INGEST — URL (fetch web page, extract text, ingest)
# ------------------------------------------------------------------
@app.post("/api/ingest/url")
async def ingest_url(req: IngestUrlRequest):
    try:
        result = await CogneeService.ingest_url(
            project=req.project,
            url=req.url,
            session_id=req.sessionId,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# MEMORY — FORGET
# ------------------------------------------------------------------
@app.post("/api/memory/forget")
async def memory_forget(req: ForgetRequest):
    try:
        result = await CogneeService.forget(req.project, req.source, session_id=req.sessionId)
        if result.get("status") == "not_found":
            raise HTTPException(status_code=404, detail=f"Source '{req.source}' not found in project dataset.")
        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result.get("error", "Memory forget operation failed."))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# MEMORY — IMPROVE
# ------------------------------------------------------------------
@app.post("/api/memory/improve")
async def memory_improve(req: ImproveRequest):
    try:
        result = await CogneeService.improve(
            project=req.project,
            feedback=req.feedback,
            session_ids=req.sessionIds if req.sessionIds else None,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# MEMORY — TRIPLET EMBEDDINGS (memify pipeline 1)
# ------------------------------------------------------------------
@app.post("/api/memory/triplet-embeddings")
async def memory_triplet_embeddings(req: ProjectRequest):
    try:
        result = await CogneeService.create_triplet_embeddings(req.project)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# MEMORY — CONSOLIDATE ENTITIES (memify pipeline 2)
# ------------------------------------------------------------------
@app.post("/api/memory/consolidate-entities")
async def memory_consolidate_entities(req: ProjectRequest):
    try:
        result = await CogneeService.consolidate_entities(req.project)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# MEMORY — SOURCES (list ingested sources for a project)
# ------------------------------------------------------------------
@app.post("/api/memory/sources")
async def memory_sources(req: SourcesRequest):
    try:
        result = await CogneeService.list_sources(req.project)
        return {"sources": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# ENTRYPOINT
# ------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)

