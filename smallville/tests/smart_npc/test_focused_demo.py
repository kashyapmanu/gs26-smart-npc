from feed.feed_service import FeedService
from feed.event_service import PlayerEventService
from feed.callback import maybe_mournful_line


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
