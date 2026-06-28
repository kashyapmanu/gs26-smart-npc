import pytest
from feed.feed_service import FeedService
from feed.event_service import PlayerEventService
from feed.callback import maybe_mournful_line
from fastapi.testclient import TestClient
from smart_npc_api import app, _owner_memory

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset_demo_state():
    """Refresh the owner-memory binding and reset demo state before each test."""
    global _owner_memory
    import smart_npc_api

    _owner_memory = smart_npc_api._owner_memory
    client.post("/demo/reset")


def test_feed_service_clear():
    fs = FeedService()
    fs.create_post(author="x", text="hello", ts=0.0)
    fs.clear()
    assert fs.list_posts() == []


def test_event_service_clear():
    fs = FeedService()
    es = PlayerEventService(feed=fs)
    es.handle_action({"type": "rescue_person", "where": "fire_house"}, t=0.0)
    es.clear()
    assert es.list_events() == []


class OrderEvent:
    def to_dict(self):
        return {"verb": "ordered", "object": "food", "where": "restaurant"}


def test_mournful_line_when_aware(monkeypatch):
    monkeypatch.setattr("feed.callback.safe_chat_completion",
                        lambda *a, **k: "My niece... no one helped her.")
    line = maybe_mournful_line(event=OrderEvent())
    assert line is not None
    assert "niece" in line.lower() or "fire" in line.lower()


def test_mournful_line_grounds_in_fact(monkeypatch):
    captured = {}
    def capture(prompt, *a, **k):
        captured["prompt"] = prompt
        return "I'm sorry, I can't today."
    monkeypatch.setattr("feed.callback.safe_chat_completion", capture)
    maybe_mournful_line(event=OrderEvent())
    assert "no one helped" in captured["prompt"].lower()
    assert "fire" in captured["prompt"].lower()


def test_order_food_happy_when_rescue_exists():
    client.post("/player/action", json={"type": "rescue_person", "where": "fire_house", "t": 1.0})
    r = client.post("/player/action", json={"type": "order_food", "where": "restaurant", "t": 2.0})
    assert r.status_code == 200
    posts = client.get("/feed").json()["posts"]
    assert any(p["author"] == "restaurant owner" for p in posts)
    assert any("niece" in p["text"].lower() and "saved" in p["text"].lower() for p in posts) or \
           any("rescued" in p["text"].lower() for p in posts)


def test_order_food_sad_when_no_rescue():
    r = client.post("/player/action", json={"type": "order_food", "where": "restaurant", "t": 1.0})
    assert r.status_code == 200
    posts = client.get("/feed").json()["posts"]
    assert any(p["author"] == "restaurant owner" for p in posts)
    assert any("no one helped" in p["text"].lower() or "niece" in p["text"].lower() for p in posts)


def test_demo_reset_clears_events_and_feed():
    _owner_memory.seq_event.append("dummy")
    _owner_memory.feed_inbox.append("dummy")
    client.post("/player/action", json={"type": "rescue_person", "where": "fire_house", "t": 1.0})
    r = client.post("/demo/reset")
    assert r.status_code == 200
    assert client.get("/events").json()["events"] == []
    assert client.get("/feed").json()["posts"] == []
    assert _owner_memory.seq_event == []
    assert _owner_memory.feed_inbox == []
