import pytest

from feed.callback import maybe_refuse_payment_line
from feed.models import WorldEvent


class FakeMem:
    def __init__(self, has_observation: bool):
        self.has_observation = has_observation

    def events(self):
        if self.has_observation:
            return [{"event": "player rescued a girl from a fire"}]
        return []


class E:
    def to_dict(self):
        return {"verb": "rescued"}


def test_callback_when_aware(monkeypatch):
    monkeypatch.setattr("feed.callback.safe_chat_completion",
                        lambda *a, **k: "Hero! On the house — you saved my niece!")
    mem = FakeMem(has_observation=True)
    line = maybe_refuse_payment_line(mem, event=E())
    assert line is not None
    assert "niece" in line.lower() or "house" in line.lower() or "hero" in line.lower()


def test_callback_when_unaware_returns_none():
    mem = FakeMem(has_observation=False)
    line = maybe_refuse_payment_line(mem, event=E())
    assert line is None