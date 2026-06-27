from llm_config import get_llm_client, PRIMARY_MODEL, FALLBACK_MODEL


class _FakeClient:
    def __init__(self, base_url="https://api.meshapi.ai/v1"):
        self.base_url = base_url
        self.chat = object()  # has the .chat attribute checked by the test


def test_get_client_returns_openai_compatible():
    client = get_llm_client()
    assert hasattr(client, "chat") and hasattr(client.chat, "completions")


def test_fallback_swaps_base_url_when_primary_fails(monkeypatch):
    import llm_config
    # Arrange: primary constructor raises, fallback returns a fake client
    monkeypatch.setattr(llm_config, "_primary_obj",
                        lambda: (_ for _ in ()).throw(RuntimeError("primary down")))
    monkeypatch.setattr(llm_config, "_fallback_obj",
                        lambda: _FakeClient(base_url="https://openrouter.ai/api/v1"))
    llm_config.get_llm_client.cache_clear()

    client = get_llm_client()  # NOT use_fallback=True; primary must fail first

    assert client.base_url.startswith("https://openrouter.ai"), client.base_url


def test_explicit_fallback_uses_openrouter(monkeypatch):
    import llm_config
    monkeypatch.setattr(llm_config, "_fallback_obj",
                        lambda: _FakeClient(base_url="https://openrouter.ai/api/v1"))
    llm_config.get_llm_client.cache_clear()

    client = get_llm_client(use_fallback=True)

    assert client.base_url.startswith("https://openrouter.ai"), client.base_url
