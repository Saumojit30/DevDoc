"""
Dev-Doc Copilot Starter Script
==============================
Combines Cognee CodeGraph + Documentation Intelligence
into a single project-scoped knowledge graph.

Prerequisites:
    pip install cognee[codegraph]
    export OPENAI_API_KEY="sk-..."

Usage:
    python dev_doc_copilot_starter.py
"""

import asyncio
import os

import cognee
from cognee.api.v1.cognify.code_graph_pipeline import run_code_graph_pipeline
from cognee.modules.search.types import SearchType

# ---------------------------------------------------------------------------
# 1. CONFIGURATION
# ---------------------------------------------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise EnvironmentError("Please set OPENAI_API_KEY")

# Every project gets its own dataset so contexts never leak.
PROJECT_DATASET = "project-dev-copilot-demo"

# Example sources: swap these with your actual docs / repo paths.
DOC_URLS = [
    "https://docs.cognee.ai/how-to-guides/cognee-sdk/deployment/docker",
    "https://docs.cognee.ai/core-concepts/main-operations/remember",
    "https://docs.cognee.ai/core-concepts/main-operations/recall",
]

LOCAL_DOC_FILES = [
    # "./docs/openapi.json",
    # "./docs/README.md",
]

CODE_REPO_PATH = "./sample-repo"  # Path to a local Python repo

# ---------------------------------------------------------------------------
# 2. INGEST DOCUMENTATION
# ---------------------------------------------------------------------------
async def ingest_docs():
    """
    Ingest URLs and local files into the project dataset.
    Cognee chunks, embeds, and builds a vector + graph index.
    """
    print("[1/3] Ingesting documentation...")

    # URLs
    if DOC_URLS:
        await cognee.remember(
            DOC_URLS,
            dataset_name=PROJECT_DATASET,
        )

    # Local files
    if LOCAL_DOC_FILES:
        await cognee.remember(
            LOCAL_DOC_FILES,
            dataset_name=PROJECT_DATASET,
        )

    print("[1/3] Docs ingested.")

# ---------------------------------------------------------------------------
# 3. INGEST CODE (CodeGraph)
# ---------------------------------------------------------------------------
async def ingest_code():
    """
    Run the CodeGraph pipeline on a Python repo.
    Extracts functions, classes, modules, imports, and call graphs.
    """
    print("[2/3] Running CodeGraph pipeline...")

    if not os.path.exists(CODE_REPO_PATH):
        print(f"    Skipping: {CODE_REPO_PATH} does not exist. "
              "Clone a Python repo there first, or change CODE_REPO_PATH.")
        return

    await run_code_graph_pipeline(
        repo_path=CODE_REPO_PATH,
        dataset_name=PROJECT_DATASET,
    )

    print("[2/3] CodeGraph ingested.")

# ---------------------------------------------------------------------------
# 4. QUERY
# ---------------------------------------------------------------------------
async def query_copilot():
    """
    Query the unified knowledge graph.
    GRAPH_COMPLETION traverses both doc nodes and code nodes.
    """
    print("[3/3] Querying the project graph...")

    questions = [
        "How do I deploy Cognee using Docker?",
        "What does the remember function do?",
        "Where is the main entry point of the codebase?",
    ]

    for q in questions:
        print(f"\nQ: {q}")
        answer = await cognee.recall(
            query_type=SearchType.GRAPH_COMPLETION,
            query_text=q,
            datasets=[PROJECT_DATASET],
        )
        print(f"A: {answer}")

    # -----------------------------------------------------------------------
    # 5. RAW CONTEXT (for power users / custom LLM prompts)
    # -----------------------------------------------------------------------
    print("\n--- Raw graph context (only_context=True) ---")
    raw_context = await cognee.recall(
        query_type=SearchType.GRAPH_COMPLETION,
        query_text="How do I deploy Cognee using Docker?",
        datasets=[PROJECT_DATASET],
        only_context=True,
    )
    print(f"Retrieved nodes: {len(raw_context)}")
    # Feed raw_context into your own prompt template if needed.

# ---------------------------------------------------------------------------
# 6. MEMORY MANAGEMENT (forget / improve)
# ---------------------------------------------------------------------------
async def manage_memory():
    """
    Examples of surgical memory management.
    """
    # Remove a specific document from the graph
    # await cognee.forget("https://docs.cognee.ai/core-concepts/main-operations/remember")

    # Enrich the graph based on feedback (e.g., thumbs up on a good answer)
    # await cognee.improve("The Docker deployment answer was helpful")
    pass

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
async def main():
    await ingest_docs()
    await ingest_code()
    await query_copilot()
    await manage_memory()
    print("\n✅ Done. All docs and code live in the same project graph.")

if __name__ == "__main__":
    asyncio.run(main())
