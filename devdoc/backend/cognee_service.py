import asyncio
import os
import re
import shutil
import stat
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import cognee
from cognee.infrastructure.databases.graph import get_graph_engine

from config import settings

SKIP_REPO_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".next",
    ".nuxt",
    ".turbo",
    ".venv",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "out",
    "target",
    "venv",
}

LOW_PRIORITY_REPO_DIRS = {
    "example",
    "examples",
    "fixture",
    "fixtures",
    "log",
    "logs",
    "notebook",
    "notebooks",
    "temp",
    "tmp",
}

HIGH_PRIORITY_REPO_DIRS = {
    "api",
    "app",
    "backend",
    "client",
    "core",
    "docs",
    "frontend",
    "lib",
    "server",
    "src",
}


def _normalize_github_url(url: str) -> tuple[str, str | None]:
    parsed = urlparse(url)
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
    if netloc != "github.com":
        return url, None

    path = parsed.path.rstrip("/")

    match = re.match(r"/([^/]+)/([^/]+)/(?:tree|blob)/([^/]+)/(.+)", path)
    if match:
        user, repo, _branch, subpath = match.groups()
        repo = repo.replace(".git", "")
        return f"https://github.com/{user}/{repo}.git", subpath

    match = re.match(r"/([^/]+)/([^/]+)", path)
    if match:
        user, repo = match.groups()
        repo = repo.replace(".git", "")
        return f"https://github.com/{user}/{repo}.git", None

    return url, None


def _dataset_name(project: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", project.lower().replace(" ", "_"))
    return f"project_{safe}"


def _repo_dir_name(clone_url: str) -> str:
    name = clone_url.rstrip("/").split("/")[-1].replace(".git", "")
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name) or "repo"


def _repo_file_priority(root: Path, file_path: Path) -> tuple[int, int, str]:
    rel_parts = [part.lower() for part in file_path.relative_to(root).parts]
    score = 0

    if file_path.name.lower().startswith("readme"):
        score -= 50
    if any(part in HIGH_PRIORITY_REPO_DIRS for part in rel_parts[:-1]):
        score -= 25
    if any(part in LOW_PRIORITY_REPO_DIRS for part in rel_parts[:-1]):
        score += 20
    if any(part in {"test", "tests", "__tests__", "spec", "specs"} for part in rel_parts[:-1]):
        score += 25

    return score, len(rel_parts), str(file_path)


def _collect_repo_files(scan_path: Path) -> tuple[list[str], dict[str, int | bool]]:
    allowed_exts = {ext.lower() for ext in settings.CODE_EXTENSIONS}
    max_bytes = settings.MAX_CODE_FILE_BYTES
    max_files = settings.MAX_CODE_FILES

    files: list[Path] = []
    skipped_large = 0
    skipped_empty = 0

    for root, dirnames, filenames in os.walk(scan_path, topdown=True):
        dirnames[:] = [directory for directory in dirnames if directory.lower() not in SKIP_REPO_DIRS]

        root_path = Path(root)
        for filename in filenames:
            file_path = root_path / filename
            if file_path.suffix.lower() not in allowed_exts:
                continue

            try:
                size = file_path.stat().st_size
            except OSError:
                continue

            if size <= 0:
                skipped_empty += 1
                continue
            if size > max_bytes:
                skipped_large += 1
                continue

            files.append(file_path)

    files.sort(key=lambda path: _repo_file_priority(scan_path, path))
    selected = files[:max_files]

    stats: dict[str, int | bool] = {
        "candidate_files": len(files),
        "selected_files": len(selected),
        "skipped_empty_files": skipped_empty,
        "skipped_large_files": skipped_large,
        "truncated": len(files) > len(selected),
    }
    return [str(path) for path in selected], stats


async def _remember_in_batches(items: list[str], dataset_name: str, session_id: str | None = None) -> None:
    for start in range(0, len(items), settings.CODE_INGEST_BATCH_SIZE):
        batch = items[start:start + settings.CODE_INGEST_BATCH_SIZE]
        kwargs: dict[str, Any] = {"dataset_name": dataset_name}
        if session_id:
            kwargs["session_id"] = session_id
        await cognee.remember(data=batch, **kwargs)


async def _tag_new_graph_nodes(dataset_name: str) -> None:
    try:
        graph_engine = await get_graph_engine()
        await graph_engine.query(
            "MATCH (n:Node) WHERE n.dataset_name IS NULL SET n.dataset_name = $dataset_name",
            {"dataset_name": dataset_name},
        )
    except Exception:
        pass


class CogneeService:
    @classmethod
    async def ingest_docs(cls, project: str, urls: list[str], files: list[Path], session_id: str | None = None) -> dict:
        ingested = {"urls": 0, "files": 0}

        items = []
        if urls:
            items.extend(urls)
        if files:
            items.extend(str(file) for file in files)
        if not items:
            return {"status": "ok", "dataset": _dataset_name(project), "ingested": ingested}

        await _remember_in_batches(items, _dataset_name(project), session_id=session_id)
        await _tag_new_graph_nodes(_dataset_name(project))

        ingested["urls"] = len(urls)
        ingested["files"] = len(files)
        return {"status": "ok", "dataset": _dataset_name(project), "ingested": ingested, "session_id": session_id}

    @classmethod
    async def ingest_url(cls, project: str, url: str, session_id: str | None = None) -> dict:
        import time

        import httpx
        import trafilatura

        text: str | None = None

        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            md_url = url.rstrip("/") + ".md"
            try:
                resp = await client.get(md_url)
                if resp.status_code == 200 and resp.text.strip().startswith(("# ", "> ")):
                    text = resp.text
            except Exception:
                pass

            if not text:
                try:
                    resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                    raw_html = resp.text
                except Exception as exc:
                    raise ValueError(f"Could not fetch URL: {url} ({exc})")

                text = trafilatura.extract(
                    raw_html,
                    output_format="markdown",
                    include_comments=False,
                    include_tables=True,
                )

        if not text or not text.strip():
            raise ValueError(f"No readable content found at: {url}")

        safe_name = url.rstrip("/").split("/")[-1] or "index"
        safe_name = "".join(char if char.isalnum() or char in "-_." else "_" for char in safe_name)
        filename = f"url_{int(time.time())}_{safe_name}.md"
        dest = settings.UPLOAD_DIR / filename
        dest.write_text(text, encoding="utf-8")

        try:
            await _remember_in_batches([str(dest)], _dataset_name(project), session_id=session_id)
            await _tag_new_graph_nodes(_dataset_name(project))
        finally:
            if dest.exists():
                try:
                    dest.unlink()
                except OSError:
                    pass

        return {
            "status": "ok",
            "dataset": _dataset_name(project),
            "url": url,
            "file": str(dest),
            "chars": len(text),
            "session_id": session_id,
        }

    @classmethod
    async def ingest_code(cls, project: str, repo_path: str, clone_url: str | None = None, session_id: str | None = None) -> dict:
        ds = _dataset_name(project)

        subpath: str | None = None
        if not clone_url and (repo_path.startswith("http://") or repo_path.startswith("https://") or repo_path.startswith("git@")):
            clone_url, subpath = _normalize_github_url(repo_path)
            repo_name = _repo_dir_name(clone_url)
            repo_path = str(settings.UPLOAD_DIR / "repos" / repo_name)

        target_path = Path(repo_path)

        if clone_url:
            if target_path.exists():
                def _remove_readonly(func, path, _exc_info):
                    os.chmod(path, stat.S_IWRITE)
                    func(path)

                shutil.rmtree(target_path, onerror=_remove_readonly)
            target_path.parent.mkdir(parents=True, exist_ok=True)

            clone_args = ["git", "clone", "--depth", "1"]
            if subpath:
                clone_args.extend(["--filter=blob:none", "--sparse"])
            clone_args.extend([clone_url, str(target_path)])

            proc = await asyncio.create_subprocess_exec(
                *clone_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
            if proc.returncode != 0:
                err_msg = stderr.decode(errors="replace") if stderr else "unknown git error"
                raise RuntimeError(f"Git clone failed: {err_msg}")

            if subpath:
                proc2 = await asyncio.create_subprocess_exec(
                    "git",
                    "sparse-checkout",
                    "set",
                    "--no-cone",
                    subpath,
                    cwd=str(target_path),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout2, stderr2 = await asyncio.wait_for(proc2.communicate(), timeout=30)
                if proc2.returncode != 0:
                    raise subprocess.CalledProcessError(
                        proc2.returncode,
                        ["git", "sparse-checkout", "set", "--no-cone", subpath],
                        output=stdout2,
                        stderr=stderr2,
                    )

        if not target_path.exists():
            raise FileNotFoundError(f"Repository path does not exist: {target_path}")

        scan_path = target_path / subpath if subpath else target_path
        if not scan_path.exists():
            raise FileNotFoundError(f"Path within repo does not exist: {scan_path}")

        code_files, stats = _collect_repo_files(scan_path)

        if not code_files:
            return {
                "status": "ok",
                "dataset": ds,
                "repo": str(target_path),
                "files_ingested": 0,
                **stats,
            }

        from cognee.api.v1.cognify.code_graph_pipeline import run_code_graph_pipeline

        await run_code_graph_pipeline(
            repo_path=str(scan_path),
            dataset_name=ds,
        )
        await _tag_new_graph_nodes(ds)

        return {
            "status": "ok",
            "dataset": ds,
            "repo": str(target_path),
            "files_ingested": len(code_files),
            **stats,
            "session_id": session_id,
        }

    @classmethod
    async def chat(cls, project: str, question: str, only_context: bool = False, session_id: str | None = None) -> dict:
        kwargs: dict[str, Any] = {
            "query_text": question,
            "datasets": [_dataset_name(project)],
            "only_context": only_context,
        }
        if session_id:
            kwargs["session_id"] = session_id

        result = await cognee.recall(**kwargs)

        context_text = ""
        sources = []

        if isinstance(result, list):
            texts = []
            for item in result:
                if hasattr(item, "text"):
                    texts.append(item.text)
                elif isinstance(item, dict):
                    texts.append(item.get("text", str(item)))
                else:
                    texts.append(str(item))

                src_name = None
                src_type = "doc"
                if hasattr(item, "source"):
                    src_name = item.source
                elif isinstance(item, dict):
                    src_name = item.get("source") or item.get("document_name") or item.get("id")
                elif hasattr(item, "id"):
                    src_name = item.id
                if hasattr(item, "type"):
                    src_type = str(item.type)
                elif isinstance(item, dict):
                    src_type = item.get("type", "doc")
                if src_name:
                    src_id = str(src_name)[:100]
                    if not any(source["id"] == src_id for source in sources):
                        sources.append({"id": src_id, "name": src_id, "type": src_type, "source": ""})
            context_text = "\n".join(texts)
        elif isinstance(result, dict):
            context_text = result.get("text", str(result))
        elif hasattr(result, "text"):
            context_text = result.text
        else:
            context_text = str(result)

        if only_context:
            project_safe = _dataset_name(project)
            return {"role": "assistant", "content": context_text, "sources": sources, "session_id": session_id, "dataset": project_safe}

        try:
            content = await cls._call_llm(question, context_text)
        except Exception:
            content = f"I retrieved the following information from memory, but could not generate a response:\n\n{context_text[:2000]}"

        project_safe = _dataset_name(project)
        return {"role": "assistant", "content": content, "sources": sources, "session_id": session_id, "dataset": project_safe}

    @classmethod
    async def _call_llm(cls, question: str, context: str) -> str:
        import httpx

        model = settings.LLM_MODEL or "gemini-2.5-flash"
        if model.startswith("openai/"):
            model = model[len("openai/"):]

        system_prompt = (
            "You are a technical documentation assistant powered by a knowledge graph. "
            "Answer the user's question based ONLY on the context provided below. "
            "If the context doesn't contain enough information to answer the question, "
            "say so clearly and politely.\n\n"
            f"Context:\n{context}"
        )

        if settings.LLM_ENDPOINT:
            base_endpoint = settings.LLM_ENDPOINT.rstrip("/")
            endpoint = base_endpoint if base_endpoint.endswith("/chat/completions") else f"{base_endpoint}/chat/completions"
        elif settings.GCP_PROJECT_ID:
            loc = settings.GCP_LOCATION or "us-central1"
            endpoint = f"https://{loc}-aiplatform.googleapis.com/v1beta1/projects/{settings.GCP_PROJECT_ID}/locations/{loc}/endpoints/openapi/chat/completions"
        else:
            endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

        headers = {"Content-Type": "application/json"}
        if settings.LLM_API_KEY:
            headers["Authorization"] = f"Bearer {settings.LLM_API_KEY}"

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                endpoint,
                headers=headers,
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": question},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2048,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    @classmethod
    async def forget(cls, project: str, source: str, session_id: str | None = None) -> dict:
        target_name = _dataset_name(project)
        try:
            datasets = await cognee.datasets.list_datasets()
            target_ds = next((dataset for dataset in datasets if dataset.name == target_name), None)

            if target_ds:
                data_items = await cognee.datasets.list_data(target_ds.id)
                item_to_delete = next(
                    (item for item in data_items if str(item.id) == source or getattr(item, "name", "") == source),
                    None,
                )

                if item_to_delete:
                    await cognee.datasets.delete_data(dataset_id=target_ds.id, data_id=item_to_delete.id)
                    return {"status": "ok", "dataset": target_name, "forgot": source, "session_id": session_id}

            return {"status": "not_found", "dataset": target_name, "forgot": source}
        except Exception as exc:
            return {"status": "error", "error": str(exc)}

    @classmethod
    async def improve(cls, project: str, feedback: str | None = None, session_ids: list[str] | None = None) -> dict:
        kwargs: dict[str, Any] = {"dataset": _dataset_name(project)}
        if feedback:
            kwargs["data"] = feedback
        if session_ids:
            kwargs["session_ids"] = session_ids
        await cognee.improve(**kwargs)
        return {"status": "ok", "dataset": _dataset_name(project), "session_ids": session_ids}

    @classmethod
    async def create_triplet_embeddings(cls, project: str) -> dict:
        from cognee.memify_pipelines.create_triplet_embeddings import create_triplet_embeddings
        from cognee.modules.users.methods import get_default_user

        user = await get_default_user()
        await create_triplet_embeddings(user=user, dataset=_dataset_name(project))
        return {"status": "ok", "dataset": _dataset_name(project)}

    @classmethod
    async def consolidate_entities(cls, project: str) -> dict:
        from cognee.memify_pipelines.consolidate_entity_descriptions import consolidate_entity_descriptions_pipeline

        await consolidate_entity_descriptions_pipeline()
        return {"status": "ok", "dataset": _dataset_name(project)}

    @classmethod
    async def list_sources(cls, project: str) -> list[dict[str, Any]]:
        try:
            target_name = _dataset_name(project)
            datasets = await cognee.datasets.list_datasets()
            target_ds = next((dataset for dataset in datasets if dataset.name == target_name), None)

            if not target_ds:
                return []

            data_items = await cognee.datasets.list_data(target_ds.id)

            sources = []
            for item in data_items:
                name = getattr(item, "name", None) or str(item.id)
                sources.append({
                    "id": str(item.id),
                    "name": name,
                    "type": getattr(item, "data_type", "document"),
                    "status": "indexed",
                })
            return sources
        except Exception:
            return []
