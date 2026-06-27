import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
# Ensure both tests/smart_npc and reverie/backend_server are importable
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "reverie" / "backend_server"))


@pytest.fixture(autouse=True)
def _stub_llm_env(monkeypatch):
    """Hermetic stub keys + clean lru_cache for every test in smart_npc."""
    monkeypatch.setenv("MESHAPI_API_KEY", "sk-test-meshapi-stub-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test-openrouter-stub-key")
    # Clear any cached OpenAI client so per-test monkeypatching takes effect
    import sys as _sys
    mod = _sys.modules.get("llm_config")
    if mod is not None and hasattr(mod.get_llm_client, "cache_clear"):
        mod.get_llm_client.cache_clear()
    yield
