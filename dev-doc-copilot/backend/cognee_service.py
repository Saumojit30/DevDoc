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

        kwargs: dict[str, Any] = {"dataset_name": dataset}
        if session_id:
            kwargs["session_id"] = session_id

        await cognee.remember(data=items, **kwargs)

        ingested["urls"] = len(urls)
        ingested["files"] = len(files)
        return {"status": "ok", "dataset": dataset, "ingested": ingested, "session_id": session_id}

    @classmethod
    async def ingest_url(cls, project: str, url: str, session_id: str | None = None) -> dict:
        import time
        import httpx
        import trafilatura

        dataset = cls._dataset_name(project)
        text: str | None = None

        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            # Try markdown alternative first (e.g. Mintlify, Docusaurus serve /page.md)
            md_url = url.rstrip("/") + ".md"
            try:
                resp = await client.get(md_url)
                if resp.status_code == 200 and resp.text.strip().startswith(("# ", "> ")):
                    text = resp.text
            except Exception:
                pass

            if not text:
                # Fall back to trafilatura HTML extraction
                try:
                    resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                    raw_html = resp.text
                except Exception as e:
                    raise ValueError(f"Could not fetch URL: {url} ({e})")

                text = trafilatura.extract(
                    raw_html,
                    output_format="markdown",
                    include_comments=False,
                    include_tables=True,
                )

        if not text or not text.strip():
            raise ValueError(f"No readable content found at: {url}")

        safe_name = url.rstrip("/").split("/")[-1] or "index"
        safe_name = "".join(c if c.isalnum() or c in "-_." else "_" for c in safe_name)
        filename = f"url_{int(time.time())}_{safe_name}.md"
        dest = settings.UPLOAD_DIR / filename
        dest.write_text(text, encoding="utf-8")

        await cognee.remember(data=[str(dest)], dataset_name=dataset)

        return {
            "status": "ok",
            "dataset": dataset,
            "url": url,
            "file": str(dest),
            "chars": len(text),
            "session_id": session_id,
        }

    @classmethod
    async def ingest_code(cls, project: str, repo_path: str, clone_url: str | None = None, session_id: str | None = None) -> dict:
        dataset = cls._dataset_name(project)

        # Auto-detect git URL: if repo_path looks like a URL, treat it as clone_url
        if not clone_url and (repo_path.startswith("http://") or repo_path.startswith("https://") or repo_path.startswith("git@")):
            clone_url = repo_path
            repo_name = repo_path.rstrip("/").split("/")[-1].replace(".git", "")
            repo_path = str(settings.UPLOAD_DIR / "repos" / repo_name)

        target_path = Path(repo_path)

        if clone_url:
            if target_path.exists():
                shutil.rmtree(target_path)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["git", "clone", "--depth", "1", clone_url, str(target_path)], check=True)

        if not target_path.exists():
            raise FileNotFoundError(f"Repository path does not exist: {target_path}")

        code_files: list[str] = []
        for ext in settings.CODE_EXTENSIONS:
            for f in target_path.rglob(f"*{ext}"):
                code_files.append(str(f))

        if not code_files:
            return {"status": "ok", "dataset": dataset, "repo": str(target_path), "files_ingested": 0}

        await cognee.add(code_files, dataset_name=dataset)
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

        kwargs: dict[str, Any] = dict(
            query_text=question,
            query_type=SearchType.GRAPH_COMPLETION,
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
        await cognee.forget(dataset=dataset, everything=False, memory_only=False)
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

    @classmethod
    async def list_sources(cls, project: str) -> list[dict[str, Any]]:
        dataset = cls._dataset_name(project)
        try:
            inventory = await cognee.get_schema_inventory(dataset=dataset, samples_per_type=50, sort="count")
            return inventory if inventory else []
        except Exception:
            return []
