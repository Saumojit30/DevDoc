import os
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from unittest.mock import MagicMock
if "cognee" not in sys.modules:
    try:
        import cognee
    except ImportError:
        mock_cognee = MagicMock()
        mock_graph_engine = MagicMock()
        mock_cognee.infrastructure.databases.graph.get_graph_engine = MagicMock(return_value=mock_graph_engine)
        sys.modules["cognee"] = mock_cognee
        sys.modules["cognee.infrastructure"] = MagicMock()
        sys.modules["cognee.infrastructure.databases"] = MagicMock()
        sys.modules["cognee.infrastructure.databases.graph"] = MagicMock()
        sys.modules["cognee.api"] = MagicMock()
        sys.modules["cognee.api.v1"] = MagicMock()
        sys.modules["cognee.api.v1.cognify"] = MagicMock()
        sys.modules["cognee.api.v1.cognify.code_graph_pipeline"] = MagicMock()

from cognee_service import CogneeService, _collect_repo_files, _extract_pdf_to_markdown
from config import settings


class TestPhase1DevDoc(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.created_files: list[Path] = []

    def tearDown(self):
        for f in self.created_files:
            if f.exists():
                try:
                    f.unlink()
                except OSError:
                    pass

    def test_local_folder_scan(self):
        """Test scanning files in local directory."""
        scan_dir = BACKEND_DIR
        files, stats = _collect_repo_files(scan_dir)
        self.assertIsInstance(files, list)
        self.assertGreater(len(files), 0)
        self.assertIn("candidate_files", stats)
        self.assertIn("selected_files", stats)

    async def test_local_folder_empty_path(self):
        """Test error handling when local path is empty or whitespace."""
        with self.assertRaises(ValueError):
            await CogneeService.ingest_code("test_proj", "")

        with self.assertRaises(ValueError):
            await CogneeService.ingest_code("test_proj", "   ")

    async def test_local_folder_invalid_path(self):
        """Test error handling when local path does not exist."""
        non_existent = Path("F:/NonExistentPath/ShouldFail123")
        with self.assertRaises(FileNotFoundError):
            await CogneeService.ingest_code("test_proj", str(non_existent))

    async def test_local_folder_not_a_directory(self):
        """Test error handling when local path is a file, not a directory."""
        file_path = BACKEND_DIR / "requirements.txt"
        with self.assertRaises(NotADirectoryError):
            await CogneeService.ingest_code("test_proj", str(file_path))

    def test_pdf_extraction_single_and_blank(self):
        """Test PDF parsing logic with blank page."""
        try:
            from pypdf import PdfWriter
            writer = PdfWriter()
            writer.add_blank_page(width=72, height=72)
            pdf_path = settings.UPLOAD_DIR / "test_sample.pdf"
            with open(pdf_path, "wb") as f:
                writer.write(f)
            self.created_files.append(pdf_path)

            out_md, num_pages = _extract_pdf_to_markdown(pdf_path)
            self.created_files.append(out_md)
            self.assertTrue(out_md.exists())
            self.assertEqual(num_pages, 1)
            content = out_md.read_text(encoding="utf-8")
            self.assertIn("# Document: test_sample.pdf", content)
            self.assertIn("Total Pages: 1", content)
        except ImportError:
            pass


if __name__ == "__main__":
    unittest.main()

