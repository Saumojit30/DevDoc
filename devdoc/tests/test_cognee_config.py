import asyncio
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Ensure mock cognee and aiofiles exist if not installed
if "aiofiles" not in sys.modules:
    try:
        import aiofiles
    except ImportError:
        sys.modules["aiofiles"] = MagicMock()

if "cognee" not in sys.modules:
    mock_cognee = MagicMock()
    mock_cognee.config = MagicMock()
    mock_cognee.config.set_llm_config = MagicMock()
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

import cognee
from config import settings
from main import init_cognee_config, lifespan, app


class TestCogneeConfigSync(unittest.TestCase):
    def setUp(self):
        cognee.config.set_llm_config.reset_mock()

    def test_init_cognee_config_gemini(self):
        with patch.object(settings, "LLM_PROVIDER", "gemini"), \
             patch.object(settings, "LLM_MODEL", "gemini-2.5-flash"), \
             patch.object(settings, "LLM_API_KEY", "test-gemini-key"), \
             patch.object(settings, "LLM_ENDPOINT", ""):
            payload = init_cognee_config()
            self.assertEqual(payload["llm_provider"], "gemini")
            self.assertEqual(payload["llm_model"], "gemini-2.5-flash")
            self.assertEqual(payload["llm_api_key"], "test-gemini-key")
            self.assertEqual(os.environ.get("LLM_PROVIDER"), "gemini")
            self.assertEqual(os.environ.get("LLM_API_KEY"), "test-gemini-key")
            cognee.config.set_llm_config.assert_called()

    def test_init_cognee_config_groq(self):
        with patch.object(settings, "LLM_PROVIDER", "groq"), \
             patch.object(settings, "LLM_MODEL", "llama-3.1-8b-instant"), \
             patch.object(settings, "LLM_API_KEY", "gsk-test-key"), \
             patch.object(settings, "LLM_ENDPOINT", "https://api.groq.com/openai/v1"):
            payload = init_cognee_config()
            self.assertEqual(payload["llm_provider"], "groq")
            self.assertEqual(payload["llm_model"], "llama-3.1-8b-instant")
            self.assertEqual(payload["llm_endpoint"], "https://api.groq.com/openai/v1")
            self.assertEqual(os.environ.get("GROQ_API_KEY"), "gsk-test-key")
            cognee.config.set_llm_config.assert_called()

    def test_init_cognee_config_ollama(self):
        with patch.object(settings, "LLM_PROVIDER", "ollama"), \
             patch.object(settings, "LLM_MODEL", "qwen2.5-coder:7b"), \
             patch.object(settings, "LLM_API_KEY", ""), \
             patch.object(settings, "LLM_ENDPOINT", "http://localhost:11434/v1"):
            payload = init_cognee_config()
            self.assertEqual(payload["llm_provider"], "ollama")
            self.assertEqual(payload["llm_model"], "qwen2.5-coder:7b")
            self.assertEqual(payload["llm_endpoint"], "http://localhost:11434/v1")
            self.assertNotIn("llm_api_key", payload)
            cognee.config.set_llm_config.assert_called()

    def test_fastapi_lifespan(self):
        async def run_lifespan():
            async with lifespan(app):
                cognee.config.set_llm_config.assert_called()

        asyncio.run(run_lifespan())


if __name__ == "__main__":
    unittest.main()
