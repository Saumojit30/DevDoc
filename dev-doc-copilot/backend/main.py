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

app = FastAPI(
    title="Dev-Doc Copilot API",
    description="Cognee-powered knowledge graph backend for developer documentation and code.",
    version="1.1.0",
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
            dest = settings.UPLOAD_DIR / f.filename
            async with aiofiles.open(dest, "wb") as out:
                content = await f.read()
                await out.write(content)
            saved_files.append(dest)

        result = await CogneeService.ingest_docs(project, urls, saved_files, session_id=sessionId)
        return result
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
    except FileNotFoundError as e:
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
        return result
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
