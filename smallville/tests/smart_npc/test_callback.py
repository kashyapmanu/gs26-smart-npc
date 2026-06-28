import pytest

from feed.callback import maybe_refuse_payment_line, maybe_mournful_line
from feed.models import WorldEvent


def test_refuse_payment_grounds_in_event(monkeypatch):
    monkeypatch.setattr("feed.callback.safe_chat_completion",
                        lambda *a, **k: "Hero! On the house — you saved my niece!")
    ev = WorldEvent(id="e1", who="player", verb="rescued", object="a girl",
                    where="fire_house", when=1.0, sentiment="heroic")
    line = maybe_refuse_payment_line(event=ev)
    assert line is not None
    assert any(k in line.lower() for k in ("niece", "house", "hero"))


def test_mournful_line_grounds_in_harm_fact(monkeypatch):
    monkeypatch.setattr("feed.callback.safe_chat_completion",
                        lambda *a, **k: "My niece... I can't offer anything today.")
    ev = WorldEvent(id="e2", who="player", verb="ordered", object="food",
                    where="restaurant", when=2.0, sentiment="neutral")
    line = maybe_mournful_line(event=ev)
    assert line is not None
    assert "niece" in line.lower() or "fire" in line.lower()
