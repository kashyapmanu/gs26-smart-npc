import pytest

from feed.callback import maybe_refuse_payment_line
from feed.models import WorldEvent


class _FakeNode:
    def __init__(self, description: str):
        self.description = description


class FakeMem:
    def __init__(self, descriptions):
        self.seq_event = [_FakeNode(d) for d in descriptions]


class E:
    def to_dict(self):
        return {"verb": "rescued"}


def test_callback_when_aware(monkeypatch):
    monkeypatch.setattr("feed.callback.safe_chat_completion",
                        lambda *a, **k: "Hero! On the house — you saved my niece!")
    mem = FakeMem(["player rescued a girl from a fire"])
    line = maybe_refuse_payment_line(mem, event=E())
    assert line is not None
    assert any(k in line.lower() for k in ("niece", "house", "hero"))


def test_callback_when_unaware_returns_none():
    mem = FakeMem([])  # no observations of the rescue
    line = maybe_refuse_payment_line(mem, event=E())
    assert line is None