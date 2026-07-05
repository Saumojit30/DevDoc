import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

import cognee
from cognee.modules.search.types import SearchType

from config import settings


class CogneeService:
    @staticmethod
    def _dataset_name(project: str) -> str:
        return f"project-{project}"

    @classmethod
    async def ingest_docs(cls, project: str, urls: list[str], files: list[Path], session_id: str | None = None) -> dict:
        dataset = cls._dataset_name(project)
        ingested = {"urls": 0, "files": 0}

        items = []
        if urls:
            items.extend(urls)
        if files:
            items.extend(str(f) for f in files)
        if not items:
            return {"status": "ok", "dataset": dataset, "ingested": ingested}

        kwargs = {"dataset_name": dataset}
        if session_id:
            kwargs["session_id"] = session_id

        await cognee.remember(items, **kwargs)

        ingested["urls"] = len(urls)
        ingested["files"] = len(files)
        return {"status": "ok", "dataset": dataset, "ingested": ingested, "session_id": session_id}

    @classmethod
    async def ingest_code(cls, project: str, repo_path: str, clone_url: str | None = None, session_id: str | None = None) -> dict:
        dataset = cls._dataset_name(project)
        target_path = Path(repo_path)

        if clone_url:
            if target_path.exists():
                shutil.rmtree(target_path)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["git", "clone", "--depth", "1", clone_url, str(target_path)], check=True)

        if not target_path.exists():
            raise FileNotFoundError(f"Repository path does not exist: {target_path}")

        code_files = []
        for ext in settings.CODE_EXTENSIONS:
            code_files.extend(target_path.rglob(f"*{ext}"))

        if not code_files:
            return {"status": "ok", "dataset": dataset, "repo": str(target_path), "files_ingested": 0}

        kwargs = {"dataset_name": dataset}
        if session_id:
            kwargs["session_id"] = session_id

        await cognee.add(code_files, **kwargs)
        await cognee.cognify(datasets=[dataset])

        return {
            "status": "ok",
            "dataset": dataset,
            "repo": str(target_path),
            "files_ingested": len(code_files),
            "session_id": session_id,
        }

    @classmethod
    async def chat(cls, project: str, question: str, only_context: bool = False, session_id: str | None = None) -> dict:
        dataset = cls._dataset_name(project)

        kwargs = dict(
            query_type=SearchType.GRAPH_COMPLETION,
            query_text=question,
            datasets=[dataset],
            only_context=only_context,
        )
        if session_id:
            kwargs["session_id"] = session_id

        result = await cognee.recall(**kwargs)

        if only_context:
            return {"role": "assistant", "content": result, "sources": [], "raw": True, "session_id": session_id}

        return {"role": "assistant", "content": result, "sources": [], "raw": False, "session_id": session_id}

    @classmethod
    async def forget(cls, project: str, source: str, session_id: str | None = None) -> dict:
        dataset = cls._dataset_name(project)
        kwargs = {"dataset_name": dataset}
        if session_id:
            kwargs["session_id"] = session_id
        await cognee.forget(source, **kwargs)
        return {"status": "ok", "dataset": dataset, "forgot": source, "session_id": session_id}

    @classmethod
    async def improve(cls, project: str, feedback: str | None = None, session_ids: list[str] | None = None) -> dict:
        dataset = cls._dataset_name(project)
        kwargs: dict[str, Any] = {"dataset": dataset}
        if feedback:
            kwargs["data"] = feedback
        if session_ids:
            kwargs["session_ids"] = session_ids
        await cognee.improve(**kwargs)
        return {"status": "ok", "dataset": dataset, "session_ids": session_ids}
