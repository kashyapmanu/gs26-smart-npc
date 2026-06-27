import os
from functools import lru_cache
from typing import Optional

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None  # allow tests without SDK installed

MESHAPI_BASE_URL = "https://api.meshapi.ai/v1"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

PRIMARY_MODEL = os.getenv("MESHAPI_MODEL", "gpt-4o-mini")
FALLBACK_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")


def _primary_obj():
    return OpenAI(base_url=MESHAPI_BASE_URL, api_key=os.environ["MESHAPI_API_KEY"])


def _fallback_obj():
    return OpenAI(base_url=OPENROUTER_BASE_URL, api_key=os.environ["OPENROUTER_API_KEY"])


@lru_cache(maxsize=1)
def get_llm_client(use_fallback: bool = False):
    """Return an OpenAI-compatible client. MeshAPI primary, OpenRouter fallback."""
    try:
        if not use_fallback:
            return _primary_obj()
        raise RuntimeError("forced fallback")
    except Exception:
        return _fallback_obj()


def safe_chat_completion(prompt: str, *, model: Optional[str] = None, max_tokens: int = 512) -> str:
    """Send a single-user-message chat completion with automatic provider fallback.

    Returns the assistant text. On total failure returns "" (empty string), so
    callers can degrade gracefully without raising.
    """
    text = ""
    for use_fb in (False, True):
        try:
            client = get_llm_client(use_fallback=use_fb)
            chosen = model or (FALLBACK_MODEL if use_fb else PRIMARY_MODEL)
            completion = client.chat.completions.create(
                model=chosen,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
            )
            return completion.choices[0].message.content or ""
        except Exception as exc:  # noqa: BLE001
            text = f"{exc}"
    return ""