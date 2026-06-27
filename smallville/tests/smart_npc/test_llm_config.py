import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "reverie" / "backend_server"))

from llm_config import get_llm_client, PRIMARY_MODEL, FALLBACK_MODEL


def test_get_client_returns_openai_compatible():
    client = get_llm_client()
    assert hasattr(client, "chat") and hasattr(client.chat, "completions")


def test_fallback_swaps_base_url_when_primary_fails(monkeypatch):
    import llm_config
    class BoomClient:
        def __setattr__(self, k, v): raise RuntimeError("primary failure")
        chat = object()
    monkeypatch.setattr(llm_config, "_primary_obj", lambda: BoomClient())
    # Should not raise; should fall back to OpenRouter base URL
    client = get_llm_client(use_fallback=True)
    assert "openrouter" in str(client.base_url).lower()