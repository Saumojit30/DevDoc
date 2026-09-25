"""
Unit and Integration Tests for Deep Graph-RAG Subgraph Query Engine.
Verifies symbol lookup, 1st and 2nd degree neighbor expansion,
grounded prompt assembly, and structured source retrieval.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

if "cognee" not in sys.modules:
    try:
        import cognee
    except ImportError:
        mock_cognee = MagicMock()
        mock_cognee.recall = AsyncMock(return_value=[{"text": "Sample recall text", "source": "src/auth.py", "type": "doc"}])
        sys.modules["cognee"] = mock_cognee
        sys.modules["cognee.infrastructure"] = MagicMock()
        sys.modules["cognee.infrastructure.databases"] = MagicMock()
        sys.modules["cognee.infrastructure.databases.graph"] = MagicMock()

from cognee_service import (
    CogneeService,
    expand_subgraph_context,
    format_graph_rag_context,
    load_ast_graph,
    save_ast_graph,
)
from config import settings


class TestSubgraphQueryEngine(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.dataset = "test_subgraph_proj"
        self.orig_data_dir = settings.DATA_DIR
        settings.DATA_DIR = Path(self.temp_dir.name)

        # Build a rich test AST graph
        # Structure:
        # module: file://src/auth.py
        #   - Authenticator (Class) [L10-L60]
        #       - verify_token (Method) [L20-L40]
        #           calls: decode_jwt (in src/crypto.py)
        # module: file://src/crypto.py
        #   - decode_jwt (Function) [L15-L35]
        # module: file://src/routes.py
        #   - login_handler (Function) [L5-L25]
        #       calls: verify_token
        #       imports: src/auth.py
        self.sample_nodes = [
            {
                "id": "file://src/auth.py",
                "label": "auth.py",
                "type": "Module",
                "source": "src/auth.py",
                "properties": {
                    "name": "auth.py",
                    "file_path": "src/auth.py",
                    "symbol_type": "module",
                    "start_line": 1,
                    "end_line": 60,
                },
            },
            {
                "id": "src/auth.py::Authenticator",
                "label": "Authenticator",
                "type": "Class",
                "source": "src/auth.py",
                "properties": {
                    "name": "Authenticator",
                    "file_path": "src/auth.py",
                    "symbol_type": "class",
                    "start_line": 10,
                    "end_line": 60,
                    "docstring": "Handles authentication sessions and token verification.",
                    "extends": ["BaseAuth"],
                },
            },
            {
                "id": "src/auth.py::Authenticator.verify_token",
                "label": "verify_token",
                "type": "Method",
                "source": "src/auth.py",
                "properties": {
                    "name": "verify_token",
                    "file_path": "src/auth.py",
                    "symbol_type": "method",
                    "parent": "Authenticator",
                    "start_line": 20,
                    "end_line": 40,
                    "signature": "def verify_token(self, token: str) -> bool",
                    "docstring": "Validates the given JWT token.",
                    "callers": ["src/routes.py::login_handler"],
                    "callees": ["src/crypto.py::decode_jwt"],
                },
            },
            {
                "id": "file://src/crypto.py",
                "label": "crypto.py",
                "type": "Module",
                "source": "src/crypto.py",
                "properties": {
                    "name": "crypto.py",
                    "file_path": "src/crypto.py",
                    "symbol_type": "module",
                    "start_line": 1,
                    "end_line": 40,
                },
            },
            {
                "id": "src/crypto.py::decode_jwt",
                "label": "decode_jwt",
                "type": "Function",
                "source": "src/crypto.py",
                "properties": {
                    "name": "decode_jwt",
                    "file_path": "src/crypto.py",
                    "symbol_type": "function",
                    "start_line": 15,
                    "end_line": 35,
                    "signature": "def decode_jwt(raw: str) -> dict",
                    "docstring": "Cryptographically decodes and verifies a JWT payload.",
                    "callers": ["src/auth.py::Authenticator.verify_token"],
                },
            },
            {
                "id": "file://src/routes.py",
                "label": "routes.py",
                "type": "Module",
                "source": "src/routes.py",
                "properties": {
                    "name": "routes.py",
                    "file_path": "src/routes.py",
                    "symbol_type": "module",
                    "start_line": 1,
                    "end_line": 50,
                },
            },
            {
                "id": "src/routes.py::login_handler",
                "label": "login_handler",
                "type": "Function",
                "source": "src/routes.py",
                "properties": {
                    "name": "login_handler",
                    "file_path": "src/routes.py",
                    "symbol_type": "function",
                    "start_line": 5,
                    "end_line": 25,
                    "signature": "async def login_handler(request: Request) -> Response",
                    "docstring": "HTTP endpoint handler for user login.",
                    "callees": ["src/auth.py::Authenticator.verify_token"],
                },
            },
        ]

        self.sample_edges = [
            # DEFINES & CONTAINS
            {"source": "file://src/auth.py", "target": "src/auth.py::Authenticator", "relation": "DEFINES"},
            {"source": "src/auth.py::Authenticator", "target": "src/auth.py::Authenticator.verify_token", "relation": "CONTAINS"},
            {"source": "file://src/crypto.py", "target": "src/crypto.py::decode_jwt", "relation": "DEFINES"},
            {"source": "file://src/routes.py", "target": "src/routes.py::login_handler", "relation": "DEFINES"},
            # CALLS
            {"source": "src/routes.py::login_handler", "target": "src/auth.py::Authenticator.verify_token", "relation": "CALLS"},
            {"source": "src/auth.py::Authenticator.verify_token", "target": "src/crypto.py::decode_jwt", "relation": "CALLS"},
            # IMPORTS
            {"source": "file://src/routes.py", "target": "file://src/auth.py", "relation": "IMPORTS"},
        ]

        save_ast_graph(self.dataset, self.sample_nodes, self.sample_edges)

    def tearDown(self):
        settings.DATA_DIR = self.orig_data_dir
        self.temp_dir.cleanup()

    def test_expand_subgraph_direct_symbol_match(self):
        # Query asking specifically about Authenticator
        seeds, expanded_nodes, expanded_edges = expand_subgraph_context(
            dataset=self.dataset,
            query_text="How does Authenticator authenticate users?",
        )

        seed_ids = [s["id"] for s in seeds]
        self.assertIn("src/auth.py::Authenticator", seed_ids)

        expanded_ids = {n["id"] for n in expanded_nodes}
        # 1st degree: Authenticator CONTAINS verify_token, DEFINED by auth.py
        self.assertIn("src/auth.py::Authenticator.verify_token", expanded_ids)
        self.assertIn("file://src/auth.py", expanded_ids)

        # 2nd degree: verify_token CALLS decode_jwt, CALLED BY login_handler
        self.assertIn("src/crypto.py::decode_jwt", expanded_ids)
        self.assertIn("src/routes.py::login_handler", expanded_ids)

        # Edges should connect the subgraph
        edge_pairs = [(e["source"], e["target"], e["relation"]) for e in expanded_edges]
        self.assertIn(("src/auth.py::Authenticator", "src/auth.py::Authenticator.verify_token", "CONTAINS"), edge_pairs)
        self.assertIn(("src/auth.py::Authenticator.verify_token", "src/crypto.py::decode_jwt", "CALLS"), edge_pairs)

    def test_expand_subgraph_caller_callee_chain(self):
        # Query asking about login_handler
        seeds, expanded_nodes, expanded_edges = expand_subgraph_context(
            dataset=self.dataset,
            query_text="Where is login_handler implemented?",
        )

        seed_ids = [s["id"] for s in seeds]
        self.assertIn("src/routes.py::login_handler", seed_ids)

        expanded_ids = {n["id"] for n in expanded_nodes}
        # 1st degree: verify_token (callee of login_handler)
        self.assertIn("src/auth.py::Authenticator.verify_token", expanded_ids)
        # 2nd degree: decode_jwt (callee of verify_token)
        self.assertIn("src/crypto.py::decode_jwt", expanded_ids)

    def test_expand_subgraph_empty_when_no_graph(self):
        seeds, expanded_nodes, expanded_edges = expand_subgraph_context(
            dataset="non_existent_dataset",
            query_text="Something random",
        )
        self.assertEqual(seeds, [])
        self.assertEqual(expanded_nodes, [])
        self.assertEqual(expanded_edges, [])

    def test_format_graph_rag_context(self):
        seeds, expanded_nodes, expanded_edges = expand_subgraph_context(
            dataset=self.dataset,
            query_text="Tell me about verify_token and decode_jwt",
        )

        formatted = format_graph_rag_context(
            recalled_text="JWT authentication documentation.",
            seed_nodes=seeds,
            subgraph_nodes=expanded_nodes,
            subgraph_edges=expanded_edges,
        )

        # Check citations and line ranges format [file_path#Lstart-Lend]
        self.assertIn("File: `src/auth.py`", formatted)
        self.assertIn("[src/auth.py#L20-L40]", formatted)
        self.assertIn("def verify_token(self, token: str) -> bool", formatted)
        self.assertIn("Validates the given JWT token.", formatted)
        self.assertIn("Callers (Invoked By):", formatted)
        self.assertIn("Callees (Invokes):", formatted)
        self.assertIn("login_handler", formatted)
        self.assertIn("decode_jwt", formatted)
        self.assertIn("JWT authentication documentation.", formatted)


    def test_expand_subgraph_with_recalled_sources_boosting(self):
        # Even with generic query, recalled source should boost the seed
        seeds, expanded_nodes, _ = expand_subgraph_context(
            dataset=self.dataset,
            query_text="How does the system work?",
            recalled_sources=["src/crypto.py"],
        )
        self.assertTrue(len(seeds) > 0)
        seed_ids = [s["id"] for s in seeds]
        self.assertTrue(any("crypto.py" in sid for sid in seed_ids))

    def test_expand_subgraph_fallback_to_top_level(self):
        # Query with words not matching any symbol
        seeds, expanded_nodes, _ = expand_subgraph_context(
            dataset=self.dataset,
            query_text="xyz12345 non_existent_gibberish",
        )
        self.assertTrue(len(seeds) > 0)
        # Should fallback to top-level classes or modules
        self.assertTrue(any(s.get("type") in {"Class", "Module", "Function"} for s in seeds))

    def test_expand_subgraph_node_limit_budget(self):
        # Setting max_total_nodes to 3 should strictly limit expanded nodes
        seeds, expanded_nodes, _ = expand_subgraph_context(
            dataset=self.dataset,
            query_text="Authenticator verify_token",
            max_seeds=2,
            max_total_nodes=3,
        )
        self.assertLessEqual(len(expanded_nodes), 3)

    def test_format_graph_rag_context_empty_graph(self):
        formatted = format_graph_rag_context(
            recalled_text="Some recalled memory chunk",
            seed_nodes=[],
            subgraph_nodes=[],
            subgraph_edges=[],
        )
        self.assertIn("Some recalled memory chunk", formatted)
        self.assertNotIn("Deep AST Knowledge Graph", formatted)


class TestCogneeServiceChatIntegration(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.dataset_raw = "subgraph_chat_proj"
        self.dataset = f"project_{self.dataset_raw}"
        self.orig_data_dir = settings.DATA_DIR
        settings.DATA_DIR = Path(self.temp_dir.name)

        nodes = [
            {
                "id": "file://app/calc.py",
                "label": "calc.py",
                "type": "Module",
                "source": "app/calc.py",
                "properties": {"name": "calc.py", "file_path": "app/calc.py", "start_line": 1, "end_line": 20},
            },
            {
                "id": "app/calc.py::add_numbers",
                "label": "add_numbers",
                "type": "Function",
                "source": "app/calc.py",
                "properties": {
                    "name": "add_numbers",
                    "file_path": "app/calc.py",
                    "symbol_type": "function",
                    "start_line": 5,
                    "end_line": 12,
                    "signature": "def add_numbers(a: int, b: int) -> int",
                    "docstring": "Returns sum of two integers.",
                },
            },
        ]
        edges = [
            {"source": "file://app/calc.py", "target": "app/calc.py::add_numbers", "relation": "DEFINES"}
        ]
        save_ast_graph(self.dataset, nodes, edges)

    def tearDown(self):
        settings.DATA_DIR = self.orig_data_dir
        self.temp_dir.cleanup()

    async def test_chat_only_context_returns_grounded_subgraph(self):
        res = await CogneeService.chat(
            project=self.dataset_raw,
            question="What does add_numbers do?",
            only_context=True,
        )

        self.assertEqual(res["role"], "assistant")
        self.assertIn("add_numbers", res["content"])
        self.assertIn("[app/calc.py#L5-L12]", res["content"])
        self.assertIn("def add_numbers(a: int, b: int) -> int", res["content"])

        # Check structured source nodes
        sources = res["sources"]
        self.assertGreaterEqual(len(sources), 1)
        add_src = next((s for s in sources if s["name"] == "add_numbers"), None)
        self.assertIsNotNone(add_src)
        self.assertEqual(add_src["type"], "function")
        self.assertEqual(add_src["start_line"], 5)
        self.assertEqual(add_src["end_line"], 12)
        self.assertEqual(add_src["signature"], "def add_numbers(a: int, b: int) -> int")

    async def test_chat_full_llm_execution_grounded_citations(self):
        with patch.object(CogneeService, "_call_llm", new=AsyncMock(return_value="The `add_numbers` function in `[app/calc.py#L5-L12]` adds two numbers.")):
            res = await CogneeService.chat(
                project=self.dataset_raw,
                question="Explain add_numbers",
                only_context=False,
            )
            self.assertEqual(res["role"], "assistant")
            self.assertIn("[app/calc.py#L5-L12]", res["content"])
            self.assertGreaterEqual(len(res["sources"]), 1)
            self.assertIn("subgraph", res)
            self.assertEqual(res["subgraph"]["nodes"], 2)


if __name__ == "__main__":
    unittest.main()
