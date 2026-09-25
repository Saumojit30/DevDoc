"""
Unit and Integration Tests for Phase 2:
Multi-Language AST Extraction, Symbol Table Resolution, and Incremental Manifest Tracking.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from unittest.mock import AsyncMock, MagicMock

if "cognee" not in sys.modules:
    try:
        import cognee
    except ImportError:
        mock_cognee = MagicMock()
        mock_graph_engine = AsyncMock()
        mock_graph_engine.get_graph_data = AsyncMock(return_value=([], []))
        mock_cognee.infrastructure.databases.graph.get_graph_engine = AsyncMock(return_value=mock_graph_engine)
        sys.modules["cognee"] = mock_cognee
        sys.modules["cognee.infrastructure"] = MagicMock()
        sys.modules["cognee.infrastructure.databases"] = MagicMock()
        sys.modules["cognee.infrastructure.databases.graph"] = MagicMock()
        sys.modules["cognee.api"] = MagicMock()
        sys.modules["cognee.api.v1"] = MagicMock()
        sys.modules["cognee.api.v1.cognify"] = MagicMock()
        sys.modules["cognee.api.v1.cognify.code_graph_pipeline"] = MagicMock()

from ast_parser import ASTParser, FileASTResult, GoRustExtractor, PythonASTExtractor, TypeScriptExtractor
from cognee_service import CogneeService, load_ast_graph, save_ast_graph
from config import settings
from manifest_manager import ManifestDelta, ManifestManager
from symbol_table import SymbolTable


class TestPythonASTExtractor(unittest.TestCase):
    def test_parse_python_class_and_methods(self):
        py_code = '''"""Module docstring for test."""
import os
from pathlib import Path
from math import sqrt as square_root

@decorator_a
class Calculator:
    """Calculator docstring."""
    def __init__(self, base: int = 0):
        self.base = base
        self.log_init()

    def log_init(self):
        print("Initialized")

    @classmethod
    async def add(cls, a: int, b: int) -> int:
        """Add two numbers."""
        return a + b
'''
        res = PythonASTExtractor.parse("calc.py", py_code)
        self.assertEqual(res.language, "python")
        self.assertEqual(len(res.imports), 3)

        # Check imports
        imp_modules = [imp.module for imp in res.imports]
        self.assertIn("os", imp_modules)
        self.assertIn("pathlib", imp_modules)
        self.assertIn("math", imp_modules)

        # Check symbols
        names = [s.name for s in res.symbols]
        self.assertIn("calc", names)  # module
        self.assertIn("Calculator", names)
        self.assertIn("__init__", names)
        self.assertIn("log_init", names)
        self.assertIn("add", names)

        # Check class symbol
        calc_sym = next(s for s in res.symbols if s.name == "Calculator")
        self.assertEqual(calc_sym.symbol_type, "class")
        self.assertEqual(calc_sym.docstring, "Calculator docstring.")
        self.assertIn("decorator_a", calc_sym.decorators)

        # Check method symbol
        add_sym = next(s for s in res.symbols if s.name == "add")
        self.assertEqual(add_sym.symbol_type, "method")
        self.assertEqual(add_sym.parent, "Calculator")
        self.assertIn("async def add", add_sym.signature)
        self.assertEqual(add_sym.docstring, "Add two numbers.")

        # Check call extraction
        init_sym = next(s for s in res.symbols if s.name == "__init__")
        self.assertIn("log_init", init_sym.calls)

    def test_python_posonly_and_defaults(self):
        py_code = '''def complex_func(x: int, /, y: int = 10, *args: str, z: bool = True, **kwargs: float) -> str:
    """A complex signature test."""
    return f"{x}_{y}"
'''
        res = PythonASTExtractor.parse("complex.py", py_code)
        sym = next(s for s in res.symbols if s.name == "complex_func")
        self.assertIn("x: int", sym.signature)
        self.assertIn("/", sym.signature)
        self.assertIn("y: int = 10", sym.signature)
        self.assertIn("*args", sym.signature)
        self.assertIn("z: bool = True", sym.signature)
        self.assertIn("**kwargs", sym.signature)
        self.assertIn("-> str", sym.signature)


class TestTypeScriptExtractor(unittest.TestCase):
    def test_parse_typescript_components_and_imports(self):
        ts_code = '''/**
 * User service module.
 */
import { useState, useEffect as useMount } from 'react';
import axios from 'axios';
import { ApiClient } from './client';

export interface UserProps {
    id: string;
    name: string;
}

export class UserService extends BaseService {
    constructor(private client: ApiClient) {
        super();
    }

    public async getUser(id: string): Promise<UserProps> {
        return this.client.get(`/users/${id}`);
    }
}

export const fetchProfile = async (userId: string): Promise<void> => {
    console.log(userId);
};
'''
        res = TypeScriptExtractor.parse("src/services/user.ts", ts_code)
        self.assertEqual(res.language, "typescript")
        self.assertGreaterEqual(len(res.imports), 3)

        # Check imports
        mod_names = [imp.module for imp in res.imports]
        self.assertIn("react", mod_names)
        self.assertIn("axios", mod_names)
        self.assertIn("./client", mod_names)

        # Check relative import flags
        rel_imp = next(imp for imp in res.imports if imp.module == "./client")
        self.assertTrue(rel_imp.is_relative)

        # Check symbols
        names = [s.name for s in res.symbols]
        self.assertIn("UserProps", names)
        self.assertIn("UserService", names)
        self.assertIn("getUser", names)
        self.assertIn("fetchProfile", names)

        # Check interface
        iface = next(s for s in res.symbols if s.name == "UserProps")
        self.assertEqual(iface.symbol_type, "interface")

        # Check class
        cls_sym = next(s for s in res.symbols if s.name == "UserService")
        self.assertEqual(cls_sym.symbol_type, "class")
        self.assertIn("BaseService", cls_sym.extends)

        # Check arrow function
        arrow_fn = next(s for s in res.symbols if s.name == "fetchProfile")
        self.assertEqual(arrow_fn.symbol_type, "function")

    def test_multiline_ts_import_and_functions(self):
        ts_code = '''
import {
    Alpha,
    Beta as Gamma,
    Delta
} from './deep/module';

export async function processComplexItem(
    itemId: string,
    options: {
        verbose: boolean;
        retryCount?: number;
    }
): Promise<boolean> {
    return true;
}

export const executeTask = async (
    taskId: string,
    payload: Record<string, any>
): Promise<void> => {
    console.log(taskId);
};
'''
        res = TypeScriptExtractor.parse("src/complex.ts", ts_code)
        self.assertEqual(len(res.imports), 1)
        self.assertEqual(res.imports[0].module, "./deep/module")
        self.assertEqual(res.imports[0].imported_symbols, ["Alpha", "Beta", "Delta"])
        self.assertEqual(res.imports[0].alias_map, {"Beta": "Gamma"})

        fn_names = [s.name for s in res.symbols]
        self.assertIn("processComplexItem", fn_names)
        self.assertIn("executeTask", fn_names)


class TestGoRustExtractor(unittest.TestCase):
    def test_parse_go_code(self):
        go_code = '''package auth

import (
    "fmt"
    "net/http"
)

type Session struct {
    Token string
}

type Authenticator interface {
    Verify(token string) bool
}

func (s *Session) IsValid() bool {
    return len(s.Token) > 0
}

func NewSession(token string) *Session {
    return &Session{Token: token}
}
'''
        res = GoRustExtractor.parse_go("auth/session.go", go_code)
        self.assertEqual(res.language, "go")
        self.assertEqual(res.module_name, "auth")

        names = [s.name for s in res.symbols]
        self.assertIn("Session", names)
        self.assertIn("Authenticator", names)
        self.assertIn("IsValid", names)
        self.assertIn("NewSession", names)

        method = next(s for s in res.symbols if s.name == "IsValid")
        self.assertEqual(method.symbol_type, "method")
        self.assertEqual(method.parent, "Session")

    def test_parse_rust_code(self):
        rust_code = '''use std::sync::Arc;
use crate::config::AppConfig;

pub struct Server {
    config: AppConfig,
}

pub trait Service {
    fn start(&self);
}

impl Service for Server {
    pub async fn start(&self) {
        println!("Starting server");
    }
}
'''
        res = GoRustExtractor.parse_rust("src/server.rs", rust_code)
        self.assertEqual(res.language, "rust")

        names = [s.name for s in res.symbols]
        self.assertIn("Server", names)
        self.assertIn("Service", names)
        self.assertIn("start", names)


class TestSymbolTableResolution(unittest.TestCase):
    def test_cross_file_resolution(self):
        # File A: utils.py
        code_utils = '''def format_name(first: str, last: str) -> str:
    return f"{first} {last}"
'''
        # File B: main.py
        code_main = '''from utils import format_name

class GreetingService:
    def greet(self, first: str, last: str) -> str:
        full = format_name(first, last)
        return f"Hello, {full}!"
'''
        res_utils = PythonASTExtractor.parse("src/utils.py", code_utils)
        res_main = PythonASTExtractor.parse("src/main.py", code_main)

        st = SymbolTable(dataset_name="test_proj")
        st.add_file_result(res_utils)
        st.add_file_result(res_main)

        nodes, edges = st.build_graph()

        # Check nodes
        node_ids = {n["id"] for n in nodes}
        self.assertIn("file://src/utils.py", node_ids)
        self.assertIn("src/utils.py::format_name", node_ids)
        self.assertIn("file://src/main.py", node_ids)
        self.assertIn("src/main.py::GreetingService", node_ids)
        self.assertIn("src/main.py::GreetingService.greet", node_ids)

        # Check edges
        edge_relations = {(e["source"], e["target"], e["relation"]) for e in edges}

        # Module DEFINES top level
        self.assertIn(("file://src/utils.py", "src/utils.py::format_name", "DEFINES"), edge_relations)
        self.assertIn(("file://src/main.py", "src/main.py::GreetingService", "DEFINES"), edge_relations)

        # Class CONTAINS method
        self.assertIn(("src/main.py::GreetingService", "src/main.py::GreetingService.greet", "CONTAINS"), edge_relations)

        # Cross-file IMPORTS
        self.assertIn(("file://src/main.py", "file://src/utils.py", "IMPORTS"), edge_relations)

        # Method CALLS function
        self.assertIn(("src/main.py::GreetingService.greet", "src/utils.py::format_name", "CALLS"), edge_relations)

    def test_relative_import_resolution(self):
        code_helper = "def helper(): pass\n"
        code_sub = "from ..helper import helper\n"
        res_helper = PythonASTExtractor.parse("src/helper.py", code_helper)
        res_sub = PythonASTExtractor.parse("src/nested/sub.py", code_sub)

        st = SymbolTable(dataset_name="test_rel")
        st.add_file_result(res_helper)
        st.add_file_result(res_sub)

        target = st.resolve_target_file("src/nested/sub.py", res_sub.imports[0])
        self.assertEqual(target, "src/helper.py")


class TestCogneeServiceSanity(unittest.TestCase):
    def test_skip_repo_dirs_defined(self):
        from cognee_service import SKIP_REPO_DIRS
        self.assertIn(".git", SKIP_REPO_DIRS)
        self.assertIn("node_modules", SKIP_REPO_DIRS)
        self.assertIn("venv", SKIP_REPO_DIRS)


class TestManifestManager(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.dataset = "test_manifest_ds"
        settings.DATA_DIR = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_incremental_delta(self):
        f1 = Path(self.temp_dir.name) / "file1.py"
        f2 = Path(self.temp_dir.name) / "file2.py"
        f1.write_text("print('hello')", encoding="utf-8")
        f2.write_text("print('world')", encoding="utf-8")

        # Initial indexing -> all added
        delta1 = ManifestManager.update_manifest(self.dataset, [f1, f2])
        self.assertEqual(len(delta1.added_files), 2)
        self.assertEqual(len(delta1.modified_files), 0)
        self.assertEqual(len(delta1.deleted_files), 0)
        self.assertTrue(delta1.has_changes)

        # Re-run with no modifications -> all unchanged
        delta2 = ManifestManager.update_manifest(self.dataset, [f1, f2])
        self.assertEqual(len(delta2.added_files), 0)
        self.assertEqual(len(delta2.modified_files), 0)
        self.assertEqual(len(delta2.unchanged_files), 2)
        self.assertFalse(delta2.has_changes)

        # Modify f1
        f1.write_text("print('hello modified')", encoding="utf-8")
        delta3 = ManifestManager.update_manifest(self.dataset, [f1, f2])
        self.assertEqual(len(delta3.modified_files), 1)
        self.assertEqual(len(delta3.unchanged_files), 1)
        self.assertTrue(delta3.has_changes)

        # Delete f2
        delta4 = ManifestManager.update_manifest(self.dataset, [f1])
        self.assertEqual(len(delta4.deleted_files), 1)
        self.assertTrue(delta4.has_changes)


class TestCogneeServiceASTIntegration(unittest.IsolatedAsyncioTestCase):
    async def test_ingest_code_ast_pipeline(self):
        with tempfile.TemporaryDirectory() as temp_repo:
            repo_path = Path(temp_repo)
            p1 = repo_path / "app.py"
            p1.write_text(
                '''def run_app():\n    """Start the application."""\n    return True\n''',
                encoding="utf-8",
            )

            res = await CogneeService.ingest_code("phase2_test", str(repo_path))
            self.assertEqual(res["status"], "ok")
            self.assertGreaterEqual(res["ast_nodes"], 2)
            self.assertIn("manifest_delta", res)

            # Check that AST graph is saved and loadable
            nodes, edges = load_ast_graph("project_phase2_test")
            self.assertGreaterEqual(len(nodes), 2)
            node_labels = [n["label"] for n in nodes]
            self.assertIn("run_app", node_labels)


if __name__ == "__main__":
    unittest.main()
