import datetime
import pytest

from feed.feed_inbox import deliver_to_inbox, drain_inbox
from feed.feed_service import FeedService
from feed.models import Post


class FakeMemory:
    """Test double mimicking upstream AssociativeMemory's add_event + feed_inbox."""
    def __init__(self):
        self.added: list = []
        self.feed_inbox: list = []

    def add_event(self, created, expiration, s, p, o,
                  description, keywords, poignancy, embedding_pair, filling):
        self.added.append({
            "created": created, "s": s, "p": p, "o": o,
            "description": description, "keywords": keywords,
            "embedding_pair": embedding_pair,
        })
        return None  # ConceptNode returned by real upstream; tests don't need it


class FakeScratch:
    def __init__(self, t: datetime.datetime):
        self.curr_time = t


class FakePersona:
    def __init__(self, t: datetime.datetime):
        self.a_mem = FakeMemory()
        self.scratch = FakeScratch(t)


def test_deliver_writes_post_into_inbox_and_add_event():
    fs = FeedService()
    p = fs.create_post(author="Isabella", text="fire!", ts=0.0, audience="residential")
    persona = FakePersona(datetime.datetime(2026, 6, 27, 12, 0, 0))

    deliver_to_inbox(persona, post=p)

    # 1) The post was written into the memory stream as an event node
    assert len(persona.a_mem.added) == 1
    entry = persona.a_mem.added[0]
    assert entry["s"] == "Isabella"
    assert entry["p"] == "posted"
    assert "social feed" in entry["o"]
    assert "fire!" in entry["description"]
    assert entry["keywords"] == ["isabella", "social_post", "residential"]
    assert entry["created"] == persona.scratch.curr_time
    # embedding_pair[1] is a placeholder zero vector
    assert isinstance(entry["embedding_pair"][1], list) and len(entry["embedding_pair"][1]) == 768

    # 2) The post id was tracked in the feed_inbox for idempotency
    assert persona.a_mem.feed_inbox == [p.id]


def test_drain_inbox_returns_and_clears():
    fs = FeedService()
    p1 = fs.create_post(author="A", text="x", ts=0.0, audience="residential")
    p2 = fs.create_post(author="B", text="y", ts=1.0, audience="residential")
    persona = FakePersona(datetime.datetime(2026, 6, 27, 12, 0, 0))

    deliver_to_inbox(persona, post=p1)
    deliver_to_inbox(persona, post=p2)

    drained = drain_inbox(persona.a_mem)
    assert drained == [p1.id, p2.id]
    assert persona.a_mem.feed_inbox == []


def test_deliver_is_idempotent_per_post_id():
    fs = FeedService()
    p = fs.create_post(author="A", text="x", ts=0.0, audience="residential")
    persona = FakePersona(datetime.datetime(2026, 6, 27, 12, 0, 0))

    deliver_to_inbox(persona, post=p)
    deliver_to_inbox(persona, post=p)  # same post again

    # Only one add_event call; feed_inbox tracks the id only once
    assert len(persona.a_mem.added) == 1
    assert persona.a_mem.feed_inbox == [p.id]