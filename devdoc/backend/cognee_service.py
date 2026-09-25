import asyncio
import os
import re
import shutil
import stat
import subprocess
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import cognee
from cognee.infrastructure.databases.graph import get_graph_engine

from config import settings
from ast_parser import ASTParser
from symbol_table import SymbolTable
from manifest_manager import ManifestManager
import json

def _ast_graph_path(dataset: str) -> Path:
    p = settings.DATA_DIR / "ast_graphs"
    p.mkdir(parents=True, exist_ok=True)
    return p / f"{dataset}.json"

def save_ast_graph(dataset: str, nodes: list[dict], edges: list[dict]) -> None:
    path = _ast_graph_path(dataset)
    temp = path.with_suffix(".tmp")
    with open(temp, "w", encoding="utf-8") as f:
        json.dump({"dataset": dataset, "nodes": nodes, "edges": edges}, f, indent=2)
    temp.replace(path)

def load_ast_graph(dataset: str) -> tuple[list[dict], list[dict]]:
    path = _ast_graph_path(dataset)
    if not path.exists():
        return [], []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("nodes", []), data.get("edges", [])
    except Exception:
        return [], []


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


def _extract_pdf_to_markdown(pdf_path: Path) -> tuple[Path, int]:
    try:
        import pypdf
        reader = pypdf.PdfReader(str(pdf_path))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                pass

        num_pages = len(reader.pages)
        pages_content = []
        for idx, page in enumerate(reader.pages, start=1):
            try:
                text = page.extract_text() or ""
            except Exception:
                text = ""
            text = text.strip()
            if text:
                pages_content.append(f"## Page {idx}\n\n{text}")

        content_body = "\n\n---\n\n".join(pages_content) if pages_content else "_No extractable text found in this PDF._"
        markdown_text = f"# Document: {pdf_path.name}\n\nTotal Pages: {num_pages}\n\n{content_body}"

        safe_stem = re.sub(r"[^a-zA-Z0-9._-]", "_", pdf_path.stem) or "document"
        out_name = f"pdf_{safe_stem}_{int(time.time() * 1000)}.md"
        out_path = settings.UPLOAD_DIR / out_name
        out_path.write_text(markdown_text, encoding="utf-8")
        return out_path, num_pages
    except Exception as exc:
        raise ValueError(f"Failed to extract text from PDF '{pdf_path.name}': {exc}") from exc


def expand_subgraph_context(
    dataset: str,
    query_text: str,
    recalled_sources: list[str] | None = None,
    max_seeds: int = 8,
    max_total_nodes: int = 30,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Looks up matched symbols in the AST graph for the dataset,
    and performs 1st and 2nd degree neighbor expansion across relations:
    CALLS, CALLED_BY, DEFINES, CONTAINS, IMPORTS, EXTENDS.
    
    Returns:
        (seed_nodes, all_expanded_nodes, all_expanded_edges)
    """
    ast_nodes, ast_edges = load_ast_graph(dataset)
    if not ast_nodes:
        return [], [], []

    node_map = {n["id"]: n for n in ast_nodes}
    
    adj_out: dict[str, list[dict[str, Any]]] = {n["id"]: [] for n in ast_nodes}
    adj_in: dict[str, list[dict[str, Any]]] = {n["id"]: [] for n in ast_nodes}
    
    for e in ast_edges:
        src = e.get("source")
        tgt = e.get("target")
        if src in adj_out and tgt in node_map:
            adj_out[src].append(e)
        if tgt in adj_in and src in node_map:
            adj_in[tgt].append(e)

    query_tokens = set(re.findall(r"[A-Za-z_][A-Za-z0-9_]*", query_text))
    query_lower = query_text.lower()

    scored_candidates: list[tuple[float, dict[str, Any]]] = []
    
    for n in ast_nodes:
        nid = n["id"]
        label = n.get("label", "")
        props = n.get("properties", {})
        file_path = props.get("file_path", "")
        docstring = props.get("docstring", "")
        score = 0.0

        if label in query_tokens:
            score += 15.0
        elif label.lower() in [t.lower() for t in query_tokens]:
            score += 10.0
        elif label.lower() in query_lower:
            score += 6.0

        file_stem = Path(file_path).stem if file_path else ""
        if file_stem and file_stem.lower() in query_lower:
            score += 5.0
        if file_path and file_path.lower() in query_lower:
            score += 7.0

        if recalled_sources:
            for s in recalled_sources:
                if s and (s in nid or s in file_path or (label and label in s)):
                    score += 8.0

        if docstring:
            doc_lower = docstring.lower()
            for t in query_tokens:
                if len(t) > 3 and t.lower() in doc_lower:
                    score += 2.0

        if score > 0.0:
            sym_type = props.get("symbol_type", "").lower()
            if sym_type in {"function", "method", "class", "interface", "struct"}:
                score += 1.0
            scored_candidates.append((score, n))

    scored_candidates.sort(key=lambda x: x[0], reverse=True)
    seeds = [cand[1] for cand in scored_candidates[:max_seeds]]

    if not seeds and recalled_sources:
        for s in recalled_sources:
            for n in ast_nodes:
                if s in n["id"] or s in n.get("properties", {}).get("file_path", ""):
                    seeds.append(n)
                    if len(seeds) >= max_seeds:
                        break
            if len(seeds) >= max_seeds:
                break

    if not seeds:
        for n in ast_nodes:
            if n.get("type") in {"Class", "Function", "Module"}:
                seeds.append(n)
                if len(seeds) >= 3:
                    break

    if not seeds:
        return [], [], []

    selected_node_ids: set[str] = set()
    first_degree_ids: set[str] = set()
    second_degree_ids: set[str] = set()

    for s in seeds:
        if len(selected_node_ids) >= max_total_nodes:
            break
        selected_node_ids.add(s["id"])

    # 1st Degree Expansion
    for s_id in list(selected_node_ids):
        if len(selected_node_ids) + len(first_degree_ids) >= max_total_nodes:
            break
        for out_edge in adj_out.get(s_id, []):
            tgt = out_edge.get("target")
            if tgt in node_map and tgt not in selected_node_ids:
                first_degree_ids.add(tgt)
                if len(selected_node_ids) + len(first_degree_ids) >= max_total_nodes:
                    break
        for in_edge in adj_in.get(s_id, []):
            src = in_edge.get("source")
            if src in node_map and src not in selected_node_ids:
                first_degree_ids.add(src)
                if len(selected_node_ids) + len(first_degree_ids) >= max_total_nodes:
                    break
        s_props = node_map.get(s_id, {}).get("properties", {})
        for ref_id in s_props.get("callers", []) + s_props.get("callees", []):
            if ref_id in node_map and ref_id not in selected_node_ids:
                first_degree_ids.add(ref_id)
                if len(selected_node_ids) + len(first_degree_ids) >= max_total_nodes:
                    break
        if s_props.get("parent"):
            parent_name = s_props["parent"]
            for nid, n in node_map.items():
                if (n.get("label") == parent_name or n.get("properties", {}).get("name") == parent_name) and nid not in selected_node_ids:
                    first_degree_ids.add(nid)
                    if len(selected_node_ids) + len(first_degree_ids) >= max_total_nodes:
                        break

    for f_id in first_degree_ids:
        if len(selected_node_ids) >= max_total_nodes:
            break
        selected_node_ids.add(f_id)

    # 2nd Degree Expansion
    for f_id in list(first_degree_ids):
        if len(selected_node_ids) + len(second_degree_ids) >= max_total_nodes:
            break
        for out_edge in adj_out.get(f_id, []):
            tgt = out_edge.get("target")
            if tgt in node_map and tgt not in selected_node_ids:
                second_degree_ids.add(tgt)
                if len(selected_node_ids) + len(second_degree_ids) >= max_total_nodes:
                    break
        for in_edge in adj_in.get(f_id, []):
            src = in_edge.get("source")
            if src in node_map and src not in selected_node_ids:
                second_degree_ids.add(src)
                if len(selected_node_ids) + len(second_degree_ids) >= max_total_nodes:
                    break
        f_props = node_map.get(f_id, {}).get("properties", {})
        for ref_id in f_props.get("callers", []) + f_props.get("callees", []):
            if ref_id in node_map and ref_id not in selected_node_ids:
                second_degree_ids.add(ref_id)
                if len(selected_node_ids) + len(second_degree_ids) >= max_total_nodes:
                    break

    for s_id in second_degree_ids:
        if len(selected_node_ids) >= max_total_nodes:
            break
        selected_node_ids.add(s_id)

    expanded_nodes = [node_map[nid] for nid in selected_node_ids if nid in node_map][:max_total_nodes]

    expanded_edges: list[dict[str, Any]] = []
    seen_edge_keys: set[tuple[str, str, str]] = set()
    for e in ast_edges:
        src = e.get("source")
        tgt = e.get("target")
        rel = e.get("relation", "")
        if src in selected_node_ids and tgt in selected_node_ids:
            key = (src, tgt, rel)
            if key not in seen_edge_keys:
                seen_edge_keys.add(key)
                expanded_edges.append(e)

    return seeds, expanded_nodes, expanded_edges


def format_graph_rag_context(
    recalled_text: str,
    seed_nodes: list[dict[str, Any]],
    subgraph_nodes: list[dict[str, Any]],
    subgraph_edges: list[dict[str, Any]],
) -> str:
    """
    Formats rich structural AST context for the LLM prompt including exact file paths,
    line ranges [file_path#Lstart-Lend], signatures, docstrings, caller/callee trees,
    and relationships.
    """
    sections: list[str] = []

    if subgraph_nodes:
        ast_lines: list[str] = ["### Deep AST Knowledge Graph & Subgraph Context:"]
        
        file_to_nodes: dict[str, list[dict[str, Any]]] = {}
        for n in subgraph_nodes:
            props = n.get("properties", {})
            fp = props.get("file_path") or n.get("source") or "unknown_file"
            file_to_nodes.setdefault(fp, []).append(n)

        for fp, fn_nodes in file_to_nodes.items():
            ast_lines.append(f"\n#### File: `{fp}`")
            for n in fn_nodes:
                props = n.get("properties", {})
                name = n.get("label") or props.get("name", "Symbol")
                stype = props.get("symbol_type") or n.get("type", "Symbol")
                start_l = props.get("start_line", 1)
                end_l = props.get("end_line", start_l)
                line_tag = f"[{fp}#L{start_l}-L{end_l}]" if start_l else f"[{fp}]"
                
                ast_lines.append(f"- **{name}** ({stype.capitalize()}) {line_tag}")
                if props.get("signature"):
                    ast_lines.append(f"  * Signature: `{props['signature']}`")
                if props.get("docstring"):
                    ast_lines.append(f"  * Docstring: {props['docstring']}")
                if props.get("parent"):
                    ast_lines.append(f"  * Enclosing Parent: `{props['parent']}`")
                if props.get("extends"):
                    ast_lines.append(f"  * Extends / Implements: {', '.join(props['extends'])}")
                
                callers = props.get("callers", [])
                if callers:
                    caller_labels = [c.split("::")[-1] for c in callers]
                    ast_lines.append(f"  * Callers (Invoked By): {', '.join(caller_labels)}")
                
                callees = props.get("callees", [])
                if callees:
                    callee_labels = [c.split("::")[-1] for c in callees]
                    ast_lines.append(f"  * Callees (Invokes): {', '.join(callee_labels)}")

        if subgraph_edges:
            ast_lines.append("\n#### Subgraph Structural Relationships:")
            for e in subgraph_edges:
                src_label = e.get("source", "").split("::")[-1].replace("file://", "")
                tgt_label = e.get("target", "").split("::")[-1].replace("file://", "")
                rel = e.get("relation", "RELATES_TO")
                ast_lines.append(f"- `{src_label}` --[{rel}]--> `{tgt_label}`")

        sections.append("\n".join(ast_lines))

    if recalled_text and recalled_text.strip():
        sections.append(f"### Cognee Semantic Memory & Retrieved Documentation:\n{recalled_text.strip()}")

    return "\n\n".join(sections) if sections else "No relevant codebase or documentation context found."


class CogneeService:
    @classmethod
    async def ingest_docs(cls, project: str, urls: list[str], files: list[Path], session_id: str | None = None) -> dict:
        ds = _dataset_name(project)
        ingested = {"urls": 0, "files": 0}
        logs: list[str] = []

        items = []
        if urls:
            items.extend(urls)
            logs.append(f"Queued {len(urls)} documentation URL(s)")

        parsed_files_count = 0
        if files:
            logs.append(f"Processing {len(files)} uploaded document file(s)...")
            for file_path in files:
                if file_path.suffix.lower() == ".pdf":
                    logs.append(f"Parsing PDF document page-by-page: {file_path.name}...")
                    parsed_md, page_count = _extract_pdf_to_markdown(file_path)
                    items.append(str(parsed_md))
                    logs.append(f"✓ Extracted {page_count} page(s) from {file_path.name} -> {parsed_md.name}")
                    parsed_files_count += 1
                else:
                    items.append(str(file_path))
                    parsed_files_count += 1
                    logs.append(f"Queued text/markdown file: {file_path.name}")

        if not items:
            return {"status": "ok", "dataset": ds, "ingested": ingested, "logs": ["No items to ingest."]}

        logs.append(f"Sending {len(items)} item(s) to Cognee memory pipeline in batches...")
        await _remember_in_batches(items, ds, session_id=session_id)
        
        logs.append(f"Tagging graph nodes with dataset metadata: '{ds}'...")
        await _tag_new_graph_nodes(ds)

        ingested["urls"] = len(urls)
        ingested["files"] = parsed_files_count
        logs.append(f"✓ Documentation ingestion complete: {ingested['files']} file(s), {ingested['urls']} URL(s) indexed.")

        return {
            "status": "ok",
            "dataset": ds,
            "ingested": ingested,
            "logs": logs,
            "session_id": session_id,
        }

    @classmethod
    async def ingest_url(cls, project: str, url: str, session_id: str | None = None) -> dict:
        import time

        import httpx
        import trafilatura

        ds = _dataset_name(project)
        logs: list[str] = [f"Fetching content from URL: {url}..."]
        text: str | None = None

        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            md_url = url.rstrip("/") + ".md"
            try:
                resp = await client.get(md_url)
                if resp.status_code == 200 and resp.text.strip().startswith(("# ", "> ")):
                    text = resp.text
                    logs.append("Discovered native Markdown stream directly from host.")
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

        logs.append(f"Successfully extracted markdown content ({len(text)} characters).")
        safe_name = url.rstrip("/").split("/")[-1] or "index"
        safe_name = "".join(char if char.isalnum() or char in "-_." else "_" for char in safe_name)
        filename = f"url_{int(time.time())}_{safe_name}.md"
        dest = settings.UPLOAD_DIR / filename
        dest.write_text(text, encoding="utf-8")

        try:
            logs.append(f"Ingesting into Cognee memory batches for dataset '{ds}'...")
            await _remember_in_batches([str(dest)], ds, session_id=session_id)
            logs.append(f"Tagging graph nodes with dataset '{ds}'...")
            await _tag_new_graph_nodes(ds)
            logs.append(f"✓ URL ingestion complete: {url}")
        finally:
            if dest.exists():
                try:
                    dest.unlink()
                except OSError:
                    pass

        return {
            "status": "ok",
            "dataset": ds,
            "url": url,
            "file": str(dest),
            "chars": len(text),
            "logs": logs,
            "session_id": session_id,
        }

    @classmethod
    async def ingest_code(cls, project: str, repo_path: str, clone_url: str | None = None, session_id: str | None = None) -> dict:
        ds = _dataset_name(project)
        logs: list[str] = []

        clean_path = (repo_path or "").strip().strip('"\'')
        subpath: str | None = None

        if not clean_path and not clone_url:
            raise ValueError("Repository path or local folder path cannot be empty.")

        if clone_url:
            norm_url, sub = _normalize_github_url(clone_url)
            clone_url = norm_url
            if sub:
                subpath = sub
            repo_name = _repo_dir_name(clone_url)
            clean_path = str(settings.UPLOAD_DIR / "repos" / repo_name)
            logs.append(f"Detected remote repository URL: {clone_url}")
        elif clean_path.startswith("http://") or clean_path.startswith("https://") or clean_path.startswith("git@"):
            clone_url, subpath = _normalize_github_url(clean_path)
            repo_name = _repo_dir_name(clone_url)
            clean_path = str(settings.UPLOAD_DIR / "repos" / repo_name)
            logs.append(f"Detected remote repository URL: {clone_url}")

        target_path = Path(clean_path).resolve()

        if clone_url:
            logs.append(f"Cloning remote repository into temporary workspace: {target_path.name}...")
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
                logs.append(f"Configuring sparse-checkout for subpath: {subpath}...")
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
            logs.append(f"✓ Repository clone successful.")
        else:
            logs.append(f"Validating local folder path: {target_path}")

        if not target_path.exists():
            raise FileNotFoundError(f"Directory or repository path does not exist: {target_path}")

        if not target_path.is_dir():
            raise NotADirectoryError(f"Specified path is not a directory: {target_path}")

        scan_path = target_path / subpath if subpath else target_path
        if not scan_path.exists():
            raise FileNotFoundError(f"Path within repository/folder does not exist: {scan_path}")

        logs.append(f"Scanning source files in '{scan_path}'...")
        code_files, stats = _collect_repo_files(scan_path)
        logs.append(f"Identified {stats['candidate_files']} candidate file(s); {stats['selected_files']} selected for AST parsing.")

        if not code_files:
            logs.append("No matching source code files found to index.")
            return {
                "status": "ok",
                "dataset": ds,
                "repo": str(target_path),
                "files_ingested": 0,
                "logs": logs,
                **stats,
            }

        # 1. Incremental Manifest Tracking
        delta = ManifestManager.update_manifest(ds, code_files)
        logs.append(
            f"Incremental manifest: {len(delta.added_files)} added, "
            f"{len(delta.modified_files)} modified, "
            f"{len(delta.deleted_files)} deleted, "
            f"{len(delta.unchanged_files)} unchanged."
        )

        # 2. Deep AST Multi-Language Parsing
        logs.append(f"Parsing AST and extracting symbols across {len(code_files)} code file(s)...")
        ast_results = ASTParser.parse_files(code_files)

        # 3. Global Symbol Table & Cross-File Resolution
        logs.append("Resolving cross-file imports, call graphs, and class hierarchies...")
        symbol_table = SymbolTable(dataset_name=ds)
        for r in ast_results:
            symbol_table.add_file_result(r)
        ast_nodes, ast_edges = symbol_table.build_graph()

        # 4. Save Deep AST Graph
        save_ast_graph(ds, ast_nodes, ast_edges)
        logs.append(f"✓ Generated {len(ast_nodes)} AST symbol nodes and {len(ast_edges)} cross-file edges (DEFINES, CONTAINS, IMPORTS, CALLS, EXTENDS).")

        # 5. Cognee Memory & CodeGraph Integration
        try:
            from cognee.api.v1.cognify.code_graph_pipeline import run_code_graph_pipeline
            logs.append("Building AST CodeGraph pipeline with Cognee...")
            await run_code_graph_pipeline(
                repo_path=str(scan_path),
                dataset_name=ds,
            )
            logs.append(f"Tagging Graph Nodes with dataset '{ds}'...")
            await _tag_new_graph_nodes(ds)
        except Exception as cg_err:
            logs.append(f"Notice: Cognee code graph pipeline completed with message: {cg_err}")

        logs.append(f"✓ Deep AST CodeGraph & Symbol Indexing complete: {len(code_files)} file(s) indexed.")

        return {
            "status": "ok",
            "dataset": ds,
            "repo": str(target_path),
            "files_ingested": len(code_files),
            "ast_nodes": len(ast_nodes),
            "ast_edges": len(ast_edges),
            "manifest_delta": {
                "added": len(delta.added_files),
                "modified": len(delta.modified_files),
                "deleted": len(delta.deleted_files),
                "unchanged": len(delta.unchanged_files),
            },
            "logs": logs,
            **stats,
            "session_id": session_id,
        }

    @classmethod
    async def chat(cls, project: str, question: str, only_context: bool = False, session_id: str | None = None) -> dict:
        project_safe = _dataset_name(project)
        kwargs: dict[str, Any] = {
            "query_text": question,
            "datasets": [project_safe],
            "only_context": only_context,
        }
        if session_id:
            kwargs["session_id"] = session_id

        # 1. Recall semantic memory chunks from Cognee
        recalled_raw = ""
        recalled_source_names = []
        doc_sources = []

        try:
            result = await cognee.recall(**kwargs)
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
                        recalled_source_names.append(src_id)
                        if not any(source["id"] == src_id for source in doc_sources):
                            doc_sources.append({"id": src_id, "name": src_id, "type": src_type, "source": ""})
                recalled_raw = "\n".join(texts)
            elif isinstance(result, dict):
                recalled_raw = result.get("text", str(result))
            elif hasattr(result, "text"):
                recalled_raw = result.text
            else:
                recalled_raw = str(result)
        except Exception:
            recalled_raw = ""

        # 2. Deep Graph-RAG Subgraph Expansion on AST Knowledge Graph
        seeds, expanded_nodes, expanded_edges = expand_subgraph_context(
            dataset=project_safe,
            query_text=question,
            recalled_sources=recalled_source_names,
            max_seeds=8,
            max_total_nodes=30,
        )

        # 3. Format Rich Grounded Context
        rag_context = format_graph_rag_context(
            recalled_text=recalled_raw,
            seed_nodes=seeds,
            subgraph_nodes=expanded_nodes,
            subgraph_edges=expanded_edges,
        )

        # 4. Assemble Structured Source Nodes for Frontend
        structured_sources: list[dict[str, Any]] = []
        seen_src_ids: set[str] = set()

        for n in expanded_nodes:
            nid = n["id"]
            if nid in seen_src_ids:
                continue
            seen_src_ids.add(nid)
            props = n.get("properties", {})
            fp = props.get("file_path") or n.get("source") or ""
            stype = (props.get("symbol_type") or n.get("type", "code")).lower()
            if stype in {"function", "method"}:
                s_category = "function"
            elif stype in {"class", "struct"}:
                s_category = "class"
            elif stype in {"module", "file", "codefile"}:
                s_category = "module"
            else:
                s_category = "code"

            start_l = props.get("start_line", 1)
            end_l = props.get("end_line", start_l)
            
            structured_sources.append({
                "id": nid,
                "name": n.get("label") or props.get("name", "Symbol"),
                "type": s_category,
                "source": fp,
                "file_path": fp,
                "start_line": start_l,
                "end_line": end_l,
                "line": start_l,
                "signature": props.get("signature", ""),
                "docstring": props.get("docstring", ""),
                "callers": props.get("callers", []),
                "callees": props.get("callees", []),
            })

        for s in doc_sources:
            sid = s["id"]
            if sid not in seen_src_ids:
                seen_src_ids.add(sid)
                structured_sources.append(s)

        if only_context:
            return {
                "role": "assistant",
                "content": rag_context,
                "sources": structured_sources,
                "session_id": session_id,
                "dataset": project_safe,
                "subgraph": {
                    "nodes": len(expanded_nodes),
                    "edges": len(expanded_edges),
                },
            }

        # 5. Call LLM with Grounded AST Context
        try:
            content = await cls._call_llm(question, rag_context)
        except Exception:
            content = (
                f"I retrieved the following structural knowledge graph context from the codebase:\n\n"
                f"{rag_context[:2500]}"
            )

        return {
            "role": "assistant",
            "content": content,
            "sources": structured_sources,
            "session_id": session_id,
            "dataset": project_safe,
            "subgraph": {
                "nodes": len(expanded_nodes),
                "edges": len(expanded_edges),
            },
        }

    @classmethod
    async def _call_llm(cls, question: str, context: str) -> str:
        import httpx

        model = settings.LLM_MODEL or "gemini-2.5-flash"
        if model.startswith("openai/"):
            model = model[len("openai/"):]

        system_prompt = (
            "You are DevDoc, an expert codebase intelligence engine powered by a Deep AST Knowledge Graph.\n"
            "Answer the user's question with deep architectural and code-level precision based on the provided Graph-RAG context.\n\n"
            "Rules for answering:\n"
            "1. Ground your answer in the AST knowledge graph symbols, class hierarchies, and call graphs.\n"
            "2. ALWAYS cite exact file locations and line ranges using citations in the format `[filepath#Lstart-Lend]` (e.g. `[src/auth.py#L42-L89]`).\n"
            "3. When explaining function or method logic, trace caller/callee paths and cross-module dependencies.\n"
            "4. If the context does not contain enough information to answer completely, state clearly what is known from the graph and what is missing.\n\n"
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
